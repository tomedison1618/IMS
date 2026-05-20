param()

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root '.ims-demo.pid'

if (-not (Test-Path $pidFile)) {
    Write-Host 'IMS Demo is not currently marked as running.'
    exit 0
}

$pid = Get-Content -Path $pidFile -ErrorAction Stop | Select-Object -First 1
if (-not $pid) {
    Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host 'IMS Demo PID file was empty.'
    exit 0
}

try {
    Stop-Process -Id ([int]$pid) -Force -ErrorAction Stop
    Write-Host "Stopped IMS Demo process $pid."
} catch {
    Write-Warning "Could not stop process $pid. It may have already exited."
}

Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
