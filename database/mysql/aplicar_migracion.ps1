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
    [string] $RootUser  = 'root'
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
        -RedirectStandardInput $sqlPath `
        -RedirectStandardOutput $outFile `
        -RedirectStandardError  $errFile `
        -NoNewWindow -Wait -PassThru

    $out = Get-Content $outFile -Raw
    $err = Get-Content $errFile -Raw

    if ($proc.ExitCode -ne 0) {
        Write-Host '  [FALLO] La migracion no se aplico.' -ForegroundColor Red
        if ($err) { Write-Host $err.Trim() -ForegroundColor Red }
        throw "mysql devolvio codigo $($proc.ExitCode)."
    }

    Write-Host '  [OK] Migracion aplicada.' -ForegroundColor Green
    if ($err -and $err.Trim()) { Write-Host $err.Trim() -ForegroundColor DarkYellow }
    if ($out -and $out.Trim()) { Write-Host $out.Trim() }
}
finally {
    Remove-Item env:MYSQL_PWD -ErrorAction SilentlyContinue
    Remove-Item $outFile, $errFile -Force -ErrorAction SilentlyContinue
}
