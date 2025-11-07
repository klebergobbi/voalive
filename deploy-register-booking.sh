#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOY - ENDPOINT DE CADASTRO DE RESERVAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SERVER="root@159.89.80.179"
DEPLOY_DIR="/opt/voalive"

echo ""
echo "📦 Passo 1: Criando pacote de deploy..."

# Criar diretório temporário
mkdir -p deploy-temp/apps/api/src/routes

# Copiar arquivo atualizado
cp apps/api/src/routes/airline-booking.routes.ts deploy-temp/apps/api/src/routes/

# Criar tarball
cd deploy-temp
tar -czf ../voalive-register-booking.tar.gz apps/
cd ..
rm -rf deploy-temp

echo "✅ Pacote criado: voalive-register-booking.tar.gz"

echo ""
echo "📤 Passo 2: Enviando para o servidor..."

scp voalive-register-booking.tar.gz $SERVER:/tmp/

if [ $? -ne 0 ]; then
    echo "❌ Erro ao enviar arquivo para o servidor"
    exit 1
fi

echo "✅ Arquivo enviado"

echo ""
echo "🔧 Passo 3: Aplicando alterações no servidor..."

ssh $SERVER << 'ENDSSH'
cd /opt/voalive

echo "📦 Extraindo arquivos..."
tar -xzf /tmp/voalive-register-booking.tar.gz

echo "🔨 Compilando TypeScript..."
cd /opt/voalive/apps/api
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro na compilação"
    exit 1
fi

echo "🔄 Reiniciando container da API..."
cd /opt/voalive
docker-compose restart reservasegura-api

echo "⏳ Aguardando API inicializar..."
sleep 10

echo "🏥 Verificando saúde da API..."
docker ps | grep voalive-reservasegura-api

echo ""
echo "✅ Deploy concluído!"
ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ Erro durante deploy no servidor"
    exit 1
fi

echo ""
echo "🧹 Passo 4: Limpando arquivos temporários..."
rm -f voalive-register-booking.tar.gz

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY COMPLETO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Próximos passos:"
echo "   1. Execute: node test-cadastro-e-busca-reservas.js"
echo "   2. Verifique se as reservas foram cadastradas e encontradas"
echo ""
