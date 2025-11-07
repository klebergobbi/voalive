#!/bin/bash

###############################################################################
# Deploy Script - Sistema de Monitoramento de Reservas Aéreas
# ReservaSegura Platform
###############################################################################

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOY DO SISTEMA DE MONITORAMENTO DE RESERVAS AÉREAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Variáveis
SERVER_IP="${SERVER_IP:-159.89.80.179}"
SERVER_USER="${SERVER_USER:-root}"
APP_DIR="/opt/voalive"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$APP_DIR/backups/monitoring_$TIMESTAMP"

echo "📦 Configurações:"
echo "   Servidor: $SERVER_USER@$SERVER_IP"
echo "   Diretório: $APP_DIR"
echo ""

# Passo 1: Instalar dependências localmente
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Passo 1: Instalando dependências..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /c/Projetos/VoaLive

# Instalar dependências novas
npm install --save bullmq axios

# Instalar Playwright browsers
echo "🌐 Instalando navegadores Playwright..."
npx playwright install chromium --with-deps

echo "✅ Dependências instaladas"
echo ""

# Passo 2: Build
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 Passo 2: Compilando aplicação..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd apps/api
npm run build

echo "✅ Build concluído"
echo ""

# Passo 3: Criar pacote de deploy
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Passo 3: Criando pacote de deploy..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /c/Projetos/VoaLive

# Criar diretório temporário
rm -rf /tmp/voalive-monitoring-deploy
mkdir -p /tmp/voalive-monitoring-deploy

# Copiar arquivos necessários
echo "📋 Copiando arquivos..."

# Scrapers
mkdir -p /tmp/voalive-monitoring-deploy/apps/api/src/scrapers
cp -r apps/api/src/scrapers/*.ts /tmp/voalive-monitoring-deploy/apps/api/src/scrapers/ 2>/dev/null || true

# Serviços
mkdir -p /tmp/voalive-monitoring-deploy/apps/api/src/services
cp apps/api/src/services/airline-monitoring.service.ts /tmp/voalive-monitoring-deploy/apps/api/src/services/
cp apps/api/src/services/webhook-notification.service.ts /tmp/voalive-monitoring-deploy/apps/api/src/services/

# Queues
mkdir -p /tmp/voalive-monitoring-deploy/apps/api/src/queues
cp -r apps/api/src/queues/*.ts /tmp/voalive-monitoring-deploy/apps/api/src/queues/

# Routes
mkdir -p /tmp/voalive-monitoring-deploy/apps/api/src/routes
cp apps/api/src/routes/airline-monitoring.routes.ts /tmp/voalive-monitoring-deploy/apps/api/src/routes/

# Utils
mkdir -p /tmp/voalive-monitoring-deploy/apps/api/src/utils
cp apps/api/src/utils/logger.util.ts /tmp/voalive-monitoring-deploy/apps/api/src/utils/

# Package.json
cp apps/api/package.json /tmp/voalive-monitoring-deploy/apps/api/

# Criar tarball
cd /tmp
tar -czf voalive-monitoring-deploy.tar.gz voalive-monitoring-deploy/

echo "✅ Pacote criado: /tmp/voalive-monitoring-deploy.tar.gz"
echo ""

# Passo 4: Upload para servidor
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⬆️  Passo 4: Fazendo upload para servidor..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

scp /tmp/voalive-monitoring-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

echo "✅ Upload concluído"
echo ""

# Passo 5: Deploy no servidor
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Passo 5: Deploy no servidor..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'

set -e

echo "📦 Extraindo arquivos..."
cd /tmp
tar -xzf voalive-monitoring-deploy.tar.gz

echo "📁 Criando backup..."
mkdir -p /opt/voalive/backups
BACKUP_DIR="/opt/voalive/backups/monitoring_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup dos arquivos que serão substituídos
if [ -d "/opt/voalive/apps/api/src/scrapers" ]; then
  cp -r /opt/voalive/apps/api/src/scrapers $BACKUP_DIR/ || true
fi
if [ -d "/opt/voalive/apps/api/src/queues" ]; then
  cp -r /opt/voalive/apps/api/src/queues $BACKUP_DIR/ || true
fi

echo "✅ Backup criado em: $BACKUP_DIR"

echo "📋 Copiando novos arquivos..."
cp -r /tmp/voalive-monitoring-deploy/apps/api/src/* /opt/voalive/apps/api/src/

echo "📦 Instalando novas dependências..."
cd /opt/voalive
npm install bullmq axios --save

# Instalar Playwright
echo "🌐 Instalando Playwright..."
cd /opt/voalive/apps/api
npx playwright install chromium --with-deps

echo "🔨 Compilando TypeScript..."
npm run build

echo "♻️  Reiniciando serviços..."

# Reiniciar API
docker-compose restart api || systemctl restart voalive-api || pm2 restart voalive-api || true

echo "✅ Serviços reiniciados"

# Limpar arquivos temporários
rm -rf /tmp/voalive-monitoring-deploy*

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Próximos passos:"
echo "   1. Verificar logs: docker-compose logs -f api"
echo "   2. Testar health: curl http://localhost:3012/api/health"
echo "   3. Testar monitoring: curl http://localhost:3012/api/monitoring/airlines"
echo ""

ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEPLOY LOCAL CONCLUÍDO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Comandos úteis:"
echo ""
echo "   # Ver logs do servidor"
echo "   ssh $SERVER_USER@$SERVER_IP 'docker-compose -f /opt/voalive/docker-compose.yml logs -f api'"
echo ""
echo "   # Testar sistema"
echo "   curl http://$SERVER_IP:3012/api/health"
echo "   curl http://$SERVER_IP:3012/api/monitoring/airlines"
echo ""
echo "   # Adicionar reserva para monitoramento"
echo '   curl -X POST http://'$SERVER_IP':3012/api/monitoring/bookings \'
echo '     -H "Content-Type: application/json" \'
echo '     -d '"'"'{'
echo '       "pnr": "ABC123",'
echo '       "airline": "LATAM",'
echo '       "lastName": "SILVA",'
echo '       "flightNumber": "LA3090",'
echo '       "departureDate": "2025-12-15T10:00:00Z",'
echo '       "route": "GRU-BSB"'
echo '     }'"'"
echo ""

exit 0
