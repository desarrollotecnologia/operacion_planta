<#
.SYNOPSIS
  Crea la base cierre_operaciones en MySQL y el usuario de aplicacion.

.DESCRIPTION
  Ejecuta 001_crear_base_mysql.sql y genera los GRANT del usuario de la app
  con una contrasena pedida en tiempo de ejecucion, de modo que ninguna
  credencial queda escrita en el repositorio.

  El script es idempotente: puede volver a ejecutarse sin romper nada.

.EXAMPLE
  .\deploy_205.ps1

.EXAMPLE
  .\deploy_205.ps1 -AppHosts @('localhost','192.168.20.%')
#>
[CmdletBinding()]
param(
    [string]   $MysqlHost = 'localhost',
    [int]      $Port      = 3306,
    [string]   $RootUser  = 'root',
    [string]   $AppUser   = 'cierre_app',
    [string[]] $AppHosts  = @('localhost', '127.0.0.1'),
    [string]   $Database  = 'cierre_operaciones'
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

# MySQL interpreta \ dentro de literales de cadena, por eso se escapa tambien.
function ConvertTo-SqlLiteral {
    param([string] $Value)
    $Value.Replace('\', '\\').Replace("'", "''")
}

function Invoke-MysqlFile {
    param(
        [string] $Path,
        [string] $Label
    )

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

        $out = (Get-Content $outFile -Raw)
        $err = (Get-Content $errFile -Raw)

        if ($proc.ExitCode -ne 0) {
            Write-Host "  [FALLO] $Label" -ForegroundColor Red
            if ($err) { Write-Host $err.Trim() -ForegroundColor Red }
            throw "mysql devolvio codigo $($proc.ExitCode) en '$Label'."
        }

        Write-Host "  [OK] $Label" -ForegroundColor Green
        if ($err -and $err.Trim()) { Write-Host $err.Trim() -ForegroundColor DarkYellow }
        if ($out -and $out.Trim()) { Write-Host $out.Trim() }
    }
    finally {
        Remove-Item $outFile, $errFile -Force -ErrorAction SilentlyContinue
    }
}

$mysqlExe = Resolve-MysqlClient
Write-Host "Cliente MySQL : $mysqlExe"
Write-Host "Destino       : $RootUser@${MysqlHost}:$Port"
Write-Host "Base          : $Database"
Write-Host ''

$rootSecure = Read-Host "Contrasena de '$RootUser' en MySQL" -AsSecureString
$appSecure  = Read-Host "Contrasena NUEVA para el usuario de la app '$AppUser'" -AsSecureString
$appConfirm = Read-Host "Confirma la contrasena de '$AppUser'" -AsSecureString

$appPlain     = ConvertFrom-SecureStringPlain $appSecure
$appPlainCopy = ConvertFrom-SecureStringPlain $appConfirm

if ($appPlain -ne $appPlainCopy) { throw "Las contrasenas de '$AppUser' no coinciden." }
if ($appPlain.Length -lt 8)      { throw "La contrasena de '$AppUser' debe tener al menos 8 caracteres." }

# MYSQL_PWD evita que la contrasena aparezca en la linea de comandos / lista de procesos.
$env:MYSQL_PWD = ConvertFrom-SecureStringPlain $rootSecure

$grantsFile = $null
try {
    Write-Host ''
    Write-Host 'Paso 1/3 - Esquema, catalogos y vistas' -ForegroundColor Cyan
    Invoke-MysqlFile -Path (Join-Path $scriptDir '001_crear_base_mysql.sql') -Label 'Esquema creado'

    Write-Host ''
    Write-Host 'Paso 2/3 - Usuario de aplicacion' -ForegroundColor Cyan

    $escapedPwd = ConvertTo-SqlLiteral $appPlain
    $sb = [Text.StringBuilder]::new()
    foreach ($h in $AppHosts) {
        [void]$sb.AppendLine("CREATE USER IF NOT EXISTS '$AppUser'@'$h' IDENTIFIED BY '$escapedPwd';")
        [void]$sb.AppendLine("ALTER USER '$AppUser'@'$h' IDENTIFIED BY '$escapedPwd';")
        [void]$sb.AppendLine("GRANT SELECT, INSERT, UPDATE, DELETE ON ``$Database``.* TO '$AppUser'@'$h';")
    }
    [void]$sb.AppendLine('FLUSH PRIVILEGES;')

    $grantsFile = Join-Path $env:TEMP "grants_$([guid]::NewGuid().ToString('N')).sql"
    [IO.File]::WriteAllText($grantsFile, $sb.ToString(), [Text.UTF8Encoding]::new($false))

    Invoke-MysqlFile -Path $grantsFile -Label "Usuario '$AppUser' listo en: $($AppHosts -join ', ')"

    Write-Host ''
    Write-Host 'Paso 3/4 - Archivo .env para la API' -ForegroundColor Cyan

    $projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
    $envPath = Join-Path $projectRoot '.env'

    # La contrasena viaja dentro de una URL, hay que escapar los caracteres especiales.
    $encodedPwd = [uri]::EscapeDataString($appPlain)
    $connString = "mysql://${AppUser}:${encodedPwd}@${MysqlHost}:$Port/$Database"

    $envContent = @"
# Generado por database/mysql/deploy_205.ps1
# Contiene credenciales: .gitignore lo excluye, no lo subas al repositorio.
DATABASE_URL=$connString
PORT=5174
"@

    [IO.File]::WriteAllText($envPath, $envContent, [Text.UTF8Encoding]::new($false))
    Write-Host "  [OK] Escrito $envPath" -ForegroundColor Green

    Write-Host ''
    Write-Host 'Paso 4/4 - Verificacion' -ForegroundColor Cyan

    $checkFile = Join-Path $env:TEMP "check_$([guid]::NewGuid().ToString('N')).sql"
    @"
USE ``$Database``;
SELECT COUNT(*) AS tablas FROM information_schema.tables
  WHERE table_schema = '$Database' AND table_type = 'BASE TABLE';
SELECT COUNT(*) AS vistas FROM information_schema.views
  WHERE table_schema = '$Database';
SELECT codigo, nombre FROM cat_area ORDER BY id;
SELECT COUNT(*) AS estados_novedad FROM cat_estado_novedad;
"@ | Set-Content -Path $checkFile -Encoding utf8

    try   { Invoke-MysqlFile -Path $checkFile -Label 'Verificacion' }
    finally { Remove-Item $checkFile -Force -ErrorAction SilentlyContinue }

    Write-Host ''
    Write-Host 'Base de datos lista.' -ForegroundColor Green
    Write-Host 'Siguientes pasos:'
    Write-Host '  npm run seed     # carga inicial opcional con los datos del prototipo'
    Write-Host '  npm run deploy   # compila y levanta el tablero'
}
finally {
    Remove-Item env:MYSQL_PWD -ErrorAction SilentlyContinue
    if ($grantsFile) { Remove-Item $grantsFile -Force -ErrorAction SilentlyContinue }
    $appPlain = $null; $appPlainCopy = $null; $escapedPwd = $null
}
