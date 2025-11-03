#!/bin/bash
# Deploy Profile Management Feature to Production
# Server: 159.89.80.179 (www.reservasegura.pro)

set -e

echo "======================================"
echo "🚀 DEPLOY - Profile Management Feature"
echo "======================================"
echo ""

# Create temporary deployment directory
DEPLOY_DIR="profile-management-deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy backend files
echo "📦 Copiando arquivos de backend..."
mkdir -p $DEPLOY_DIR/apps/api/src/controllers
mkdir -p $DEPLOY_DIR/apps/api/src/routes

cp apps/api/src/controllers/auth.controller.ts $DEPLOY_DIR/apps/api/src/controllers/
cp apps/api/src/routes/auth.routes.ts $DEPLOY_DIR/apps/api/src/routes/

# Copy frontend files
echo "📦 Copiando arquivos de frontend..."
mkdir -p $DEPLOY_DIR/apps/web/src/app/profile
mkdir -p $DEPLOY_DIR/apps/web/src/app/dashboard
mkdir -p $DEPLOY_DIR/apps/web/src/components/auth

cp apps/web/src/app/profile/page.tsx $DEPLOY_DIR/apps/web/src/app/profile/
cp apps/web/src/app/dashboard/page.tsx $DEPLOY_DIR/apps/web/src/app/dashboard/
cp apps/web/src/components/auth/AuthGuard.tsx $DEPLOY_DIR/apps/web/src/components/auth/

# Create tarball
echo "📦 Criando tarball..."
tar -czf profile-management-deploy.tar.gz -C $DEPLOY_DIR .

# Upload to server
echo "⬆️  Enviando para servidor..."
scp profile-management-deploy.tar.gz root@159.89.80.179:/tmp/

# Execute deployment on server
echo "🔧 Executando deploy no servidor..."
ssh root@159.89.80.179 << 'ENDSSH'

cd /opt/voalive

echo "✅ Fazendo backup dos arquivos atuais..."
BACKUP_DIR="backups/profile-management-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r apps/api/src/controllers/auth.controller.ts $BACKUP_DIR/ 2>/dev/null || true
cp -r apps/api/src/routes/auth.routes.ts $BACKUP_DIR/ 2>/dev/null || true
cp -r apps/web/src/app/dashboard/page.tsx $BACKUP_DIR/ 2>/dev/null || true

echo "✅ Extraindo novos arquivos..."
tar -xzf /tmp/profile-management-deploy.tar.gz -C /opt/voalive/

echo "✅ Reconstruindo e reiniciando containers..."
docker-compose -f docker-compose.prod.yml build reservasegura-api reservasegura-web
docker-compose -f docker-compose.prod.yml up -d reservasegura-api reservasegura-web

echo ""
echo "⏳ Aguardando containers iniciarem..."
sleep 10

echo ""
echo "✅ Verificando status dos containers..."
docker ps --filter "name=reservasegura" --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "✅ Deploy concluído!"

ENDSSH

echo ""
echo "======================================"
echo "✅ DEPLOY FINALIZADO COM SUCESSO!"
echo "======================================"
echo ""
echo "📝 Arquivos deployados:"
echo "  - apps/api/src/controllers/auth.controller.ts (updated)"
echo "  - apps/api/src/routes/auth.routes.ts (updated)"
echo "  - apps/web/src/app/profile/page.tsx (new)"
echo "  - apps/web/src/app/dashboard/page.tsx (updated)"
echo ""
echo "🔗 URLs:"
echo "  - Dashboard: https://www.reservasegura.pro/dashboard"
echo "  - Profile:   https://www.reservasegura.pro/profile"
echo ""
echo "🧪 Próximos passos:"
echo "  1. Testar login em: https://www.reservasegura.pro/login"
echo "  2. Clicar no botão 'Perfil' no dashboard"
echo "  3. Testar atualização de nome/email"
echo "  4. Testar troca de senha"
echo ""

# Cleanup
rm -rf $DEPLOY_DIR
rm -f profile-management-deploy.tar.gz

echo "🎉 Deploy completo!"
