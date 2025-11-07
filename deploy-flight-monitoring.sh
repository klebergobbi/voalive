#!/bin/bash

echo "╔══════════════════════════════════════════════════════╗"
echo "║   Deploy Flight Monitoring System to Production      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0:32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER="root@159.89.80.179"
REMOTE_PATH="/opt/voalive"
LOCAL_PATH="/c/Projetos/VoaLive"

echo "📦 Preparando arquivos para deploy..."
echo ""

# Create temporary deploy directory
DEPLOY_DIR=$(mktemp -d)
echo "   Diretório temporário: $DEPLOY_DIR"

# Copy only necessary files
echo "   Copiando arquivos do Flight Monitoring System..."
mkdir -p "$DEPLOY_DIR/apps/api/src"

# Flight Monitoring Service files
cp -r "$LOCAL_PATH/apps/api/src/services/flightMonitoring" "$DEPLOY_DIR/apps/api/src/"
cp -r "$LOCAL_PATH/apps/api/src/controllers/flightController.ts" "$DEPLOY_DIR/apps/api/src/"
cp -r "$LOCAL_PATH/apps/api/src/routes/flights.routes.ts" "$DEPLOY_DIR/apps/api/src/routes/"
cp -r "$LOCAL_PATH/apps/api/src/routes/flight-monitoring-cache-routes.ts" "$DEPLOY_DIR/apps/api/src/routes/"
cp -r "$LOCAL_PATH/apps/api/src/websockets" "$DEPLOY_DIR/apps/api/src/"

# Updated index.ts
cp "$LOCAL_PATH/apps/api/src/index.ts" "$DEPLOY_DIR/apps/api/src/"

echo "   ✅ Arquivos copiados"
echo ""

# Create tarball
echo "📦 Criando arquivo tar..."
cd "$DEPLOY_DIR"
tar -czf flight-monitoring-deploy.tar.gz apps/
echo "   ✅ Arquivo criado: flight-monitoring-deploy.tar.gz"
echo ""

# Upload to server
echo "🚀 Fazendo upload para o servidor..."
scp flight-monitoring-deploy.tar.gz $SERVER:/tmp/
echo "   ✅ Upload concluído"
echo ""

# Extract and restart on server
echo "🔄 Extraindo e reiniciando no servidor..."
ssh $SERVER << 'ENDSSH'
  echo "   Extraindo arquivos..."
  cd /opt/voalive
  tar -xzf /tmp/flight-monitoring-deploy.tar.gz

  echo "   Instalando dependências (se necessário)..."
  cd /opt/voalive/apps/api
  npm install --production 2>&1 | grep -E "(added|removed|updated)" || echo "   Dependências já atualizadas"

  echo "   Reiniciando serviço..."
  pm2 restart voalive-api || pm2 start dist/index.js --name voalive-api

  echo "   ✅ Serviço reiniciado"

  # Cleanup
  rm /tmp/flight-monitoring-deploy.tar.gz
ENDSSH

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "📊 Endpoints disponíveis:"
echo "   GET    http://159.89.80.179:4000/api/v2/flights/status"
echo "   POST   http://159.89.80.179:4000/api/v2/flights/monitor"
echo "   WS     ws://159.89.80.179:4000/ws/flights"
echo ""
echo "🧪 Para testar, execute:"
echo "   node test-real-bookings.ts"
echo ""

# Cleanup local temp
rm -rf "$DEPLOY_DIR"
