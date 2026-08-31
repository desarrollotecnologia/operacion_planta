<#
.SYNOPSIS
  Detiene el servidor Node del tablero y lo vuelve a levantar.

.DESCRIPTION
  Si existe la tarea programada (register-task.ps1), la reinicia.
  Si no, libera el puerto 5174 y arranca node server/index.mjs en segundo plano.
#>
[CmdletBinding()]
param(
    [int]    $Port     = 5174,
    [string] $TaskName = 'Cierre de Operaciones - Tablero'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$serverScript = Join-Path $projectRoot 'server\index.mjs'
$logDir = Join-Path $projectRoot 'logs'
$logFile = Join-Path $logDir 'tablero.log'

if (-not (Test-Path $serverScript)) {
    throw "No se encontro $serverScript"
}

if (-not (Test-Path (Join-Path $projectRoot 'dist'))) {
    throw "No existe dist/. Ejecuta 'npm run build' antes de desplegar."
}

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$scheduled = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($scheduled) {
    Write-Host "  Tarea programada detectada: $TaskName"
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "  Tarea reiniciada."
    return
}

$nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
$nodeExe = if ($nodeCmd) { $nodeCmd.Source } else { 'C:\Program Files\nodejs\node.exe' }
if (-not (Test-Path $nodeExe)) { throw "No se encontro node.exe." }

$listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $owner = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    if ($owner -and $owner.ProcessName -eq 'node') {
        Write-Host "  Deteniendo node en puerto $Port (PID $($owner.Id))..."
        Stop-Process -Id $owner.Id -Force
        Start-Sleep -Seconds 2
    }
    else {
        throw "El puerto $Port lo usa otro proceso (PID $($listener.OwningProcess))."
    }
}

$cmdLine = "set PORT=$Port&& `"$nodeExe`" `"$serverScript`" >> `"$logFile`" 2>&1"
Start-Process -FilePath 'cmd.exe' -ArgumentList "/c `"$cmdLine`"" -WorkingDirectory $projectRoot -WindowStyle Minimized
Write-Host "  Servidor iniciado en segundo plano (puerto $Port)."
