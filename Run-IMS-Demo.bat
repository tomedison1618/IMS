@echo off
setlocal

set "ROOT=%~dp0"
set "PAYLOAD_START=%ROOT%Start-IMS-Demo.bat"
set "PACKAGE_START=%ROOT%app\Start-IMS-Demo.bat"

if exist "%PAYLOAD_START%" (
  call "%PAYLOAD_START%"
  exit /b %errorlevel%
)

if exist "%PACKAGE_START%" (
  call "%PACKAGE_START%"
  exit /b %errorlevel%
)

echo Could not find Start-IMS-Demo.bat.
echo Expected one of:
echo   %PAYLOAD_START%
echo   %PACKAGE_START%
exit /b 1
