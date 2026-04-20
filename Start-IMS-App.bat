@echo off
setlocal

set "ROOT=%~dp0"
set "HEALTH_URL=http://localhost:3000/health"

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

call :wait_for_backend >nul 2>&1
if errorlevel 1 (
  echo Starting backend...
  start "IMS Backend" cmd /k "cd /d ""%ROOT%"" && npm run dev"
  echo Waiting for backend health check at %HEALTH_URL% ...
  call :wait_for_backend
  if errorlevel 1 (
    echo Backend did not become ready within 20 seconds.
    echo Check the IMS Backend window for startup errors.
    exit /b 1
  )
) else (
  echo Backend is already responding on http://localhost:3000
)

echo Starting frontend...
start "IMS Frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm run dev"

exit /b 0

:wait_for_backend
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$deadline=(Get-Date).AddSeconds(20);" ^
  "$ready=$false;" ^
  "while((Get-Date) -lt $deadline){" ^
  "  try {" ^
  "    $resp=Invoke-WebRequest -UseBasicParsing '%HEALTH_URL%' -TimeoutSec 2;" ^
  "    if($resp.StatusCode -eq 200){ $ready=$true; break }" ^
  "  } catch {}" ^
  "  Start-Sleep -Milliseconds 500" ^
  "}" ^
  "if(-not $ready){ exit 1 }"
exit /b %errorlevel%
