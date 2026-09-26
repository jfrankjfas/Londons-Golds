#!/usr/bin/env bash
# Lanzador de 1-Clic para Mac y Linux
# Uso: ./iniciar.sh

echo "========================================================"
echo "  Iniciando XAU/USD London Breakout Quant Dashboard"
echo "========================================================"
echo ""

if [ ! -d "node_modules" ]; then
    echo "[!] Instalando dependencias por primera vez..."
    npm install
fi

echo "[OK] Abriendo navegador en http://localhost:3000..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000 &
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3000 &> /dev/null &
fi

npm run dev
