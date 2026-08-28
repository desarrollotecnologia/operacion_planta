<#
.SYNOPSIS
  Registra el tablero como tarea programada que arranca con el servidor.

.DESCRIPTION
  Crea una tarea que corre como SYSTEM al iniciar Windows, de modo que el
  tablero queda disponible sin necesidad de que nadie inicie sesion.
  Requiere PowerShell como Administrador.

  La salida se acumula en logs\tablero.log.

.EXAMPLE
  .\register-task.ps1

.EXAMPLE
  .\register-task.ps1 -Port 8090

.EXAMPLE
  .\register-task.ps1 -Remove
#>
[CmdletBinding()]
param(
    [int]    $Port     = 5174,
    [string] $TaskName = 'Cierre de Operaciones - Tablero',
    [switch] $Remove
)

$ErrorActionPreference = 'Stop'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal($identity)).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    throw "Se requiere PowerShell como Administrador. Abre 'Windows PowerShell' con boton derecho > Ejecutar como administrador y vuelve a intentarlo."
}

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

if ($Remove) {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Stop-ScheduledTask   -TaskName $TaskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Tarea '$TaskName' eliminada." -ForegroundColor Green
    }
    else {
        Write-Host "La tarea '$TaskName' no existe." -ForegroundColor Yellow
    }
    return
}

$nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
$nodeExe = if ($nodeCmd) { $nodeCmd.Source } else { 'C:\Program Files\nodejs\node.exe' }
if (-not (Test-Path $nodeExe)) { throw "No se encontro node.exe. Instala Node.js o agregalo al PATH." }

$serverScript = Join-Path $projectRoot 'server\index.mjs'
if (-not (Test-Path $serverScript)) { throw "No se encontro $serverScript" }

$distDir = Join-Path $projectRoot 'dist'
if (-not (Test-Path $distDir)) { throw "No existe $distDir. Ejecuta 'npm run build' antes de registrar la tarea." }

$logDir = Join-Path $projectRoot 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logFile = Join-Path $logDir 'tablero.log'

Write-Host "Proyecto : $projectRoot"
Write-Host "Node     : $nodeExe"
Write-Host "Puerto   : $Port"
Write-Host "Log      : $logFile"
Write-Host ''

# Libera el puerto si quedo un servidor de una ejecucion anterior.
$listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $owner = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    if ($owner -and $owner.ProcessName -eq 'node') {
        Write-Host "Deteniendo servidor previo en el puerto $Port (PID $($owner.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $owner.Id -Force
        Start-Sleep -Seconds 2
    }
    else {
        throw "El puerto $Port lo usa '$($owner.ProcessName)' (PID $($listener.OwningProcess)), que no es node. Usa otro puerto con -Port."
    }
}

# cmd.exe envuelve la ejecucion para poder redirigir la salida al log.
$argument = '/c "set PORT={0}&& "{1}" "{2}" >> "{3}" 2>&1"' -f $Port, $nodeExe, $serverScript, $logFile

$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $argument -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName `
    -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
    -Description 'Sirve el tablero de Cierre de Operaciones en la red interna.' `
    -Force | Out-Null

Write-Host "Tarea '$TaskName' registrada." -ForegroundColor Green

Start-ScheduledTask -TaskName $TaskName
Write-Host 'Iniciando...'

$ok = $false
foreach ($i in 1..15) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    }
    catch { }
}

Write-Host ''
if ($ok) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
        Select-Object -First 1).IPAddress

    Write-Host 'Tablero en linea.' -ForegroundColor Green
    Write-Host "  Local : http://localhost:$Port"
    Write-Host "  Red   : http://${ip}:$Port"
    Write-Host ''
    Write-Host 'Arrancara solo cada vez que se encienda el servidor.'
}
else {
    Write-Host "La tarea quedo registrada pero no respondio en el puerto $Port." -ForegroundColor Red
    Write-Host "Revisa el log: $logFile"
    if (Test-Path $logFile) { Get-Content $logFile -Tail 20 }
}

Write-Host ''
Write-Host 'Comandos utiles:'
Write-Host "  Get-ScheduledTask  -TaskName '$TaskName'"
Write-Host "  Stop-ScheduledTask -TaskName '$TaskName'"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "  .\register-task.ps1 -Remove"
