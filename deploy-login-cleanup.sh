#!/bin/bash
# Deploy Login Page Cleanup to Production
# Server: 159.89.80.179 (www.reservasegura.pro)

set -e

echo "======================================"
echo "🚀 DEPLOY - Login Page Cleanup"
echo "======================================"
echo ""

# Create temporary deployment directory
DEPLOY_DIR="login-cleanup-deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy updated login page
echo "📦 Copiando página de login atualizada..."
mkdir -p $DEPLOY_DIR/apps/web/src/app/login
cp apps/web/src/app/login/page.tsx $DEPLOY_DIR/apps/web/src/app/login/

# Create tarball
echo "📦 Criando tarball..."
tar -czf login-cleanup-deploy.tar.gz -C $DEPLOY_DIR .

# Upload to server
echo "⬆️  Enviando para servidor..."
scp login-cleanup-deploy.tar.gz root@159.89.80.179:/tmp/

# Execute deployment on server
echo "🔧 Executando deploy no servidor..."
ssh root@159.89.80.179 << 'ENDSSH'

cd /opt/voalive

echo "✅ Fazendo backup da página de login atual..."
BACKUP_DIR="backups/login-cleanup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR
cp apps/web/src/app/login/page.tsx $BACKUP_DIR/ 2>/dev/null || true

echo "✅ Extraindo arquivo atualizado..."
tar -xzf /tmp/login-cleanup-deploy.tar.gz -C /opt/voalive/

echo "✅ Reconstruindo e reiniciando container web..."
docker-compose -f docker-compose.prod.yml build reservasegura-web
docker-compose -f docker-compose.prod.yml up -d reservasegura-web

echo ""
echo "⏳ Aguardando container iniciar..."
sleep 10

echo ""
echo "✅ Verificando status do container..."
docker ps --filter "name=reservasegura-web" --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "✅ Deploy concluído!"

ENDSSH

echo ""
echo "======================================"
echo "✅ DEPLOY FINALIZADO COM SUCESSO!"
echo "======================================"
echo ""
echo "📝 Mudanças aplicadas:"
echo "  - Removido: 'Acesso Administrativo'"
echo "  - Removido: 'Faça login para gerenciar o sistema'"
echo "  - Removido: 'Viaje com Confiança'"
echo "  - Removido: 'VIAJE COM CONFIANÇA' (painel direito)"
echo ""
echo "🔗 URL:"
echo "  - Login: https://www.reservasegura.pro/login"
echo ""
echo "🧪 Próximo passo:"
echo "  Acesse https://www.reservasegura.pro/login e verifique a página limpa"
echo ""

# Cleanup
rm -rf $DEPLOY_DIR
rm -f login-cleanup-deploy.tar.gz

echo "🎉 Deploy completo!"
