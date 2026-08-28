# Base de datos — Cierre de Operaciones (servidor 205)

Guía para crear la base en el servidor **205** y alimentarla desde la app React.

> **MySQL:** ver carpeta [`mysql/`](mysql/README.md) con scripts listos para MySQL 8.0+  
> **PostgreSQL:** scripts `001_schema.sql`, `003_operarios_asistencia.sql`, `002_usuario_app.sql`

## Arquitectura

```
React (tu PC)  →  API REST (servidor 205)  →  PostgreSQL (servidor 205)
```

La tabla **maestra** es `cierre_diario` (equivale a **BASE DE DATOS CIERRE** en Sheets).  
Las demás vistas del tablero leen de ahí y de tablas relacionadas.

## 1. En el servidor 205 — instalar PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql postgresql-contrib

sudo systemctl enable postgresql
sudo systemctl start postgresql
```

## 2. Crear base y usuario

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE cierre_operaciones
  ENCODING 'UTF8'
  LC_COLLATE 'es_CO.UTF-8'
  LC_CTYPE 'es_CO.UTF-8'
  TEMPLATE template0;

\q
```

Copia los scripts al servidor y ejecútalos:

```bash
psql -U postgres -d cierre_operaciones -f 001_schema.sql
psql -U postgres -d cierre_operaciones -f 003_operarios_asistencia.sql
# Edita la contraseña en 002_usuario_app.sql antes de ejecutar:
psql -U postgres -d cierre_operaciones -f 002_usuario_app.sql
```

## 3. Permitir conexión desde tu PC

Edita `postgresql.conf`:

```conf
listen_addresses = '*'
```

Edita `pg_hba.conf` (ajusta la red de tu oficina):

```conf
# Red interna ejemplo — cambia por tu subred real
host  cierre_operaciones  cierre_app  192.168.1.0/24  scram-sha-256
```

Reinicia PostgreSQL:

```bash
sudo systemctl restart postgresql
```

Abre el puerto **5432** solo para la red interna (firewall).

## 4. API en el servidor 205

La app React **no debe** conectarse directo a PostgreSQL. Necesitas una API.

Opciones recomendadas:
- **Node.js + Express + pg** (rápido, encaja con el frontend actual)
- **Python + FastAPI + asyncpg**

### Endpoints mínimos (contrato con el frontend)

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/health` | Verificar conexión |
| GET | `/api/cierres?anio=2026&mes=AGOSTO` | Listar base de datos cierre |
| GET | `/api/cierres/:fecha` | Un día completo (cierre + simulación + novedades) |
| POST | `/api/cierres` | Crear día |
| PUT | `/api/cierres/:fecha` | Actualizar día (upsert) |
| GET | `/api/resumen-dia?fecha=2026-08-19` | KPIs + gráficas |
| GET | `/api/consolidado?anio=2026` | Vista consolidado |
| GET | `/api/novedades?fecha=2026-08-19&area=LINEA` | Operatividad y resumen |
| GET | `/api/operarios?area=LINEA` | Listar operarios |
| POST | `/api/operarios` | Crear operario |
| PUT | `/api/operarios/:id` | Actualizar operario |
| GET | `/api/asistencia?fecha=2026-08-19&area=LINEA` | Matriz del día |
| PUT | `/api/asistencia` | Guardar estado de un operario en una fecha |
| GET | `/api/asistencia/resumen?fecha=2026-08-19` | Vista `vw_resumen_novedades_dia` |

### Variables de entorno API (servidor 205)

```env
PORT=3001
DATABASE_URL=postgresql://cierre_app:TU_PASSWORD@localhost:5432/cierre_operaciones
CORS_ORIGIN=http://localhost:5174,http://IP_DE_TU_PC:5174
```

## 5. En tu PC — conectar el frontend

Crea `.env` en la raíz del proyecto React:

```env
VITE_API_URL=http://IP_SERVIDOR_205:3001/api
```

Ejemplo de llamada desde el formulario **Base de datos cierre**:

```ts
const API = import.meta.env.VITE_API_URL;

export async function guardarCierre(payload: NuevoRegistroInput) {
  const res = await fetch(`${API}/cierres`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("No se pudo guardar");
  return res.json();
}
```

Reemplaza el `useCierreStore` local por llamadas a esta API cuando el backend esté listo.

## 6. Mapeo Sheets → tablas

| Hoja / dato | Tabla |
|-------------|-------|
| BASE DE DATOS CIERRE | `cierre_diario` |
| SIMULACION | `simulacion_dia` |
| CIERRE DE PROCESO (observaciones, OEE) | `cierre_proceso_detalle` |
| RESUMEN Novedades H3:M12 | `operatividad_dia` |
| RESUMEN Novedades C26:F34 | `novedad_resumen_dia` |
| CONSOLIDADO col M personal | `personal_dia` |
| CONSOLIDADO histórico | `vw_consolidado_cierre` (vista) |
| Hoja mensual filas 30+ (operarios) | `operario` |
| Celdas día × operario (E–AJ) | `asistencia_operario` |
| Hoja RESUMEN (conteos) | `vw_resumen_novedades_dia` (vista) |
| Catálogo estados hoja BD | `cat_estado_novedad` |
| PRESUPUESTADO / CONTRATADO | `planilla_mes` |
| BASE DE DATOS NOVEDADES histórico | `novedad_historico` |

## 7. Carga inicial desde Excel NOVEDADES DE PERSONAL

Archivo: `NOVEDADES DE PERSONAL AREA LINEA.xlsx`

### Paso A — Operarios (hoja AGOSTO 2026, filas 30+)

Por cada fila:
- Col B → `item_orden`
- Col C → `nombre_completo` / `puesto_texto`
- Col D → `nombre_corto` (opcional)
- `area_id` = LINEA

```sql
INSERT INTO operario (area_id, item_orden, puesto_texto, nombre_completo, activo)
VALUES (
  (SELECT id FROM cat_area WHERE codigo = 'LINEA'),
  1,
  'AFANADOR',
  'PINEDA NELSON',
  TRUE
);
```

### Paso B — Asistencia diaria (columnas E en adelante, fila 29 = fechas)

Por cada operario y cada día del mes:

```sql
INSERT INTO asistencia_operario (operario_id, fecha, estado_id)
VALUES (
  (SELECT id FROM operario WHERE item_orden = 1 AND area_id = (SELECT id FROM cat_area WHERE codigo = 'LINEA')),
  '2026-08-19',
  (SELECT id FROM cat_estado_novedad WHERE codigo = 'LABORANDO')
)
ON CONFLICT (operario_id, fecha) DO UPDATE SET estado_id = EXCLUDED.estado_id;
```

Mapeo texto Excel → código BD:

| Excel | `cat_estado_novedad.codigo` |
|-------|------------------------------|
| LABORANDO | LABORANDO |
| VACACIONES | VACACIONES |
| INCAPACIDAD | INCAPACIDAD |
| DOMINGO Y FESTIVO | DOMINGO_FESTIVO |
| REUBICADO | REUBICADO |
| PDTE POR CONTRATAR | PDTE_CONTRATAR |

### Paso C — Validar resumen (reemplaza fórmulas COUNTIF)

```sql
SELECT * FROM vw_resumen_novedades_dia
WHERE fecha = '2026-08-19'
ORDER BY cantidad DESC;
```

### Paso D — Planilla mensual (filas 3–4)

```sql
INSERT INTO planilla_mes (area_id, anio, mes, presupuestado, contratado)
VALUES (
  (SELECT id FROM cat_area WHERE codigo = 'LINEA'),
  2026, 8, 59, 59
)
ON CONFLICT (area_id, anio, mes) DO UPDATE
SET presupuestado = EXCLUDED.presupuestado,
    contratado = EXCLUDED.contratado;
```

## 8. Carga inicial cierre (2026+)

1. Exporta **BASE DE DATOS CIERRE** filtrando `anio >= 2026`.
2. Importa a `cierre_diario` con un script CSV o `COPY`.
3. Importa operatividad y novedades por fecha desde los books de Novedades.
4. Valida con:

```sql
SELECT fecha, total_beneficio, hora_inicio, hora_fin
FROM cierre_diario
WHERE anio >= 2026
ORDER BY fecha DESC;
```

## 9. Orden de implementación sugerido

1. Crear BD en 205 (`001`, `003`, `002`)
2. Importar operarios y asistencia desde Excel (2026+)
3. Levantar API con `GET/POST /api/cierres` y `/api/operarios`
4. Conectar **Operarios** y **Asistencia diaria** en la app
5. Conectar **Base de datos cierre**
6. Conectar **Resumen del día** y **Consolidado**

## 10. Checklist de verificación

- [ ] `psql` conecta desde servidor 205
- [ ] `psql` conecta desde tu PC (red interna)
- [ ] API responde `GET /api/health`
- [ ] Guardar un día desde la app y verlo en `cierre_diario`
- [ ] Resumen del día muestra el registro guardado
- [ ] Consolidado lista filas de `vw_consolidado_cierre`
- [ ] Operarios importados desde Excel (~60 en línea)
- [ ] Asistencia del día guarda en `asistencia_operario`
- [ ] `vw_resumen_novedades_dia` coincide con hoja RESUMEN
