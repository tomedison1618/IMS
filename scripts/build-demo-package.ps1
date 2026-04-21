param(
    [string]$Version
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $Version) {
    $packageJson = Get-Content -Path (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
    $Version = $packageJson.version
}

$packageName = "ims-demo-windows-v$Version"
$distRoot = Join-Path $root 'dist'
$stageRoot = Join-Path $distRoot $packageName
$payloadRoot = Join-Path $stageRoot 'app'
$zipPath = Join-Path $distRoot "$packageName.zip"

Write-Host 'Building frontend production bundle...'
$npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
& $npmPath --prefix frontend run build
if ($LASTEXITCODE -ne 0) {
    throw 'Frontend build failed.'
}

if (Test-Path $stageRoot) {
    Remove-Item -Path $stageRoot -Recurse -Force
}

if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

New-Item -ItemType Directory -Path $payloadRoot -Force | Out-Null

$copyTargets = @(
    'src',
    'database',
    'node_modules',
    'frontend\dist',
    'docs',
    'README.md',
    'package.json',
    'package-lock.json'
)

foreach ($target in $copyTargets) {
    $sourcePath = Join-Path $root $target
    $destinationPath = Join-Path $payloadRoot $target
    $destinationParent = Split-Path -Parent $destinationPath
    if ($destinationParent) {
        New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    }
    Copy-Item -Path $sourcePath -Destination $destinationPath -Recurse -Force
}

New-Item -ItemType Directory -Path (Join-Path $payloadRoot 'scripts') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $payloadRoot 'runtime') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $payloadRoot 'logs') -Force | Out-Null

$nodePath = (Get-Command node -ErrorAction Stop).Source
Copy-Item -Path $nodePath -Destination (Join-Path $payloadRoot 'runtime\node.exe') -Force

Copy-Item -Path (Join-Path $root 'installer\windows\demo.env.template') -Destination (Join-Path $payloadRoot '.env.demo.example') -Force
Copy-Item -Path (Join-Path $root 'installer\windows\Start-IMS-Demo.bat') -Destination (Join-Path $payloadRoot 'Start-IMS-Demo.bat') -Force
Copy-Item -Path (Join-Path $root 'installer\windows\Stop-IMS-Demo.bat') -Destination (Join-Path $payloadRoot 'Stop-IMS-Demo.bat') -Force
Copy-Item -Path (Join-Path $root 'installer\windows\Run-IMS-Demo.ps1') -Destination (Join-Path $payloadRoot 'scripts\Run-IMS-Demo.ps1') -Force
Copy-Item -Path (Join-Path $root 'installer\windows\Stop-IMS-Demo.ps1') -Destination (Join-Path $payloadRoot 'scripts\Stop-IMS-Demo.ps1') -Force
Copy-Item -Path (Join-Path $root 'installer\windows\Initialize-IMS-Demo-Database.ps1') -Destination (Join-Path $payloadRoot 'scripts\Initialize-IMS-Demo-Database.ps1') -Force
Copy-Item -Path (Join-Path $root 'installer\windows\Install-IMS-Demo.ps1') -Destination (Join-Path $stageRoot 'Install-IMS-Demo.ps1') -Force
Copy-Item -Path (Join-Path $root 'docs\WINDOWS_DEMO_PACKAGE.md') -Destination (Join-Path $stageRoot 'WINDOWS_DEMO_PACKAGE.md') -Force

Compress-Archive -Path (Join-Path $stageRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host ''
Write-Host "Demo package ready:"
Write-Host $stageRoot
Write-Host $zipPath
