@echo off
chcp 65001 >nul
title Actualizador Automatico - XAU/USD London Breakout Quant

echo ========================================================
echo   XAU/USD London Breakout Quant - Actualizador 1-Clic
echo ========================================================
echo.

:: 1. Verificar si git está instalado
where git >nul 2>nul
if %errorlevel% equ 0 (
    if exist .git (
        echo [1/3] Sincronizando ultimos cambios con Git...
        git fetch --all
        git pull
        echo [OK] Codigo actualizado a la ultima version.
        echo.
    ) else (
        echo [INFO] No se detecto repositorio Git local.
        echo Para sincronizacion automatica con 1-clic, clona tu repositorio con:
        echo git clone ^<url-del-repo^> .
        echo.
    )
) else (
    echo [INFO] Git no esta en PATH. Se procedera con la instalacion local.
    echo.
)

:: 2. Instalar solo dependencias faltantes sin re-descargar todo
echo [2/3] Verificando dependencias npm...
if not exist node_modules (
    echo [!] Primera instalacion detectada. Instalando paquetes...
    call npm install
) else (
    echo [OK] node_modules existente. Instalando solo dependencias nuevas...
    call npm install --prefer-offline --no-audit
)

echo.
echo [3/3] Iniciando servidor de la aplicacion...
echo [INFO] Abriendo navegador en http://localhost:3000
start http://localhost:3000

echo.
echo ========================================================
echo   ¡Listo! Tu plataforma esta actualizada y corriendo.
echo   Presiona CTRL+C para detener el servidor.
echo ========================================================
echo.

call npm run dev
pause
