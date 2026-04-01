@echo off
setlocal

set "ROOT=%~dp0"

if not exist "%ROOT%package.json" (
  echo Could not find package.json in "%ROOT%".
  exit /b 1
)

if not exist "%ROOT%frontend\package.json" (
  echo Could not find frontend\package.json in "%ROOT%frontend".
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo npm was not found in PATH. Install Node.js and npm first.
  exit /b 1
)

echo Starting IMS backend and frontend...
echo Backend will run on http://localhost:3000
echo Frontend will run on http://localhost:5173

start "IMS Backend" cmd /k "cd /d ""%ROOT%"" && npm run dev"
start "IMS Frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm run dev"

exit /b 0
