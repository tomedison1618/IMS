@echo off
setlocal

set "ROOT=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\Run-IMS-Demo.ps1"
exit /b %errorlevel%
