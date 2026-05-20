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
        [Parameter(Mandatory = $true)][string]$HealthUrl,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $HealthUrl -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                return $true
            }
        } catch {
        }
        Start-Sleep -Milliseconds 500
    }

    return $false
}

$root = Split-Path -Parent $PSScriptRoot
$envTemplate = Join-Path $root '.env.demo.example'
$envFile = Join-Path $root '.env'
$logsDir = Join-Path $root 'logs'
$pidFile = Join-Path $root '.ims-demo.pid'

if (-not (Test-Path $envFile) -and (Test-Path $envTemplate)) {
    Copy-Item -Path $envTemplate -Destination $envFile -Force
}

$envMap = Get-EnvMap -Path $envFile
$port = if ($envMap.ContainsKey('PORT')) { [int]$envMap.PORT } else { 3000 }
$healthUrl = "http://localhost:$port/health"
$appUrl = "http://localhost:$port"
$nodePath = Join-Path $root 'runtime\node.exe'
$dbInitScript = Join-Path $root 'scripts\Initialize-IMS-Demo-Database.ps1'

if (-not (Test-Path $nodePath)) {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCommand) {
        throw 'Node.js runtime was not found. The packaged runtime is missing and system node.exe is unavailable.'
    }
    $nodePath = $nodeCommand.Source
}

if (-not (Test-Path (Join-Path $root 'frontend\dist\index.html'))) {
    throw 'frontend\dist\index.html was not found. Rebuild the demo package before installing it.'
}

if (Test-Path $dbInitScript) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $dbInitScript -EnvFilePath $envFile
    if ($LASTEXITCODE -ne 0) {
        throw 'Database initialization failed. Review the installed .env file and rerun scripts\Initialize-IMS-Demo-Database.ps1.'
    }
}

if (Wait-ForHealth -HealthUrl $healthUrl -TimeoutSeconds 2) {
    Start-Process $appUrl | Out-Null
    return
}

New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
$stdoutLog = Join-Path $logsDir 'server.stdout.log'
$stderrLog = Join-Path $logsDir 'server.stderr.log'

$process = Start-Process -FilePath $nodePath -ArgumentList 'src/server.js' -WorkingDirectory $root -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru -WindowStyle Hidden
Set-Content -Path $pidFile -Value $process.Id

if (-not (Wait-ForHealth -HealthUrl $healthUrl -TimeoutSeconds 30)) {
    throw "IMS Demo did not become ready. Review $stdoutLog and $stderrLog."
}

Start-Process $appUrl | Out-Null
