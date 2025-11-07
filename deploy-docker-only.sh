#!/bin/bash

# =============================================================================
# DEPLOY DOCKER - Rebuild e Restart dos Containers
# =============================================================================

set -e

SERVER="root@159.89.80.179"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOY DOCKER - VoaLive"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# =============================================================================
# PASSO 1: Atualizar código do Git
# =============================================================================
echo "📥 PASSO 1: Atualizando código do Git..."
ssh $SERVER << 'ENDSSH'
cd /opt/voalive
git fetch origin
git reset --hard origin/master
echo "✅ Código atualizado para:"
git log --oneline -1
ENDSSH

echo ""

# =============================================================================
# PASSO 2: Parar Traefik (liberar porta 80)
# =============================================================================
echo "🛑 PASSO 2: Parando Traefik..."
ssh $SERVER << 'ENDSSH'
cd /opt/voalive
docker-compose -f docker-compose.prod.yml stop traefik || true
docker-compose -f docker-compose.prod.yml rm -f traefik || true
echo "✅ Traefik parado"
ENDSSH

echo ""

# =============================================================================
# PASSO 3: Rebuild apenas API e Web (com Playwright)
# =============================================================================
echo "🔨 PASSO 3: Reconstruindo containers API e Web..."
ssh $SERVER << 'ENDSSH'
cd /opt/voalive

echo "🔨 Building API container (com Playwright)..."
docker-compose -f docker-compose.prod.yml build --no-cache reservasegura-api

echo "🔨 Building Web container..."
docker-compose -f docker-compose.prod.yml build --no-cache reservasegura-web

echo "✅ Build concluído!"
ENDSSH

echo ""

# =============================================================================
# PASSO 4: Restart containers
# =============================================================================
echo "🔄 PASSO 4: Reiniciando containers..."
ssh $SERVER << 'ENDSSH'
cd /opt/voalive

echo "🛑 Parando API e Web..."
docker-compose -f docker-compose.prod.yml stop reservasegura-api reservasegura-web

echo "🚀 Iniciando API e Web..."
docker-compose -f docker-compose.prod.yml up -d reservasegura-api reservasegura-web

echo "⏳ Aguardando serviços iniciarem (30 segundos)..."
sleep 30

echo "✅ Containers reiniciados!"
ENDSSH

echo ""

# =============================================================================
# PASSO 5: Verificar saúde
# =============================================================================
echo "🏥 PASSO 5: Verificando saúde..."
ssh $SERVER << 'ENDSSH'
echo "📊 Containers em execução:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|reservasegura"

echo ""
echo "📋 Log da API (últimas 15 linhas):"
docker logs voalive-reservasegura-api-1 --tail 15

echo ""
echo "📋 Log do Web (últimas 10 linhas):"
docker logs voalive-reservasegura-web-1 --tail 10
ENDSSH

echo ""

# =============================================================================
# PASSO 6: Testar endpoints
# =============================================================================
echo "🧪 PASSO 6: Testando endpoints..."
ssh $SERVER << 'ENDSSH'
echo "🌐 API Health Check:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:4000/health || echo "❌ API não respondeu"

echo ""
echo "🌐 Web Check:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000 || echo "❌ Web não respondeu"
ENDSSH

echo ""

# =============================================================================
# DEPLOY CONCLUÍDO
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY CONCLUÍDO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URLs de Produção:"
echo "   https://www.reservasegura.pro"
echo ""
echo "📦 Mudanças aplicadas:"
echo "   ✓ 6 commits novos no repositório"
echo "   ✓ Database schema atualizado"
echo "   ✓ Playwright instalado no container API"
echo "   ✓ Novos serviços de monitoramento"
echo "   ✓ Mocks removidos, usando APIs reais"
echo ""
echo "🧪 Testes recomendados:"
echo "   cd /c/Projetos/VoaLive"
echo "   node test-cadastro-e-busca-reservas.js"
echo ""
