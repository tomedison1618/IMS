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

function Wait-ForHealth {
    param(
        [Parameter(Mandatory = $true)][string[]]$HealthUrls,
        [int]$TimeoutSeconds = 30,
        [System.Diagnostics.Process]$Process
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if ($Process -and $Process.HasExited) {
            return $false
        }

        foreach ($healthUrl in $HealthUrls) {
            try {
                $response = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 2
                if ($response.StatusCode -eq 200) {
                    return $true
                }
            } catch {
            }
        }

        Start-Sleep -Milliseconds 500
    }

    return $false
}

function Test-PortInUse {
    param([Parameter(Mandatory = $true)][int]$Port)

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
        return @($connections).Count -gt 0
    } catch {
        return $false
    }
}

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
$logsDir = Join-Path $root 'logs'
$pidFile = Join-Path $root '.ims-app.pid'

$envMap = Get-EnvMap -Path $envFile
$port = if ($envMap.ContainsKey('PORT')) { [int]$envMap.PORT } else { 3000 }
$appUrl = "http://localhost:$port"
$healthUrls = @(
    "http://127.0.0.1:$port/health",
    "http://localhost:$port/health"
)

if ($envMap.ContainsKey('HOST')) {
    $hostValue = $envMap.HOST.Trim()
    if ($hostValue -and $hostValue -notin @('0.0.0.0', '::')) {
        $healthUrls = @("http://$hostValue`:$port/health") + $healthUrls
    }
}
$nodePath = Join-Path $root 'runtime\node.exe'
$frontendIndex = Join-Path $root 'frontend\dist\index.html'

if (-not (Test-Path $nodePath)) {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCommand) {
        throw 'Node.js runtime was not found. The packaged runtime is missing and system node.exe is unavailable.'
    }

    $nodePath = $nodeCommand.Source
}

if (-not (Test-Path $frontendIndex)) {
    throw 'frontend\dist\index.html was not found. Run "npm --prefix frontend run build" first.'
}

Write-Host "IMS App launcher" -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host "URL:  $appUrl"

if (Wait-ForHealth -HealthUrls $healthUrls -TimeoutSeconds 2) {
    Write-Host 'App is already running. Opening browser...' -ForegroundColor Green
    Start-Process $appUrl | Out-Null
    return
}

if (Test-PortInUse -Port $port) {
    throw "Port $port is already in use, but /health is not responding. Stop the existing process or change PORT in .env."
}

New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
$stdoutLog = Join-Path $logsDir 'server.stdout.log'
$stderrLog = Join-Path $logsDir 'server.stderr.log'

Write-Host "Starting server with $nodePath ..." -ForegroundColor Yellow
$process = Start-Process -FilePath $nodePath -ArgumentList 'src/server.js' -WorkingDirectory $root -PassThru
Set-Content -Path $pidFile -Value $process.Id
Write-Host "PID: $($process.Id)"
Write-Host "Waiting for health endpoint..." -ForegroundColor Yellow

if (-not (Wait-ForHealth -HealthUrls $healthUrls -TimeoutSeconds 30 -Process $process)) {
    if ($process.HasExited) {
        throw "IMS App exited before it became ready. Exit code: $($process.ExitCode). Review the visible server console window for errors."
    }

    throw "IMS App did not become ready at $($healthUrls -join ', '). Review the visible server console window for errors."
}

Write-Host 'App is ready. Opening browser...' -ForegroundColor Green
Start-Process $appUrl | Out-Null
