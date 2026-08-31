@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem El tablero corre como tarea programada bajo SYSTEM, asi que reiniciarlo exige
rem privilegios. Se piden aqui, al inicio, para no interrumpir a mitad del
rem despliegue con un aviso que caduca a los dos minutos.
net session >nul 2>&1
if errorlevel 1 (
  echo Solicitando permisos de administrador...
  echo Acepte el aviso de Control de cuentas de usuario.
  powershell -NoProfile -Command "try { Start-Process -FilePath '%~f0' -Verb RunAs -ErrorAction Stop } catch { exit 1 }"
  if errorlevel 1 (
    echo.
    echo ERROR: no se concedieron los permisos. El despliegue no se ejecuto.
    pause
  )
  exit /b
)

set "PORT=5174"
set "TASK_NAME=Cierre de Operaciones - Tablero"

echo.
echo ============================================================
echo   Actualizar y desplegar - Cierre de Operaciones
echo   Carpeta: %CD%
echo ============================================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: git no esta en el PATH.
  goto :fail
)

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: node no esta en el PATH.
  goto :fail
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm no esta en el PATH.
  goto :fail
)

rem --autostash aparta los cambios locales antes de traer y los repone despues.
rem npm install reescribe package-lock.json, y sin esto el pull se negaria a correr.
echo [1/6] Descargando ultimos cambios ^(git pull^)...
git pull --autostash
if errorlevel 1 (
  echo ERROR: git pull fallo. Revise conflictos o conexion con el remoto.
  goto :fail
)

rem Va antes de la revision porque esta necesita el conector de MySQL, que en un
rem clon nuevo aun no estaria instalado. Instalar no afecta al servidor en marcha.
echo.
echo [2/6] Instalando dependencias ^(npm install^)...
call npm install
if errorlevel 1 goto :fail

rem La revision va ANTES de compilar y reiniciar: si el codigo nuevo espera
rem columnas que la base aun no tiene, desplegarlo deja el tablero con error 500.
rem Por eso aqui se detiene en vez de avisar al final, cuando ya seria tarde.
echo.
echo [3/6] Revisando migraciones de base de datos...
rem 0 = al dia, 1 = faltan migraciones, 2 = no se pudo comprobar.
rem Se evalua el codigo mayor primero: "errorlevel N" significa "N o mas".
node "%~dp0server\check-migraciones.mjs"
if errorlevel 2 (
  echo.
  echo AVISO: no se pudo revisar el estado de la base de datos.
  echo El despliegue continua, pero verifique las migraciones a mano.
  echo.
) else if errorlevel 1 (
  echo.
  echo ============================================================
  echo   DESPLIEGUE DETENIDO: faltan migraciones de base de datos.
  echo   Aplique las indicadas arriba y vuelva a ejecutar este .bat.
  echo   No se toco el servidor: el tablero sigue funcionando.
  echo ============================================================
  goto :fail
)

echo.
echo [4/6] Compilando frontend ^(npm run build^)...
call npm run build
if errorlevel 1 goto :fail

if not exist "logs" mkdir "logs"

echo.
echo [5/6] Reiniciando servidor en puerto %PORT%...
if not exist "%~dp0server\reiniciar-servidor.ps1" (
  echo ERROR: falta server\reiniciar-servidor.ps1
  goto :fail
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server\reiniciar-servidor.ps1" -Port %PORT% -TaskName "%TASK_NAME%"
if errorlevel 1 (
  echo ERROR: no se pudo reiniciar el servidor.
  goto :fail
)

echo.
echo [6/6] Verificando API...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ok=$false; for($i=1;$i -le 15;$i++){ Start-Sleep 1; try { $r=Invoke-WebRequest 'http://localhost:%PORT%/api/health' -UseBasicParsing -TimeoutSec 3; if($r.StatusCode -eq 200){ $ok=$true; break } } catch {} }; if($ok){ Write-Host '  [OK] /api/health responde.' -ForegroundColor Green; try { $j=$r.Content | ConvertFrom-Json; Write-Host ('  Base: ' + $j.db + '  MySQL: ' + $j.mysql) } catch {} } else { Write-Host '  [AVISO] El servidor no respondio a tiempo. Revise logs\tablero.log' -ForegroundColor Yellow; exit 1 }"
if errorlevel 1 (
  echo.
  echo El despliegue termino pero la verificacion fallo.
  goto :fail
)

echo.
echo ============================================================
echo   Despliegue completado.
echo   Local: http://localhost:%PORT%
echo   Log  : %CD%\logs\tablero.log
echo ============================================================
echo.
pause
exit /b 0

:fail
echo.
echo Despliegue interrumpido.
pause
exit /b 1
