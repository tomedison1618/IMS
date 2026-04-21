param(
    [string]$DatabaseUrl,
    [string]$EnvFilePath,
    [switch]$SkipCreateDatabase
)

$ErrorActionPreference = 'Stop'

function Get-EnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if (-not (Test-Path $Path)) {
        return $null
    }

    foreach ($line in Get-Content -Path $Path) {
        if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith('#')) {
            continue
        }

        $parts = $line -split '=', 2
        if ($parts.Count -eq 2 -and $parts[0].Trim() -eq $Name) {
            return $parts[1].Trim()
        }
    }

    return $null
}

function Get-PsqlPath {
    $command = Get-Command psql -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $commonPaths = @(
        'C:\Program Files\PostgreSQL\18\bin\psql.exe',
        'C:\Program Files\PostgreSQL\17\bin\psql.exe',
        'C:\Program Files\PostgreSQL\16\bin\psql.exe'
    )

    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            return $path
        }
    }

    return $null
}

if (-not $DatabaseUrl -and $EnvFilePath) {
    $DatabaseUrl = Get-EnvValue -Path $EnvFilePath -Name 'DATABASE_URL'
}

if (-not $DatabaseUrl) {
    throw 'DATABASE_URL was not supplied and could not be resolved from the .env file.'
}

$psqlPath = Get-PsqlPath
if (-not $psqlPath) {
    throw 'psql.exe was not found. Install PostgreSQL client/server tools or add psql to PATH.'
}

$root = Split-Path -Parent $PSScriptRoot
$schemaPath = Join-Path $root 'database\schema\001_ims_mvp.sql'
$seedPath = Join-Path $root 'database\seeds\001_baseline_roles_and_users.sql'

if (-not (Test-Path $schemaPath)) {
    throw "Schema file not found at $schemaPath"
}

if (-not (Test-Path $seedPath)) {
    throw "Seed file not found at $seedPath"
}

$dbUri = [System.Uri]$DatabaseUrl
$databaseName = $dbUri.AbsolutePath.Trim('/').Trim()
if (-not $databaseName) {
    throw 'DATABASE_URL does not include a database name.'
}

$builder = New-Object System.UriBuilder($dbUri)
$builder.Path = '/postgres'
$adminDatabaseUrl = $builder.Uri.AbsoluteUri

if (-not $SkipCreateDatabase) {
    $exists = & $psqlPath $adminDatabaseUrl -Atqc "SELECT 1 FROM pg_database WHERE datname = '$databaseName';"
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to connect to PostgreSQL while checking the demo database.'
    }

    if (("$exists").Trim() -ne '1') {
        & $psqlPath $adminDatabaseUrl -v ON_ERROR_STOP=1 -c "CREATE DATABASE ""$databaseName"";"
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create database $databaseName."
        }
    }
}

& $psqlPath $DatabaseUrl -v ON_ERROR_STOP=1 -f $schemaPath
if ($LASTEXITCODE -ne 0) {
    throw 'Failed to apply the IMS schema.'
}

& $psqlPath $DatabaseUrl -v ON_ERROR_STOP=1 -f $seedPath
if ($LASTEXITCODE -ne 0) {
    throw 'Failed to apply the IMS demo seed data.'
}

Write-Host "Database $databaseName is ready for the IMS Demo."
