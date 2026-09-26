#!/usr/bin/env bash
# Actualizador Automático para Mac y Linux
# Uso: ./actualizar.sh

echo "========================================================"
echo "  XAU/USD London Breakout Quant - Actualizador 1-Clic"
echo "========================================================"
echo ""

# 1. Actualizar con Git si existe
if command -v git &> /dev/null && [ -d ".git" ]; then
    echo "[1/3] Sincronizando últimos cambios desde Git..."
    git fetch --all
    git pull
    echo "[OK] Código actualizado con éxito."
    echo ""
fi

# 2. Instalar solo cambios de dependencias
echo "[2/3] Verificando dependencias npm..."
if [ ! -d "node_modules" ]; then
    echo "[!] Primera instalación detectada. Instalando paquetes..."
    npm install
else
    echo "[OK] node_modules existente. Verificando paquetes nuevos..."
    npm install --prefer-offline --no-audit
fi

echo ""
echo "[3/3] Iniciando servidor..."
echo "[INFO] Abriendo en el navegador: http://localhost:3000"

# Abrir navegador según sistema operativo
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000 &
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3000 &> /dev/null &
fi

npm run dev
