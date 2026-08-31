<#
.SYNOPSIS
  Detiene el servidor Node del tablero y lo vuelve a levantar.

.DESCRIPTION
  El tablero corre como tarea programada bajo la cuenta SYSTEM, de modo que
  reiniciarlo exige privilegios de administrador. Sin ellos ocurren dos cosas
  que confunden el diagnostico:

    - Get-ScheduledTask no encuentra la tarea aunque exista (el acceso denegado
      queda silenciado), asi que el script creeria que debe arrancar el proceso
      a mano.
    - Stop-Process contra el node de SYSTEM falla con "Acceso denegado".

  Por eso el script se releva a si mismo con UAC. La parte elevada escribe su
  salida en un archivo temporal que la instancia original vuelca en pantalla,
  para que el resultado se vea en la consola desde donde se invoco.

.EXAMPLE
  .\reiniciar-servidor.ps1

.EXAMPLE
  .\reiniciar-servidor.ps1 -Port 8090
#>
[CmdletBinding()]
param(
    [int]    $Port     = 5174,
    [string] $TaskName = 'Cierre de Operaciones - Tablero',
    # Uso interno: la instancia elevada escribe aqui para que la original lo muestre.
    [string] $LogFile  = ''
)

$ErrorActionPreference = 'Stop'

$projectRoot  = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$serverScript = Join-Path $projectRoot 'server\index.mjs'
$logDir       = Join-Path $projectRoot 'logs'
$logFileNode  = Join-Path $logDir 'tablero.log'

function Escribir {
    param([string] $Mensaje, [string] $Color = 'Gray')
    Write-Host $Mensaje -ForegroundColor $Color
    if ($LogFile) { Add-Content -LiteralPath $LogFile -Value $Mensaje -Encoding UTF8 }
}

function Test-Administrador {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
}

# --- Relevo con UAC -------------------------------------------------------
if (-not (Test-Administrador)) {
    Write-Host '  Se requieren permisos de administrador para reiniciar el servicio.'
    Write-Host '  Acepta el aviso de Control de cuentas de usuario que aparecera.'

    $relay = Join-Path $env:TEMP ("reinicio_{0}.log" -f [guid]::NewGuid().ToString('N'))
    New-Item -ItemType File -Path $relay -Force | Out-Null

    $argumentos = @(
        '-NoProfile'
        '-ExecutionPolicy', 'Bypass'
        '-WindowStyle', 'Hidden'
        '-File',     ('"{0}"' -f $PSCommandPath)
        '-Port',     $Port
        '-TaskName', ('"{0}"' -f $TaskName)
        '-LogFile',  ('"{0}"' -f $relay)
    )

    try {
        $proc = Start-Process -FilePath 'powershell.exe' -Verb RunAs `
            -ArgumentList $argumentos -Wait -PassThru -ErrorAction Stop
    }
    catch {
        Remove-Item $relay -Force -ErrorAction SilentlyContinue
        Write-Host '  [FALLO] No se concedieron los permisos de administrador.' -ForegroundColor Red
        Write-Host '  El servidor sigue con el codigo anterior.' -ForegroundColor Red
        exit 1
    }

    if (Test-Path $relay) {
        Get-Content -LiteralPath $relay | ForEach-Object { Write-Host $_ }
        Remove-Item $relay -Force -ErrorAction SilentlyContinue
    }

    exit $proc.ExitCode
}

# --- A partir de aqui la ejecucion ya es elevada --------------------------
if (-not (Test-Path $serverScript)) { throw "No se encontro $serverScript" }
if (-not (Test-Path (Join-Path $projectRoot 'dist'))) {
    throw "No existe dist/. Ejecuta 'npm run build' antes de desplegar."
}

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Get-DuenoPuerto {
    $conn = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $conn) { return $null }
    Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
}

function Wait-PuertoLibre {
    param([int] $Segundos = 12)

    for ($i = 0; $i -lt $Segundos; $i++) {
        $dueno = Get-DuenoPuerto
        if (-not $dueno) { return $true }
        Start-Sleep -Seconds 1
    }

    # La tarea puede dejar el node huerfano; ya elevados si podemos terminarlo.
    $dueno = Get-DuenoPuerto
    if ($dueno -and $dueno.ProcessName -eq 'node') {
        Escribir "  El puerto $Port seguia ocupado; deteniendo node (PID $($dueno.Id))."
        Stop-Process -Id $dueno.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    elseif ($dueno) {
        throw "El puerto $Port lo usa '$($dueno.ProcessName)' (PID $($dueno.Id)), que no es node."
    }

    return $null -eq (Get-DuenoPuerto)
}

function Wait-PuertoEscuchando {
    param([int] $Segundos = 25)
    for ($i = 0; $i -lt $Segundos; $i++) {
        Start-Sleep -Seconds 1
        if (Get-DuenoPuerto) { return $true }
    }
    return $false
}

$tarea = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($tarea) {
    Escribir "  Tarea programada: $TaskName"
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

    if (-not (Wait-PuertoLibre)) {
        throw "No se pudo liberar el puerto $Port."
    }

    Start-ScheduledTask -TaskName $TaskName
    Escribir '  Tarea reiniciada.'
}
else {
    Escribir "  No hay tarea programada; se arranca el proceso directamente."
    Escribir "  Para que el tablero sobreviva a un reinicio, ejecuta server\register-task.ps1." 'Yellow'

    if (-not (Wait-PuertoLibre -Segundos 3)) {
        throw "No se pudo liberar el puerto $Port."
    }

    $nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
    $nodeExe = if ($nodeCmd) { $nodeCmd.Source } else { 'C:\Program Files\nodejs\node.exe' }
    if (-not (Test-Path $nodeExe)) { throw 'No se encontro node.exe.' }

    $cmdLine = "set PORT=$Port&& `"$nodeExe`" `"$serverScript`" >> `"$logFileNode`" 2>&1"
    Start-Process -FilePath 'cmd.exe' -ArgumentList "/c `"$cmdLine`"" `
        -WorkingDirectory $projectRoot -WindowStyle Hidden
}

if (Wait-PuertoEscuchando) {
    Escribir "  Servidor escuchando en el puerto $Port." 'Green'
    exit 0
}

Escribir "  [FALLO] El servidor no volvio a escuchar en el puerto $Port." 'Red'
Escribir "  Revisa $logFileNode" 'Red'
exit 1
