@echo off
chcp 65001 >nul
title Iniciar XAU/USD London Breakout Quant

echo ========================================================
echo   Iniciando XAU/USD London Breakout Quant Dashboard
echo ========================================================
echo.

if not exist node_modules (
    echo [!] Dependencias no encontradas. Instalando por primera vez...
    call npm install
)

echo [OK] Abriendo navegador en http://localhost:3000 ...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo [OK] Servidor activo. Para salir presiona CTRL+C.
call npm run dev
pause
