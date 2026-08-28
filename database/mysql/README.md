# Base de datos MySQL — Cierre de Operaciones (servidor 205)

## Requisitos

- MySQL **8.0+** (usa `UUID()` y columnas generadas)
- Acceso root o usuario con permisos `CREATE DATABASE`

## 1. Instalar MySQL en el servidor 205

El servidor **205** es la máquina Windows `192.168.20.205`, que ya tiene el
servicio `MySQL80` en ejecución. No hace falta instalar nada ni copiar archivos
por red: los scripts se ejecutan localmente.

Para una instalación desde cero en Linux:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y mysql-server

sudo systemctl enable mysql
sudo systemctl start mysql
sudo mysql_secure_installation
```

## 2. Crear base, tablas y vistas

### Windows (servidor 205) — recomendado

Desde PowerShell, en `database/mysql/`:

```powershell
.\deploy_205.ps1
```

Pide la contraseña de `root` y define la del usuario `cierre_app`, crea el
esquema, aplica los permisos y verifica el resultado. Es idempotente y ninguna
contraseña queda escrita en disco ni en el historial de git.

Para exponer el usuario a otros equipos de la red interna:

```powershell
.\deploy_205.ps1 -AppHosts @('localhost','192.168.20.%')
```

### Linux / ejecución manual

```bash
mysql -u root -p < 001_crear_base_mysql.sql
mysql -u root -p < 002_usuario_app_mysql.sql
```

O desde dentro de MySQL:

```sql
SOURCE /ruta/001_crear_base_mysql.sql;
SOURCE /ruta/002_usuario_app_mysql.sql;
```

## 3. Permitir conexión remota (desde tu PC)

> No aplica mientras la API y MySQL corran en el mismo equipo (205). Solo es
> necesario cuando el backend se despliegue en otra máquina.

Edita `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
bind-address = 0.0.0.0
```

Reinicia:

```bash
sudo systemctl restart mysql
```

Abre puerto **3306** solo en red interna.

El usuario `cierre_app@'%'` ya queda creado en `002_usuario_app_mysql.sql`.  
Si solo quieres una IP específica:

```sql
CREATE USER 'cierre_app'@'192.168.1.50' IDENTIFIED BY 'TU_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON cierre_operaciones.* TO 'cierre_app'@'192.168.1.50';
FLUSH PRIVILEGES;
```

## 4. Probar conexión

Desde el servidor:

```bash
mysql -u cierre_app -p cierre_operaciones -e "SHOW TABLES;"
```

Desde tu PC:

```bash
mysql -h IP_SERVIDOR_205 -u cierre_app -p cierre_operaciones -e "SELECT codigo, nombre FROM cat_area;"
```

## 5. Tablas creadas

| Módulo | Tablas |
|--------|--------|
| Cierre | `cierre_diario`, `simulacion_dia`, `cierre_proceso_detalle`, `operatividad_dia`, `novedad_resumen_dia`, `personal_dia` |
| Personal | `operario`, `asistencia_operario`, `planilla_mes`, `novedad_historico` |
| Catálogos | `cat_area`, `cat_estado_novedad`, `cat_puesto` |
| Vistas | `vw_consolidado_cierre`, `vw_resumen_novedades_dia`, `vw_asistencia_mes` |

## 6. Ejemplos de uso

### Insertar cierre del día

```sql
USE cierre_operaciones;

INSERT INTO cierre_diario (
  fecha, total_beneficio, hora_inicio, hora_fin,
  tiempo_paradas_min, parada_programada_min,
  velocidad_linea, horas_laboradas, tardanza_inicio_min,
  productividad, velocidad_neta, velocidad_bruta,
  tolerancia_cero, pieles, observacion
) VALUES (
  '2026-08-19', 306, '14:00:00', '20:18:00',
  61, 30,
  75.00, 6.30, 0,
  72.40, 75.00, 68.20,
  0.009600, 0.9800, 'Cierre estable'
);
```

### Crear operario

```sql
INSERT INTO operario (area_id, item_orden, puesto_texto, nombre_completo, nombre_corto, activo)
VALUES (
  (SELECT id FROM cat_area WHERE codigo = 'LINEA'),
  1, 'AFANADOR', 'PINEDA NELSON', 'AFANADOR NELSON', 1
);
```

### Registrar asistencia

```sql
INSERT INTO asistencia_operario (operario_id, fecha, estado_id)
VALUES (
  (SELECT id FROM operario WHERE item_orden = 1 LIMIT 1),
  '2026-08-19',
  (SELECT id FROM cat_estado_novedad WHERE codigo = 'LABORANDO')
)
ON DUPLICATE KEY UPDATE estado_id = VALUES(estado_id);
```

### Ver resumen del día (reemplaza Excel RESUMEN)

```sql
SELECT * FROM vw_resumen_novedades_dia
WHERE fecha = '2026-08-19';
```

## 7. Conectar la API (Node.js ejemplo)

```env
DATABASE_URL=mysql://cierre_app:TU_PASSWORD@IP_SERVIDOR_205:3306/cierre_operaciones
```

Paquete recomendado: `mysql2` o Prisma con provider `mysql`.

## 8. Nota sobre columna `real`

En MySQL `REAL` es palabra reservada. En `operatividad_dia` la columna se llama **`real_val`** (equivalente a `real` del Excel).

En la API mapear:
- `real_val` ↔ `real` en el frontend

## 9. Importar Excel de novedades

1. Operarios: hoja `AGOSTO 2026`, filas 30+ → tabla `operario`
2. Asistencia: columnas con fechas (fila 29) → tabla `asistencia_operario`
3. Cierre: export Sheets → tabla `cierre_diario`

Validar:

```sql
SELECT COUNT(*) FROM operario WHERE activo = 1;
SELECT fecha, estado_codigo, cantidad FROM vw_resumen_novedades_dia WHERE fecha >= '2026-01-01';
```
