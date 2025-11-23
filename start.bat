@echo off
echo ============================================================
echo Starting Nose Tracking Accessibility Tool
echo ============================================================
echo.
echo Starting servers:
echo   1. HTTP Server on http://localhost:8000
echo   2. Fish Audio Proxy on http://localhost:5001
echo.
echo ============================================================

REM Start Fish Audio proxy server in new window
start "Fish Audio Proxy (Port 5001)" cmd /k python proxy.py

REM Wait 2 seconds for proxy to start
timeout /t 2 /nobreak >nul

REM Start HTTP server in current window
echo.
echo Opening browser at http://localhost:8000
echo.
start http://localhost:8000
python -m http.server 8000`