param(
    [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'Programs\IMS Demo'),
    [switch]$SkipDesktopShortcuts,
    [switch]$SkipDatabaseInit
)

$ErrorActionPreference = 'Stop'

function New-Shortcut {
    param(
        [Parameter(Mandatory = $true)][string]$ShortcutPath,
        [Parameter(Mandatory = $true)][string]$TargetPath,
        [string]$WorkingDirectory,
        [string]$Description
    )

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($ShortcutPath)
    $shortcut.TargetPath = $TargetPath
    if ($WorkingDirectory) {
        $shortcut.WorkingDirectory = $WorkingDirectory
    }
    if ($Description) {
        $shortcut.Description = $Description
    }
    $shortcut.Save()
}

$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$payloadRoot = Join-Path $packageRoot 'app'

if (-not (Test-Path $payloadRoot)) {
    throw "Could not find packaged app payload at $payloadRoot"
}

Write-Host "Installing IMS Demo to $InstallDir"
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path (Join-Path $payloadRoot '*') -Destination $InstallDir -Recurse -Force

$envTemplate = Join-Path $InstallDir '.env.demo.example'
$envFile = Join-Path $InstallDir '.env'
if (-not (Test-Path $envFile) -and (Test-Path $envTemplate)) {
    Copy-Item -Path $envTemplate -Destination $envFile -Force
}

if (-not $SkipDesktopShortcuts) {
    $desktopDir = [Environment]::GetFolderPath('Desktop')
    New-Shortcut -ShortcutPath (Join-Path $desktopDir 'IMS Demo.lnk') -TargetPath (Join-Path $InstallDir 'Start-IMS-Demo.bat') -WorkingDirectory $InstallDir -Description 'Start the IMS Demo server and open the browser.'
    New-Shortcut -ShortcutPath (Join-Path $desktopDir 'IMS Demo Stop.lnk') -TargetPath (Join-Path $InstallDir 'Stop-IMS-Demo.bat') -WorkingDirectory $InstallDir -Description 'Stop the IMS Demo server.'
}

if (-not $SkipDatabaseInit) {
    $dbInitScript = Join-Path $InstallDir 'scripts\Initialize-IMS-Demo-Database.ps1'
    if (Test-Path $dbInitScript) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $dbInitScript -EnvFilePath $envFile
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Database initialization did not complete. Review .env and run scripts\Initialize-IMS-Demo-Database.ps1 manually."
        }
    }
}

Write-Host ''
Write-Host 'Install complete.'
Write-Host "App folder: $InstallDir"
Write-Host 'Use Start-IMS-Demo.bat or the IMS Demo desktop shortcut to launch the demo.'
