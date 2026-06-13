param()

$ErrorActionPreference = 'Stop'

function Get-EnvMap {
    param([Parameter(Mandatory = $true)][string]$Path)

    $values = @{}
    if (-not (Test-Path $Path)) {
        return $values
    }

    foreach ($line in Get-Content -Path $Path) {
        if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith('#')) {
            continue
        }

        $parts = $line -split '=', 2
        if ($parts.Count -eq 2) {
            $values[$parts[0].Trim()] = $parts[1].Trim()
        }
    }

    return $values
}

function Stop-ProcessIfRunning {
    param([Parameter(Mandatory = $true)][int]$ProcessId)

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $process) {
        return $false
    }

    Stop-Process -Id $ProcessId -Force
    return $true
}

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
$pidFile = Join-Path $root '.ims-app.pid'
$envMap = Get-EnvMap -Path $envFile
$port = if ($envMap.ContainsKey('PORT')) { [int]$envMap.PORT } else { 3000 }

Write-Host "Stopping IMS App..." -ForegroundColor Cyan

$stopped = $false

if (Test-Path $pidFile) {
    $pidValue = (Get-Content -Path $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
    if ($pidValue -match '^\d+$') {
        if (Stop-ProcessIfRunning -ProcessId ([int]$pidValue)) {
            Write-Host "Stopped PID $pidValue from .ims-app.pid" -ForegroundColor Green
            $stopped = $true
        }
    }

    Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
}

$listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)

foreach ($listener in $listeners) {
    if (Stop-ProcessIfRunning -ProcessId $listener.OwningProcess) {
        Write-Host "Stopped PID $($listener.OwningProcess) listening on port $port" -ForegroundColor Green
        $stopped = $true
    }
}

if (-not $stopped) {
    Write-Host "No running IMS App process was found on port $port." -ForegroundColor Yellow
}
