#!/bin/bash

# =============================================================================
# DEPLOY - Sistema de Autenticação e Login
# =============================================================================
# Servidor: 159.89.80.179
# Domínio: www.reservasegura.pro
# Data: $(date +%Y-%m-%d)
# =============================================================================

set -e  # Exit on error

SERVER="root@159.89.80.179"
DEPLOY_DIR="/opt/voalive"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/voalive-backups"
PACKAGE="voalive-auth-login-deploy.tar.gz"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 DEPLOY - Sistema de Autenticação e Login"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Deploy inclui:"
echo "   ✓ Página de login redesenhada (apps/web/src/app/login/page.tsx)"
echo "   ✓ Logotipo Reserva Segura (apps/web/public/logo.png)"
echo "   ✓ Controllers de autenticação (apps/api/src/controllers/auth.controller.ts)"
echo "   ✓ Rotas de autenticação (apps/api/src/routes/auth.routes.ts)"
echo "   ✓ Middleware de autenticação (apps/api/src/middlewares/auth.middleware.ts)"
echo "   ✓ Scripts de criação de admin (create-admin.js, update-admin-role.js)"
echo ""

# =============================================================================
# PASSO 1: Verificar se o pacote existe
# =============================================================================
if [ ! -f "$PACKAGE" ]; then
    echo "❌ Erro: Pacote $PACKAGE não encontrado!"
    echo "Execute: tar -czf $PACKAGE apps/web/src/app/login/ apps/api/src/controllers/auth.controller.ts ..."
    exit 1
fi

echo "✅ Pacote encontrado: $(ls -lh $PACKAGE | awk '{print $5}')"
echo ""

# =============================================================================
# PASSO 2: Upload do pacote
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 PASSO 1: Fazendo upload do pacote..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

scp $PACKAGE $SERVER:/tmp/
echo "✅ Upload concluído!"
echo ""

# =============================================================================
# PASSO 3: Backup e extração
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 PASSO 2: Backup e extração dos arquivos..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << ENDSSH
# Criar backup
mkdir -p $BACKUP_DIR
cd $DEPLOY_DIR

echo "📦 Criando backup dos arquivos atuais..."
tar -czf $BACKUP_DIR/auth-backup-$TIMESTAMP.tar.gz \
    apps/web/src/app/login/ \
    apps/api/src/controllers/auth.controller.ts \
    apps/api/src/routes/auth.routes.ts \
    apps/api/src/middlewares/auth.middleware.ts \
    2>/dev/null || echo "⚠️  Alguns arquivos não existiam (normal em primeiro deploy)"

echo "✅ Backup criado!"

# Extrair novos arquivos
echo "📦 Extraindo novos arquivos..."
cd $DEPLOY_DIR
tar -xzf /tmp/$PACKAGE

echo "✅ Arquivos extraídos!"
ls -la apps/web/src/app/login/
ls -la create-admin.js update-admin-role.js

# Remover pacote temporário
rm /tmp/$PACKAGE
ENDSSH

echo ""

# =============================================================================
# PASSO 4: Rebuild do Web App
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 PASSO 3: Rebuild do Web App..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << ENDSSH
cd $DEPLOY_DIR/apps/web

echo "🔨 Instalando dependências (se necessário)..."
npm install --production=false

echo "🔨 Building Web App com variáveis de produção..."
NEXT_PUBLIC_API_URL=https://www.reservasegura.pro npm run build

echo "✅ Build concluído!"
ENDSSH

echo ""

# =============================================================================
# PASSO 5: Restart do container Web
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 PASSO 4: Reiniciando container Web..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << ENDSSH
cd $DEPLOY_DIR

echo "🛑 Parando container Web..."
docker-compose -f docker-compose.prod.yml stop web

echo "🔨 Rebuild da imagem Web..."
docker-compose -f docker-compose.prod.yml build web

echo "🚀 Iniciando container Web..."
docker-compose -f docker-compose.prod.yml up -d web

echo "⏳ Aguardando Web iniciar (15 segundos)..."
sleep 15

echo "✅ Container Web reiniciado!"
docker-compose -f docker-compose.prod.yml ps | grep web
ENDSSH

echo ""

# =============================================================================
# PASSO 6: Verificar saúde dos serviços
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 PASSO 5: Verificando saúde dos serviços..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << ENDSSH
echo "📊 Status dos containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|web|api"

echo ""
echo "🌐 Testando API Auth endpoint..."
curl -s http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  | head -5

echo ""
echo "🌐 Testando Web (página inicial)..."
curl -s http://localhost:3000 -I | head -5

echo ""
echo "📋 Últimas linhas do log do Web:"
docker logs \$(docker ps -qf "name=web") --tail 15
ENDSSH

echo ""

# =============================================================================
# PASSO 7: Instruções para criar usuário admin
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👤 PASSO 6: Criar Usuário Administrador"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para criar o usuário administrador, execute:"
echo ""
echo "ssh $SERVER"
echo "cd $DEPLOY_DIR"
echo "node create-admin.js"
echo ""
echo "Ou via API (mais rápido):"
echo ""
echo "ssh $SERVER 'curl -X POST http://localhost:4000/api/auth/register \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '"'{"email":"admin@reservasegura.pro","password":"Admin@2024!Secure","name":"Administrador"}'"''"
echo ""
echo "Depois, atualize a role para ADMIN:"
echo "ssh $SERVER 'cd $DEPLOY_DIR && node update-admin-role.js'"
echo ""

# =============================================================================
# DEPLOY CONCLUÍDO
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URLs de Produção:"
echo "   Login: https://www.reservasegura.pro/login"
echo "   Dashboard: https://www.reservasegura.pro/dashboard"
echo "   API Auth: https://www.reservasegura.pro/api/auth/login"
echo ""
echo "🎨 Recursos implementados:"
echo "   ✓ Página de login profissional"
echo "   ✓ Logotipo Reserva Segura customizado"
echo "   ✓ Design responsivo com cores corporativas"
echo "   ✓ Autenticação JWT completa"
echo "   ✓ Redirecionamento automático para dashboard"
echo "   ✓ Scripts de criação de usuário admin"
echo ""
echo "📦 Backup criado em:"
echo "   $BACKUP_DIR/auth-backup-$TIMESTAMP.tar.gz"
echo ""
echo "🧪 Para testar o login:"
echo "   1. Acesse: https://www.reservasegura.pro/login"
echo "   2. Email: admin@reservasegura.pro"
echo "   3. Senha: Admin@2024!Secure"
echo ""
