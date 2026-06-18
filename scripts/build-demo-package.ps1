param(
    [string]$Version = '0.2'
)

$ErrorActionPreference = 'Stop'

function Copy-IfExists {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination
    )

    if (Test-Path $Source) {
        Copy-Item -Path $Source -Destination $Destination -Recurse -Force
    }
}

$root = Split-Path -Parent $PSScriptRoot
$distRoot = Join-Path $root 'dist'
$packageName = "ims-demo-windows-v$Version"
$packageRoot = Join-Path $distRoot $packageName
$payloadRoot = Join-Path $packageRoot 'app'
$zipPath = Join-Path $distRoot "$packageName.zip"
$runtimeRoot = Join-Path $payloadRoot 'runtime'

Write-Host "Building frontend for demo package v$Version..."
Push-Location $root
try {
    npm run build:web
} finally {
    Pop-Location
}

$frontendIndex = Join-Path $root 'frontend\dist\index.html'
if (-not (Test-Path $frontendIndex)) {
    throw "frontend\dist\index.html was not found after build."
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    throw 'Node.js runtime was not found. Cannot build a demo package without node.exe.'
}

$nodePath = $nodeCommand.Source
if (-not (Test-Path $nodePath)) {
    throw "Resolved node executable was not found at $nodePath"
}

if (Test-Path $packageRoot) {
    Remove-Item -LiteralPath $packageRoot -Recurse -Force
}

if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $payloadRoot -Force | Out-Null
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null

Write-Host "Copying package payload to $payloadRoot"

$payloadDirectories = @(
    'database',
    'frontend',
    'logs',
    'node_modules',
    'scripts',
    'src',
    'tests'
)

foreach ($entry in $payloadDirectories) {
    Copy-IfExists -Source (Join-Path $root $entry) -Destination $payloadRoot
}

$payloadFiles = @(
    '.env.demo.example',
    'package.json',
    'package-lock.json',
    'README.md',
    'WINDOWS_DEMO_PACKAGE.md',
    'Start-IMS-Demo.bat',
    'Stop-IMS-Demo.bat',
    'Run-IMS-Demo.bat',
    '.gitignore'
)

foreach ($entry in $payloadFiles) {
    Copy-IfExists -Source (Join-Path $root $entry) -Destination $payloadRoot
}

Copy-Item -Path $nodePath -Destination (Join-Path $runtimeRoot 'node.exe') -Force

Copy-IfExists -Source (Join-Path $root 'Install-IMS-Demo.ps1') -Destination $packageRoot
Copy-IfExists -Source (Join-Path $root 'Run-IMS-Demo.bat') -Destination $packageRoot
Copy-IfExists -Source (Join-Path $root 'WINDOWS_DEMO_PACKAGE.md') -Destination $packageRoot
Copy-IfExists -Source (Join-Path $root 'docs\DEMO_INSTALL_INSTRUCTIONS.md') -Destination $packageRoot

Write-Host "Creating archive $zipPath"
Compress-Archive -Path (Join-Path $packageRoot '*') -DestinationPath $zipPath -Force

Write-Host ''
Write-Host "Demo package created:"
Write-Host "  Folder: $packageRoot"
Write-Host "  Zip:    $zipPath"
