@echo off
setlocal

set "ROOT=C:\Users\admin\Documents\Team4s"
set "BACKEND_DIR=%ROOT%\backend"
set "FRONTEND_DIR=%ROOT%\frontend"

echo.
echo [Team4s] Stoppe Docker-Frontend/Backend, damit lokale Prozesse die Ports uebernehmen koennen...
cd /d "%ROOT%"
docker compose stop team4sv30-frontend team4sv30-backend

echo.
echo [Team4s] Beende alte lokale Next- und Go-Prozesse...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process go -ErrorAction SilentlyContinue | Stop-Process -Force"

echo.
echo [Team4s] Entferne ggf. alten Next-Dev-Lock...
if exist "%FRONTEND_DIR%\.next\dev\lock" del /f /q "%FRONTEND_DIR%\.next\dev\lock"

echo.
echo [Team4s] Starte lokales Go-Backend in neuem Fenster...
start "Team4s Backend" cmd /k "cd /d "%BACKEND_DIR%" && go run ./cmd/server"

echo.
echo [Team4s] Warte kurz auf Backend-Start...
timeout /t 3 /nobreak >nul

echo.
echo [Team4s] Starte lokales Next-Frontend auf Port 3002 in neuem Fenster...
start "Team4s Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npx next dev -p 3002"

echo.
echo [Team4s] Fertig.
echo Frontend: http://localhost:3002/admin/anime/create
echo Backend:  http://localhost:8092/health
echo.
echo Hinweis: Falls schon alte lokale Fenster laufen, bitte dort ggf. Strg+C druecken.
echo.

endlocal
