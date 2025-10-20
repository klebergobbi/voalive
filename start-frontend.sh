#!/bin/bash

# Script robusto para iniciar o frontend ReservaSegura em WSL
set -e

echo "🚀 Iniciando ReservaSegura Frontend na porta 3007..."

cd /mnt/c/projetos/reservasegura/apps/web

# Limpeza de cache
echo "🧹 Limpando cache..."
rm -rf .next node_modules/.cache || true

# Verificar se a porta está livre
if lsof -Pi :3007 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Porta 3007 está em uso. Encerrando processos..."
    pkill -f ":3007" || true
    sleep 2
fi

# Configurações otimizadas para WSL
export NEXT_TELEMETRY_DISABLED=1
export WATCHPACK_POLLING=true
export NODE_OPTIONS="--max-old-space-size=4096"
export NODE_ENV=development

echo "✅ Configurações aplicadas:"
echo "   - Telemetria desabilitada"
echo "   - Polling habilitado para WSL"
echo "   - Memória aumentada para 4GB"

# Verificar dependências
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

echo "🔧 Iniciando servidor de desenvolvimento..."
exec npm run dev