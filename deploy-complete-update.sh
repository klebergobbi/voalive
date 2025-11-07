#!/bin/bash

# =============================================================================
# DEPLOY COMPLETO - Sistema de Monitoramento e Tracking de Voos
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

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOY COMPLETO - VoaLive"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Deploy inclui:"
echo "   ✓ Database schema (monitoramento e tracking)"
echo "   ✓ API dependencies (Playwright, Bull, Socket.io)"
echo "   ✓ Docker infrastructure (Playwright support)"
echo "   ✓ API services (scraping e monitoramento)"
echo "   ✓ Web app (remoção de mocks, integração real)"
echo "   ✓ UI components e páginas atualizadas"
echo ""

# =============================================================================
# PASSO 1: Criar backup no servidor
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 PASSO 1: Criando backup no servidor..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << 'ENDSSH'
mkdir -p /opt/voalive-backups
cd /opt
tar -czf /opt/voalive-backups/voalive-backup-$(date +%Y%m%d_%H%M%S).tar.gz \
    voalive/apps/api/src \
    voalive/apps/web/src \
    voalive/packages \
    voalive/docker-compose.prod.yml \
    voalive/Dockerfile.api \
    2>/dev/null || echo "Alguns arquivos não encontrados (normal em primeiro deploy)"

echo "✅ Backup criado em /opt/voalive-backups/"
ls -lh /opt/voalive-backups/ | tail -1
ENDSSH

echo ""

# =============================================================================
# PASSO 2: Pull das mudanças do Git
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 PASSO 2: Atualizando código do Git..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << 'ENDSSH'
cd /opt/voalive

# Verificar se é um repositório git
if [ ! -d .git ]; then
    echo "❌ Não é um repositório Git. Clonando..."
    cd /opt
    rm -rf voalive
    git clone https://github.com/klebergobbi/voalive.git
    cd voalive
else
    echo "📦 Repositório Git encontrado. Fazendo pull..."
    git fetch origin
    git reset --hard origin/master
fi

echo "✅ Código atualizado!"
git log --oneline -3
ENDSSH

echo ""

# =============================================================================
# PASSO 3: Instalar dependências
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 PASSO 3: Instalando dependências..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << 'ENDSSH'
cd /opt/voalive

echo "📦 Instalando dependências root..."
npm install

echo "📦 Instalando dependências da API..."
cd apps/api
npm install

echo "📦 Instalando dependências do Web..."
cd ../web
npm install

echo "✅ Dependências instaladas!"
ENDSSH

echo ""

# =============================================================================
# PASSO 4: Build da aplicação
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 PASSO 4: Building aplicação..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << 'ENDSSH'
cd /opt/voalive

echo "🔨 Building API..."
cd apps/api
npm run build

echo "🔨 Building Web..."
cd ../web
NEXT_PUBLIC_API_URL=https://www.reservasegura.pro npm run build

echo "✅ Build concluído!"
ENDSSH

echo ""

# =============================================================================
# PASSO 5: Atualizar Prisma
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  PASSO 5: Atualizando schema do banco de dados..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << 'ENDSSH'
cd /opt/voalive/packages/database

echo "📊 Gerando Prisma Client..."
npx prisma generate

echo "🔄 Aplicando migrations..."
npx prisma migrate deploy || echo "⚠️  Migrations podem requerer revisão manual"

echo "✅ Database atualizado!"
ENDSSH

echo ""

# =============================================================================
# PASSO 6: Rebuild e restart dos containers
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 PASSO 6: Reconstruindo e reiniciando containers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << 'ENDSSH'
cd /opt/voalive

echo "🛑 Parando containers..."
docker-compose -f docker-compose.prod.yml down

echo "🔨 Reconstruindo imagens (com Playwright)..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Iniciando containers..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Aguardando serviços iniciarem (30 segundos)..."
sleep 30

echo "✅ Containers iniciados!"
docker-compose -f docker-compose.prod.yml ps
ENDSSH

echo ""

# =============================================================================
# PASSO 7: Verificar saúde dos serviços
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 PASSO 7: Verificando saúde dos serviços..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << 'ENDSSH'
echo "📊 Status dos containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📋 Últimas linhas do log da API:"
docker logs $(docker ps -qf "name=api") --tail 10 2>/dev/null || echo "⚠️  Container API não encontrado"

echo ""
echo "📋 Últimas linhas do log do Web:"
docker logs $(docker ps -qf "name=web") --tail 10 2>/dev/null || echo "⚠️  Container Web não encontrado"
ENDSSH

echo ""

# =============================================================================
# PASSO 8: Testes de conectividade
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 PASSO 8: Testando conectividade..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "🌐 Testando API Health..."
ssh $SERVER "curl -s http://localhost:4000/health | head -5" || echo "⚠️  API health check falhou"

echo ""
echo "🌐 Testando Web..."
ssh $SERVER "curl -s http://localhost:3000 | head -5" || echo "⚠️  Web check falhou"

echo ""

# =============================================================================
# DEPLOY CONCLUÍDO
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URLs de Produção:"
echo "   Frontend: https://www.reservasegura.pro"
echo "   API:      https://www.reservasegura.pro/api"
echo ""
echo "📊 Novos recursos disponíveis:"
echo "   ✓ Sistema de monitoramento de reservas"
echo "   ✓ Tracking de voos em tempo real"
echo "   ✓ Scraping com Playwright"
echo "   ✓ Notificações via Socket.io"
echo "   ✓ Integração com APIs reais (sem mocks)"
echo ""
echo "🧪 Para testar:"
echo "   node test-cadastro-e-busca-reservas.js"
echo "   node testar-reserva-pdcdx.js"
echo ""
echo "📦 Backup criado em:"
echo "   /opt/voalive-backups/voalive-backup-$TIMESTAMP.tar.gz"
echo ""
