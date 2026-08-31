@echo off
setlocal EnableExtensions
cd /d "%~dp0"

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

echo [1/5] Descargando ultimos cambios ^(git pull^)...
git pull
if errorlevel 1 (
  echo ERROR: git pull fallo. Revise conflictos o conexion con el remoto.
  goto :fail
)

echo.
echo [2/5] Instalando dependencias ^(npm install^)...
call npm install
if errorlevel 1 goto :fail

echo.
echo [3/5] Compilando frontend ^(npm run build^)...
call npm run build
if errorlevel 1 goto :fail

if not exist "logs" mkdir "logs"

echo.
echo [4/5] Reiniciando servidor en puerto %PORT%...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server\reiniciar-servidor.ps1" -Port %PORT% -TaskName "%TASK_NAME%"
if errorlevel 1 goto :fail

echo.
echo [5/5] Verificando API...
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
