#!/bin/bash

# Deploy Direto - VoaLive Production (SEM MOCKS)
set -e

SERVER="root@159.89.80.179"
REMOTE_DIR="/opt/voalive"

echo "🚀 VoaLive - Deploy Direto (DADOS REAIS)"
echo "══════════════════════════════════════════"
echo ""

# 1. Sincronizar código
echo "[1/4] Sincronizando código..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '*.log' \
  --exclude '.turbo' \
  --exclude '.next' \
  --exclude 'deploy-*.sh' \
  --exclude '*.tar.gz' \
  apps/ ${SERVER}:${REMOTE_DIR}/apps/

rsync -avz --delete \
  --exclude 'node_modules' \
  packages/ ${SERVER}:${REMOTE_DIR}/packages/

rsync -avz \
  package.json \
  package-lock.json \
  turbo.json \
  tsconfig.json \
  docker-compose.prod.yml \
  Dockerfile.api \
  Dockerfile.web \
  .env.production \
  ${SERVER}:${REMOTE_DIR}/

echo "✅ Código sincronizado"

# 2. Configurar no servidor
echo "[2/4] Configurando servidor..."
ssh ${SERVER} "
  cd ${REMOTE_DIR}
  cp .env.production .env
  cp docker-compose.prod.yml docker-compose.yml
"
echo "✅ Configurado"

# 3. Reiniciar containers
echo "[3/4] Reiniciando containers..."
ssh ${SERVER} "
  cd ${REMOTE_DIR}
  docker-compose down
  docker-compose build --no-cache reservasegura-api reservasegura-web
  docker-compose up -d
  sleep 15
"
echo "✅ Containers reiniciados"

# 4. Verificar
echo "[4/4] Verificando status..."
ssh ${SERVER} "
  cd ${REMOTE_DIR}
  docker-compose ps
  echo ''
  echo '=== Logs API (últimas 10 linhas) ==='
  docker-compose logs --tail=10 reservasegura-api
"

echo ""
echo "══════════════════════════════════════════"
echo "✅ Deploy Concluído!"
echo "══════════════════════════════════════════"
echo ""
echo "🌐 Site: https://www.reservasegura.pro"
echo "📊 DADOS REAIS (Sem mocks)"
echo ""
