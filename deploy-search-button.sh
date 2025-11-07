#!/bin/bash
set -e

echo "🚀 Deploy: Botão de Busca Automática de Reservas"
echo "=============================================="
echo ""

# Configurações
SERVER="root@159.89.80.179"
DEPLOY_DIR="/opt/voalive"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${DEPLOY_DIR}/backups"

echo "📦 Criando pacote de deploy..."
tar -czf voalive-search-booking-button.tar.gz \
  apps/web/src/app/reservas/page.tsx

echo ""
echo "📤 Enviando para o servidor..."
scp voalive-search-booking-button.tar.gz ${SERVER}:/tmp/

echo ""
echo "🔧 Executando deploy no servidor..."
ssh ${SERVER} << 'ENDSSH'
set -e

cd /opt/voalive

# Backup
echo "💾 Criando backup..."
mkdir -p backups
cp apps/web/src/app/reservas/page.tsx backups/reservas-page-backup-$(date +%Y%m%d_%H%M%S).tsx || true

# Extrair arquivos
echo "📂 Extraindo arquivos..."
tar -xzf /tmp/voalive-search-booking-button.tar.gz

# Rebuild do web
echo "🔨 Rebuilding web app..."
cd /opt/voalive
docker-compose -f docker-compose.prod.yml build voalive-web

# Restart do container
echo "♻️  Reiniciando web container..."
docker-compose -f docker-compose.prod.yml up -d voalive-web

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🧪 Testando..."
sleep 5
curl -f http://localhost:3003 > /dev/null && echo "✅ Web respondendo" || echo "❌ Erro ao acessar web"

ENDSSH

echo ""
echo "=============================================="
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "=============================================="
echo ""
echo "🌐 Acesse: https://www.reservasegura.pro/reservas"
echo ""
echo "📝 O que foi alterado:"
echo "  ✅ Adicionado botão 'Buscar Reserva Externa' na página /reservas"
echo "  ✅ Integração com modal de busca que auto-cadastra reservas"
echo "  ✅ Fluxo: Buscar → Encontrar → Auto-cadastrar → Listar"
echo ""
echo "🧪 Como testar:"
echo "  1. Acesse https://www.reservasegura.pro/reservas"
echo "  2. Clique em 'Buscar Reserva Externa'"
echo "  3. Preencha: Localizador: PDCDX, Sobrenome: DINIZ, Origem: SLZ"
echo "  4. A reserva será buscada e automaticamente cadastrada"
echo ""
