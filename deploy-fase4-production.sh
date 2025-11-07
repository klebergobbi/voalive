#!/bin/bash

echo "======================================"
echo "🚀 DEPLOY VOALIVE - FASE 4"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variables
SERVER="root@159.89.80.179"
PROJECT_DIR="/opt/voalive"
BACKUP_DIR="/opt/voalive-backup-$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}📦 Step 1: Creating backup${NC}"
ssh $SERVER "mkdir -p $BACKUP_DIR && cp -r $PROJECT_DIR/apps $BACKUP_DIR/ && echo '✅ Backup created at $BACKUP_DIR'"

echo ""
echo -e "${BLUE}📤 Step 2: Syncing files to server${NC}"

# Sync apps directory (excluding node_modules and build artifacts)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'dist' \
  --exclude 'build' \
  --exclude '.turbo' \
  --exclude 'coverage' \
  ./apps/ $SERVER:$PROJECT_DIR/apps/

# Sync packages directory
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dist' \
  ./packages/ $SERVER:$PROJECT_DIR/packages/

# Sync documentation files
rsync -avz --progress \
  ./FASE*.md $SERVER:$PROJECT_DIR/ 2>/dev/null || echo "No FASE files to sync"

echo ""
echo -e "${BLUE}🔧 Step 3: Installing dependencies${NC}"
ssh $SERVER "cd $PROJECT_DIR && npm install"

echo ""
echo -e "${BLUE}🏗️  Step 4: Building applications${NC}"

# Build packages first
ssh $SERVER "cd $PROJECT_DIR/packages/ui && npm install && npm run build"

# Build API
ssh $SERVER "cd $PROJECT_DIR/apps/api && npm install && npm run build"

# Build Web
ssh $SERVER "cd $PROJECT_DIR/apps/web && npm install && npm run build"

echo ""
echo -e "${BLUE}🐳 Step 5: Restarting Docker containers${NC}"

# Stop containers
ssh $SERVER "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml down"

# Remove old images to force rebuild
ssh $SERVER "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml build --no-cache reservasegura-api reservasegura-web"

# Start containers
ssh $SERVER "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml up -d"

echo ""
echo -e "${BLUE}⏳ Step 6: Waiting for containers to be healthy${NC}"
sleep 15

echo ""
echo -e "${BLUE}🔍 Step 7: Checking container status${NC}"
ssh $SERVER "docker ps --filter name=voalive --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

echo ""
echo -e "${BLUE}🌐 Step 8: Testing endpoints${NC}"

# Test API
echo -n "Testing API health... "
API_HEALTH=$(ssh $SERVER "curl -s http://localhost:4000/health 2>/dev/null")
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ API is responding${NC}"
else
  echo -e "${RED}❌ API is not responding${NC}"
fi

# Test Web
echo -n "Testing Web frontend... "
WEB_TEST=$(ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:3003 2>/dev/null")
if [ "$WEB_TEST" = "200" ] || [ "$WEB_TEST" = "304" ]; then
  echo -e "${GREEN}✅ Web is responding (HTTP $WEB_TEST)${NC}"
else
  echo -e "${RED}❌ Web is not responding (HTTP $WEB_TEST)${NC}"
fi

echo ""
echo -e "${BLUE}🔄 Step 9: Updating Nginx configuration${NC}"

# Get container IPs
API_IP=$(ssh $SERVER "docker inspect voalive-reservasegura-api-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'")
WEB_IP=$(ssh $SERVER "docker inspect voalive-reservasegura-web-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'")

echo "API Container IP: $API_IP"
echo "Web Container IP: $WEB_IP"

# Update Nginx config
ssh $SERVER "sed -i 's|proxy_pass http://172.18.0.[0-9]*:4000|proxy_pass http://$API_IP:4000|g' /etc/nginx/sites-available/reservasegura"
ssh $SERVER "sed -i 's|proxy_pass http://172.18.0.[0-9]*:3003|proxy_pass http://$WEB_IP:3003|g' /etc/nginx/sites-available/reservasegura"

# Test and reload Nginx
ssh $SERVER "nginx -t && nginx -s reload && echo '✅ Nginx reloaded successfully'"

echo ""
echo -e "${BLUE}📊 Step 10: Final health check${NC}"

# Wait a bit for everything to stabilize
sleep 5

# Test public URLs
echo -n "Testing https://www.reservasegura.pro/api/health... "
PUBLIC_API=$(curl -s -o /dev/null -w '%{http_code}' https://www.reservasegura.pro/api/health 2>/dev/null)
if [ "$PUBLIC_API" = "200" ]; then
  echo -e "${GREEN}✅ Public API is accessible${NC}"
else
  echo -e "${YELLOW}⚠️  Public API returned HTTP $PUBLIC_API${NC}"
fi

echo -n "Testing https://www.reservasegura.pro... "
PUBLIC_WEB=$(curl -s -o /dev/null -w '%{http_code}' https://www.reservasegura.pro 2>/dev/null)
if [ "$PUBLIC_WEB" = "200" ] || [ "$PUBLIC_WEB" = "304" ]; then
  echo -e "${GREEN}✅ Public Web is accessible${NC}"
else
  echo -e "${YELLOW}⚠️  Public Web returned HTTP $PUBLIC_WEB${NC}"
fi

echo ""
echo -e "${BLUE}📝 Step 11: Container logs${NC}"
echo "Recent logs from API:"
ssh $SERVER "docker logs --tail 20 voalive-reservasegura-api-1"

echo ""
echo "Recent logs from Web:"
ssh $SERVER "docker logs --tail 20 voalive-reservasegura-web-1"

echo ""
echo "======================================"
echo -e "${GREEN}✅ DEPLOY COMPLETED!${NC}"
echo "======================================"
echo ""
echo "🌐 Access your application:"
echo "   Web: https://www.reservasegura.pro"
echo "   API: https://www.reservasegura.pro/api"
echo ""
echo "📊 Monitoring:"
echo "   Grafana: http://159.89.80.179:3000"
echo "   Prometheus: http://159.89.80.179:9090"
echo ""
echo "🔧 Useful commands:"
echo "   View logs: ssh $SERVER 'docker logs -f voalive-reservasegura-web-1'"
echo "   Restart: ssh $SERVER 'cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml restart'"
echo "   Status: ssh $SERVER 'docker ps'"
echo ""
echo "📦 Backup location: $BACKUP_DIR"
echo ""
