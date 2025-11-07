#!/bin/bash

# Execute este script DIRETAMENTE NO SERVIDOR 159.89.80.179
# via SSH: ssh root@159.89.80.179 'bash -s' < deploy-no-servidor.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 COMPILANDO E REINICIANDO API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📍 Passo 1: Verificando arquivo atualizado..."
ls -lh /opt/voalive/apps/api/src/routes/airline-booking.routes.ts

echo ""
echo "🔨 Passo 2: Compilando TypeScript..."
cd /opt/voalive/apps/api
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro na compilação"
    exit 1
fi

echo ""
echo "✅ Compilação concluída!"

echo ""
echo "🔄 Passo 3: Reiniciando container da API..."
cd /opt/voalive
docker-compose restart reservasegura-api

echo ""
echo "⏳ Passo 4: Aguardando API inicializar (15 segundos)..."
sleep 15

echo ""
echo "🏥 Passo 5: Verificando saúde do container..."
docker ps | grep reservasegura-api

echo ""
echo "📋 Passo 6: Últimas linhas do log..."
docker logs voalive-reservasegura-api-1 --tail 20

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY CONCLUÍDO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Para testar, execute no seu computador local:"
echo "   node test-cadastro-e-busca-reservas.js"
echo ""
