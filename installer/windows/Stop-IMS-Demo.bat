@echo off
setlocal

set "ROOT=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\Stop-IMS-Demo.ps1"
exit /b %errorlevel%
