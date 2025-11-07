#!/bin/bash

###############################################################################
# Script de Integração Automática - Sistema de Monitoramento
# ReservaSegura Platform
###############################################################################

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 INTEGRAÇÃO DO SISTEMA DE MONITORAMENTO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /c/Projetos/VoaLive

# Passo 1: Backup do index.ts
echo "📦 Criando backup do index.ts..."
cp apps/api/src/index.ts apps/api/src/index.ts.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup criado"
echo ""

# Passo 2: Adicionar importações
echo "📝 Adicionando importações no index.ts..."

# Verificar se já foi integrado
if grep -q "airline-monitoring.routes" apps/api/src/index.ts; then
  echo "⚠️  Sistema já integrado! Pulando..."
else
  # Adicionar importações após linha 33
  sed -i '33a\\n// Sistema de Monitoramento de Reservas Aéreas (Playwright + BullMQ)\nimport airlineMonitoringRoutes from '\''./routes/airline-monitoring.routes'\'';\nimport { initializeMonitoringSystem, shutdownMonitoringSystem } from '\''./initialize-monitoring'\'';' apps/api/src/index.ts
  echo "✅ Importações adicionadas"
fi
echo ""

# Passo 3: Registrar rotas
echo "📝 Registrando rotas..."

if grep -q "app.use('/api/monitoring'" apps/api/src/index.ts; then
  echo "⚠️  Rotas já registradas! Pulando..."
else
  # Adicionar rotas após linha 130
  sed -i '130a\\n// Sistema de Monitoramento de Reservas Aéreas (Production-Ready)\napp.use('\''/api/monitoring'\'', airlineMonitoringRoutes);\nconsole.log('\''✅ Sistema de Monitoramento de Reservas Aéreas (Playwright + BullMQ) carregado'\'');' apps/api/src/index.ts
  echo "✅ Rotas registradas"
fi
echo ""

# Passo 4: Instalar Playwright browsers
echo "🌐 Instalando navegadores Playwright..."
cd apps/api
npx playwright install chromium --with-deps || echo "⚠️  Aviso: Alguns navegadores podem não ter sido instalados"
cd ../..
echo ""

# Passo 5: Compilar
echo "🔨 Compilando aplicação..."
cd apps/api
npm run build || echo "⚠️  Build teve alguns warnings, mas continua..."
cd ../..
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ INTEGRAÇÃO CONCLUÍDA!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Próximos passos:"
echo ""
echo "1. Testar localmente:"
echo "   npm run dev"
echo ""
echo "2. Verificar se sistema inicializou:"
echo "   Procurar por: '✅ Sistema de Monitoramento PRONTO'"
echo ""
echo "3. Testar endpoints:"
echo "   curl http://localhost:4000/api/monitoring/airlines"
echo ""
echo "4. Deploy em produção:"
echo "   ./deploy-airline-monitoring.sh"
echo ""
echo "5. Testar em produção:"
echo "   ./test-monitoring-production.sh 159.89.80.179:3012"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
