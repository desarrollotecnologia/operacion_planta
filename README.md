# Cierre de Operaciones

Aplicación web de **cierre diario de beneficio** y **novedades de personal** para planta Colbeef. React + Vite en el frontend, Node/Express + MySQL en el backend. Alcance **2026+**.

## Módulos

1. Simulación
2. Cierre de proceso
3. Base de datos cierre
4. Asistencia diaria
5. Consolidado
6. Novedades
7. Operarios

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

# 2. Importar el historico desde los Excel de data/import
npm run import:novedades -- --dry-run   # revisa sin escribir
npm run import:datos                    # novedades + cierres

# 3. Compilar y levantar
npm run deploy
```

### Importación de novedades

El Excel identifica a cada operario por un número de item que es su posición en
una lista alfabética. Cuando alguien entra o sale, todos los de abajo se corren:
el item 9 corresponde a tres personas distintas a lo largo de 2026. Por eso el
importador usa el **nombre normalizado** como identidad y trata el item solo
como orden de presentación.

Quien no aparece en la hoja del último mes queda marcado como inactivo, así que
el conteo de activos refleja la nómina vigente.

Ejecuta siempre `--dry-run` primero: reporta cuántas personas y marcas se
cargarían, qué textos del Excel no reconoce (se descartarían en silencio) y qué
filas quedan fuera del bloque de la nómina.

Bajo la tabla quedan filas sueltas que son residuos de la hoja, entre ellas
"CABALLERO ELIAS". Se excluyen a propósito: no corresponden a personal vigente.

### Importación de cierres

`npm run import:cierre` lee `data/import/cierre-diario-beneficio.xlsx` y llena
`cierre_diario`, `simulacion_dia`, `cierre_proceso_detalle`, `personal_dia` y
`novedad_resumen_dia`. La clave es la fecha, así que volver a ejecutarlo
actualiza los días existentes en lugar de duplicarlos.

Excel guarda las horas sueltas sobre su época interna (1899-12-30) y las que
pasan de medianoche caen en el día siguiente de esa época. Los turnos que
terminan de madrugada dependen de ese detalle: son 18 días en 2026.

Comprueba la carga contra el archivo de origen con `npm run verify:cierre`, que
compara día por día e informa faltantes, sobrantes y diferencias de valores.

Los días sin producción (domingos y Semana Santa, con beneficio en cero) no se
cargan a propósito.

### Migraciones

El usuario `cierre_app` solo puede leer y escribir datos, así que los cambios de
estructura van con la cuenta de root:

```powershell
.\database\mysql\aplicar_migracion.ps1 003_duracion_cruce_medianoche.sql
```

### Arranque automático

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
| GET | `/api/cierres/ultimo` | Fecha del cierre más reciente |
| GET | `/api/cierres/:fecha/simulacion` | Datos de la simulación del día |
| GET | `/api/cierres/:fecha/cierre-proceso` | Indicadores del cierre de proceso |
| GET | `/api/cierres/:fecha/novedades` | Resumen de novedades del día |
| GET | `/api/operarios` | Lista, filtrable por `area` y `activo` |
| POST | `/api/operarios` | Crear |
| PUT | `/api/operarios/:id` | Actualizar |
| DELETE | `/api/operarios/:id` | Baja lógica |
| GET | `/api/asistencia` | Filtrable por `fecha`, `desde`, `hasta`, `area` |
| PUT | `/api/asistencia` | Guarda el estado de un operario en una fecha |
| PUT | `/api/asistencia/bulk` | Guarda la matriz de un día en una transacción |
| GET | `/api/asistencia/resumen` | Vista `vw_resumen_novedades_dia` |

## Estado de los módulos

Los siete módulos leen y escriben en MySQL. El histórico cargado va del **13 de marzo al 27
de agosto de 2026** (142 días con producción).

La hoja `CONSOLIDADO DE CIERRE` tiene registros desde 2024, pero solo se cargan
los días que existen en `BASE DE DATOS CIERRE`, que arranca el 13 de marzo de
2026.
