@echo off
setlocal

set "ROOT=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\Stop-IMS-App.ps1"
set "EXITCODE=%errorlevel%"

if not "%EXITCODE%"=="0" (
  echo.
  echo Stop-IMS-App failed with exit code %EXITCODE%.
  echo Press any key to close this window.
  pause >nul
)

exit /b %EXITCODE%
