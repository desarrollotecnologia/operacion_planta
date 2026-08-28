# Cierre de Operaciones

Prototipo visual (React + Vite) del tablero de **cierre diario de beneficio** y **novedades de personal**, con alcance **2026+**.

## Módulos

**Visualizar**
- Inicio
- Simulación
- Cierre de proceso
- Consolidado
- Novedades

**Capturar**
- Base de datos cierre (formulario que alimentará el resto)

## Arquitectura

Un solo proceso Node sirve el frontend compilado y la API. Al compartir origen
no hace falta CORS ni fijar la IP del servidor en el build.

```
Navegador  →  Node (dist/ + /api)  →  MySQL
                  puerto 5174         cierre_operaciones
```

## Puesta en marcha

```powershell
npm install

# 1. Crear la base y generar el .env (pide las contrasenas)
.\database\mysql\deploy_205.ps1

# 2. Carga inicial opcional con los datos del prototipo
npm run seed

# 3. Compilar y levantar
npm run deploy
```

Para que arranque solo con el servidor, en PowerShell como Administrador:

```powershell
.\server\register-task.ps1
```

## Desarrollo

```bash
npm run dev     # Vite en :5174 con recarga en caliente
npm start       # sirve dist/ + API
npm run lint
```

## API

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/health` | Estado de la conexión a MySQL |
| GET | `/api/catalogos` | Áreas y estados de novedad |
| GET | `/api/cierres` | Lista, filtrable por `anio`, `mes`, `desde`, `hasta` |
| GET | `/api/cierres/:fecha` | Un día |
| POST | `/api/cierres` | Upsert por fecha |
| DELETE | `/api/cierres/:fecha` | Elimina un día |
| GET | `/api/cierres/consolidado` | Vista `vw_consolidado_cierre` |
| GET | `/api/operarios` | Lista, filtrable por `area` y `activo` |
| POST | `/api/operarios` | Crear |
| PUT | `/api/operarios/:id` | Actualizar |
| DELETE | `/api/operarios/:id` | Baja lógica |
| GET | `/api/asistencia` | Filtrable por `fecha`, `desde`, `hasta`, `area` |
| PUT | `/api/asistencia` | Guarda el estado de un operario en una fecha |
| PUT | `/api/asistencia/bulk` | Guarda la matriz de un día en una transacción |
| GET | `/api/asistencia/resumen` | Vista `vw_resumen_novedades_dia` |

## Estado de los módulos

Conectados a MySQL: **Base de datos cierre**, **Operarios** y **Asistencia**.

Todavía con datos de prueba de `src/data/mock`: Inicio, Simulación,
Cierre de proceso, Consolidado y Novedades.
