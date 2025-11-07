#!/bin/bash

echo "========================================"
echo " VoaLive - Iniciando ambiente de DEV"
echo "========================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -d "apps/api" ]; then
    echo "ERRO: Execute este script na raiz do projeto VoaLive!"
    exit 1
fi

echo "[1/3] Iniciando API na porta 4000..."
cd apps/api
npm run dev &
API_PID=$!
cd ../..
sleep 3

echo ""
echo "[2/3] Iniciando Web App na porta 3011..."
cd apps/web
npm run dev &
WEB_PID=$!
cd ../..
sleep 3

echo ""
echo "[3/3] Ambiente iniciado com sucesso!"
echo ""
echo "========================================"
echo " Serviços rodando:"
echo "========================================"
echo " API:     http://localhost:4000"
echo " Web:     http://localhost:3011"
echo " Login:   http://localhost:3011/login"
echo "========================================"
echo ""
echo "PIDs: API=$API_PID, WEB=$WEB_PID"
echo ""
echo "Para parar os serviços, pressione Ctrl+C"

# Esperar sinais de interrupção
trap "echo 'Parando serviços...'; kill $API_PID $WEB_PID 2>/dev/null; exit" INT TERM

# Manter o script rodando
wait
