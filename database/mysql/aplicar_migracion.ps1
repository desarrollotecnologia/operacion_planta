<#
.SYNOPSIS
  Aplica un archivo .sql de migracion en MySQL con la cuenta de root.

.DESCRIPTION
  El usuario de la aplicacion (cierre_app) solo tiene permisos de lectura y
  escritura de datos, asi que los cambios de estructura necesitan root. La
  contrasena se pide en tiempo de ejecucion y viaja por MYSQL_PWD para que no
  aparezca en la linea de comandos ni en la lista de procesos.

.EXAMPLE
  .\aplicar_migracion.ps1 003_duracion_cruce_medianoche.sql
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $Archivo,
    [string] $MysqlHost = 'localhost',
    [int]    $Port      = 3306,
    [string] $RootUser  = 'root',
    [string] $Database  = 'cierre_operaciones'
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Resolve-MysqlClient {
    $cmd = Get-Command mysql.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $candidates = Get-ChildItem -Path 'C:\Program Files\MySQL' -Filter mysql.exe -Recurse -ErrorAction SilentlyContinue
    if ($candidates) { return $candidates[0].FullName }

    throw "No se encontro mysql.exe. Agregalo al PATH o instala MySQL Client."
}

function ConvertFrom-SecureStringPlain {
    param([System.Security.SecureString] $Secure)
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try   { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$sqlPath = if (Test-Path $Archivo) { (Resolve-Path $Archivo).Path } else { Join-Path $scriptDir $Archivo }
if (-not (Test-Path $sqlPath)) { throw "No existe el archivo SQL: $sqlPath" }

$mysqlExe = Resolve-MysqlClient
Write-Host "Cliente MySQL : $mysqlExe"
Write-Host "Migracion     : $sqlPath"
Write-Host "Destino       : $RootUser@${MysqlHost}:$Port"
Write-Host ''

$rootSecure = Read-Host "Contrasena de '$RootUser' en MySQL" -AsSecureString
$env:MYSQL_PWD = ConvertFrom-SecureStringPlain $rootSecure

function Invoke-SqlFile {
    param([string] $Path)

    $outFile = [IO.Path]::GetTempFileName()
    $errFile = [IO.Path]::GetTempFileName()

    try {
        $mysqlArgs = @(
            "--host=$MysqlHost"
            "--port=$Port"
            "--user=$RootUser"
            '--default-character-set=utf8mb4'
            '--show-warnings'
        )

        $proc = Start-Process -FilePath $mysqlExe -ArgumentList $mysqlArgs `
            -RedirectStandardInput $Path `
            -RedirectStandardOutput $outFile `
            -RedirectStandardError  $errFile `
            -NoNewWindow -Wait -PassThru

        [PSCustomObject]@{
            ExitCode = $proc.ExitCode
            Salida   = (Get-Content $outFile -Raw)
            Error    = (Get-Content $errFile -Raw)
        }
    }
    finally {
        Remove-Item $outFile, $errFile -Force -ErrorAction SilentlyContinue
    }
}

$registroFile = $null
try {
    $r = Invoke-SqlFile -Path $sqlPath

    if ($r.ExitCode -ne 0) {
        Write-Host '  [FALLO] La migracion no se aplico.' -ForegroundColor Red
        if ($r.Error) { Write-Host $r.Error.Trim() -ForegroundColor Red }
        throw "mysql devolvio codigo $($r.ExitCode)."
    }

    Write-Host '  [OK] Migracion aplicada.' -ForegroundColor Green
    if ($r.Error -and $r.Error.Trim()) { Write-Host $r.Error.Trim() -ForegroundColor DarkYellow }
    if ($r.Salida -and $r.Salida.Trim()) { Write-Host $r.Salida.Trim() }

    # Deja constancia para que el despliegue sepa que esta migracion ya corrio.
    $nombre = (Split-Path -Leaf $sqlPath).Replace("'", "''")
    $registroFile = Join-Path $env:TEMP "registro_$([guid]::NewGuid().ToString('N')).sql"
    @"
USE ``$Database``;
INSERT IGNORE INTO migracion_aplicada (archivo) VALUES ('$nombre');
"@ | Set-Content -Path $registroFile -Encoding utf8

    $reg = Invoke-SqlFile -Path $registroFile
    if ($reg.ExitCode -eq 0) {
        Write-Host "  [OK] Registrada como aplicada: $nombre" -ForegroundColor Green
    }
    else {
        # No es motivo para dar la migracion por fallida: ya se aplico.
        Write-Host '  [AVISO] La migracion se aplico pero no se pudo registrar.' -ForegroundColor DarkYellow
        Write-Host '  Si aun no existe la tabla, aplica 005_registro_migraciones.sql.' -ForegroundColor DarkYellow
    }
}
finally {
    Remove-Item env:MYSQL_PWD -ErrorAction SilentlyContinue
    if ($registroFile) { Remove-Item $registroFile -Force -ErrorAction SilentlyContinue }
}
