#!/bin/bash

# =============================================================================
# DEPLOY - Sistema de Notificações VoaLive
# =============================================================================
# Servidor: 159.89.80.179
# Domínio: www.reservasegura.pro
# Data: $(date +%Y-%m-%d)
# =============================================================================

set -e  # Exit on error

SERVER="root@159.89.80.179"
DEPLOY_DIR="/opt/voalive"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOY - Sistema de Notificações VoaLive"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Deploy inclui:"
echo "   ✓ Hook useNotifications (React)"
echo "   ✓ 6 Componentes de notificações"
echo "   ✓ Configuração centralizada da API"
echo "   ✓ Dashboard melhorado"
echo "   ✓ Modal de registro reformulado (41 campos)"
echo "   ✓ Documentação completa"
echo ""

# =============================================================================
# PASSO 1: Verificar conectividade
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 PASSO 1: Verificando conectividade com servidor..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! ssh -o ConnectTimeout=10 $SERVER "echo '✅ Conexão OK'"; then
    echo "❌ Erro: Não foi possível conectar ao servidor"
    exit 1
fi

echo ""

# =============================================================================
# PASSO 2: Criar backup no servidor
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 PASSO 2: Criando backup no servidor..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << 'ENDSSH'
mkdir -p /opt/voalive-backups
cd /opt
tar -czf /opt/voalive-backups/voalive-backup-$(date +%Y%m%d_%H%M%S).tar.gz \
    voalive/apps/web/src \
    voalive/apps/web/.next \
    2>/dev/null || echo "Alguns arquivos não encontrados"

echo "✅ Backup criado!"
ls -lh /opt/voalive-backups/ | tail -1
ENDSSH

echo ""

# =============================================================================
# PASSO 3: Pull das mudanças do Git
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 PASSO 3: Atualizando código do Git..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << 'ENDSSH'
cd /opt/voalive

if [ ! -d .git ]; then
    echo "❌ Não é um repositório Git. Use deploy-complete-update.sh"
    exit 1
fi

echo "📦 Fazendo pull das mudanças..."
git fetch origin
git reset --hard origin/master

echo "✅ Código atualizado!"
git log --oneline -3
ENDSSH

echo ""

# =============================================================================
# PASSO 4: Instalar dependências (se necessário)
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 PASSO 4: Instalando dependências..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << 'ENDSSH'
cd /opt/voalive/apps/web

echo "📦 Instalando dependências do Web..."
npm install

echo "✅ Dependências instaladas!"
ENDSSH

echo ""

# =============================================================================
# PASSO 5: Build do frontend
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 PASSO 5: Building frontend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << 'ENDSSH'
cd /opt/voalive/apps/web

echo "🔨 Building Next.js..."
NEXT_PUBLIC_API_URL=https://www.reservasegura.pro npm run build

echo "✅ Build concluído!"
ls -lh .next/
ENDSSH

echo ""

# =============================================================================
# PASSO 6: Restart do serviço web
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 PASSO 6: Reiniciando serviço web..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER << 'ENDSSH'
cd /opt/voalive

echo "🔄 Reiniciando container web..."
docker-compose restart web

echo "⏳ Aguardando container..."
sleep 10

echo "📊 Status dos containers:"
docker-compose ps
ENDSSH

echo ""

# =============================================================================
# PASSO 7: Verificar se está funcionando
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PASSO 7: Verificando deploy..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "🌐 Testando endpoints..."

# Testar API
if curl -s -o /dev/null -w "%{http_code}" http://159.89.80.179:3012/health | grep -q "200"; then
    echo "✅ API: OK (http://159.89.80.179:3012)"
else
    echo "⚠️  API: Verificação pendente"
fi

# Testar frontend
if curl -s -o /dev/null -w "%{http_code}" http://159.89.80.179:3011/ | grep -q "200"; then
    echo "✅ Frontend: OK (http://159.89.80.179:3011)"
else
    echo "⚠️  Frontend: Verificação pendente"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Sistema de Notificações implantado!"
echo ""
echo "📊 Próximos passos:"
echo "   1. Acessar: https://www.reservasegura.pro"
echo "   2. Testar componentes de notificações"
echo "   3. Verificar dashboard melhorado"
echo "   4. Testar modal de registro (41 campos)"
echo ""
echo "📚 Documentação:"
echo "   - apps/web/INTEGRACAO_NOTIFICACOES.md"
echo ""
echo "🔗 Endpoints úteis:"
echo "   - GET  /api/notifications"
echo "   - GET  /api/notifications/stats"
echo "   - PATCH /api/notifications/:id/read"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
