#!/bin/bash

echo "🚀 Deploy: Simplificação do Modal de Busca de Reserva"
echo "=================================================="

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVER="root@159.89.80.179"
REMOTE_DIR="/opt/voalive"

echo -e "${BLUE}📦 Criando pacote de atualização...${NC}"
tar -czf voalive-simplify-search.tar.gz \
  apps/web/src/components/dashboard/flight-search-modal.tsx

if [ ! -f "voalive-simplify-search.tar.gz" ]; then
  echo "❌ Erro ao criar arquivo tar.gz"
  exit 1
fi

echo -e "${GREEN}✅ Pacote criado${NC}"

echo -e "${BLUE}📤 Enviando para o servidor...${NC}"
scp voalive-simplify-search.tar.gz $SERVER:/tmp/

echo -e "${BLUE}🔧 Aplicando atualização no servidor...${NC}"
ssh $SERVER << 'ENDSSH'
cd /opt/voalive

# Backup
echo "📦 Criando backup..."
cp apps/web/src/components/dashboard/flight-search-modal.tsx \
   apps/web/src/components/dashboard/flight-search-modal.tsx.backup-$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Extrair
echo "📂 Extraindo arquivos..."
tar -xzf /tmp/voalive-simplify-search.tar.gz

# Build
echo "🏗️ Fazendo build do frontend..."
cd apps/web
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build concluído com sucesso"
else
  echo "❌ Erro no build"
  exit 1
fi

# Restart container
cd /opt/voalive
echo "🔄 Reiniciando container web..."
docker-compose -f docker-compose.prod.yml up -d reservasegura-web

sleep 10

# Verificar
WEB_IP=$(docker inspect voalive-reservasegura-web-1 --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}")
echo "🌐 Web IP: $WEB_IP"

# Atualizar nginx
sed -i "s|proxy_pass http://172.18.0.[0-9]*:3003|proxy_pass http://$WEB_IP:3003|g" /etc/nginx/sites-available/reservasegura
nginx -s reload

echo "✅ Deploy concluído!"

# Status
docker ps | grep reservasegura
ENDSSH

echo -e "${GREEN}🎉 Deploy concluído com sucesso!${NC}"
echo ""
echo "🔗 Teste em: https://www.reservasegura.pro/dashboard"
