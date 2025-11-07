#!/bin/bash

################################################################################
# VoaLive - Deploy Simplificado de Produção
# Versão: 2.0 - SEM DADOS MOCKADOS
################################################################################

set -e

SERVER_IP="159.89.80.179"
SERVER_USER="root"
PROJECT_DIR="/opt/voalive"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "═══════════════════════════════════════════════════════════"
echo "  VOALIVE - DEPLOY DE PRODUÇÃO (DADOS REAIS)"
echo "  Servidor: ${SERVER_IP}"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Etapa 1: Preparar Pacote
echo "[1/5] Preparando pacote de deploy..."
TEMP_DIR=$(mktemp -d)

cp -r apps $TEMP_DIR/
cp -r packages $TEMP_DIR/
cp package*.json $TEMP_DIR/
cp turbo.json $TEMP_DIR/
cp tsconfig.json $TEMP_DIR/
cp .env.production $TEMP_DIR/.env
cp docker-compose.prod.yml $TEMP_DIR/docker-compose.yml
cp Dockerfile.* $TEMP_DIR/

[ -d "scripts" ] && cp -r scripts $TEMP_DIR/

DEPLOY_PACKAGE="voalive-prod-${TIMESTAMP}.tar.gz"
tar -czf $DEPLOY_PACKAGE -C $TEMP_DIR .
rm -rf $TEMP_DIR

echo "✅ Pacote criado: $DEPLOY_PACKAGE"

# Etapa 2: Enviar Pacote
echo "[2/5] Enviando pacote para servidor..."
scp -o ConnectTimeout=30 $DEPLOY_PACKAGE ${SERVER_USER}@${SERVER_IP}:/tmp/
echo "✅ Pacote enviado"

# Etapa 3: Extrair no Servidor
echo "[3/5] Extraindo código no servidor..."
ssh -o ConnectTimeout=30 ${SERVER_USER}@${SERVER_IP} "
    mkdir -p ${PROJECT_DIR}
    cd ${PROJECT_DIR}
    docker-compose down 2>/dev/null || true
    tar -xzf /tmp/${DEPLOY_PACKAGE}
    rm /tmp/${DEPLOY_PACKAGE}
    echo '✅ Código extraído'
"

# Etapa 4: Build e Start
echo "[4/5] Iniciando containers..."
ssh -o ConnectTimeout=30 ${SERVER_USER}@${SERVER_IP} "
    cd ${PROJECT_DIR}
    docker-compose build --no-cache reservasegura-api reservasegura-web
    docker-compose up -d
    sleep 20
    echo '✅ Containers iniciados'
"

# Etapa 5: Verificar
echo "[5/5] Verificando deploy..."
ssh -o ConnectTimeout=30 ${SERVER_USER}@${SERVER_IP} "
    cd ${PROJECT_DIR}
    docker-compose ps
    echo ''
    echo '📝 Logs da API:'
    docker-compose logs --tail=15 reservasegura-api
"

# Limpar
rm -f $DEPLOY_PACKAGE

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ DEPLOY CONCLUÍDO!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🌐 Acessos:"
echo "  • Site: https://www.reservasegura.pro"
echo "  • API: https://www.reservasegura.pro/api"
echo ""
echo "📊 Sistema rodando com DADOS REAIS (sem mocks)!"
echo ""
