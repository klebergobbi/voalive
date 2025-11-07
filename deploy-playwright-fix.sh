#!/bin/bash

# ============================================================================
# Deploy VoaLive com Correção do Playwright para Digital Ocean
# ============================================================================
# Servidor: 159.89.80.179 (www.reservasegura.pro)
# Data: $(date +%Y-%m-%d)
# Objetivo: Corrigir instalação do Playwright e fazer deploy completo
# ============================================================================

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
SERVER="root@159.89.80.179"
REMOTE_DIR="/opt/voalive"
BACKUP_DIR="/opt/voalive/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOCAL_PACKAGE="voalive-playwright-fix-${TIMESTAMP}.tar.gz"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}  DEPLOY VOALIVE - CORREÇÃO PLAYWRIGHT${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Servidor:${NC} $SERVER"
echo -e "${YELLOW}Diretório:${NC} $REMOTE_DIR"
echo -e "${YELLOW}Timestamp:${NC} $TIMESTAMP"
echo ""

# ============================================================================
# ETAPA 1: Preparar Arquivos Localmente
# ============================================================================
echo -e "${BLUE}[1/8] Preparando arquivos localmente...${NC}"

# Criar pacote com apenas os arquivos necessários
tar -czf "$LOCAL_PACKAGE" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.tar.gz' \
    Dockerfile.api \
    docker-compose.prod.yml

echo -e "${GREEN}✓ Pacote criado: $LOCAL_PACKAGE${NC}"
ls -lh "$LOCAL_PACKAGE"
echo ""

# ============================================================================
# ETAPA 2: Fazer Backup da Produção Atual
# ============================================================================
echo -e "${BLUE}[2/8] Fazendo backup da produção atual...${NC}"

ssh $SERVER << 'ENDSSH'
set -e
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REMOTE_DIR="/opt/voalive"
BACKUP_DIR="/opt/voalive/backups"

# Criar diretório de backup
mkdir -p $BACKUP_DIR

echo "📦 Fazendo backup do Dockerfile e docker-compose atuais..."
cd $REMOTE_DIR

# Backup dos arquivos de configuração
tar -czf "$BACKUP_DIR/voalive-config-backup-${TIMESTAMP}.tar.gz" \
    Dockerfile.api \
    docker-compose.prod.yml \
    2>/dev/null || echo "Alguns arquivos não existem ainda"

# Backup do banco de dados (se existir)
if docker ps | grep -q postgres; then
    echo "💾 Fazendo backup do banco de dados..."
    docker exec voalive-postgres-1 pg_dump -U reservasegura_user reservasegura > "$BACKUP_DIR/db-backup-${TIMESTAMP}.sql" 2>/dev/null || echo "Backup do DB falhou (normal se não existe)"
fi

echo "✓ Backups salvos em: $BACKUP_DIR"
ls -lh $BACKUP_DIR/ | tail -3

ENDSSH

echo -e "${GREEN}✓ Backup concluído${NC}"
echo ""

# ============================================================================
# ETAPA 3: Enviar Arquivos para o Servidor
# ============================================================================
echo -e "${BLUE}[3/8] Enviando arquivos para o servidor...${NC}"

scp "$LOCAL_PACKAGE" $SERVER:/tmp/

echo -e "${GREEN}✓ Arquivos enviados${NC}"
echo ""

# ============================================================================
# ETAPA 4: Extrair e Preparar no Servidor
# ============================================================================
echo -e "${BLUE}[4/8] Extraindo arquivos no servidor...${NC}"

ssh $SERVER << ENDSSH
set -e
TIMESTAMP=$TIMESTAMP
REMOTE_DIR="/opt/voalive"

cd $REMOTE_DIR

# Extrair arquivos
echo "📦 Extraindo arquivos..."
tar -xzf /tmp/voalive-playwright-fix-${TIMESTAMP}.tar.gz

# Remover pacote temporário
rm /tmp/voalive-playwright-fix-${TIMESTAMP}.tar.gz

echo "✓ Arquivos extraídos"
ls -la Dockerfile.api docker-compose.prod.yml

ENDSSH

echo -e "${GREEN}✓ Arquivos extraídos${NC}"
echo ""

# ============================================================================
# ETAPA 5: Parar Containers Atuais
# ============================================================================
echo -e "${BLUE}[5/8] Parando containers atuais...${NC}"

ssh $SERVER << 'ENDSSH'
set -e
REMOTE_DIR="/opt/voalive"
cd $REMOTE_DIR

echo "🛑 Parando container da API..."
docker-compose -f docker-compose.prod.yml stop reservasegura-api || echo "Container já estava parado"

echo "✓ Containers parados"

ENDSSH

echo -e "${GREEN}✓ Containers parados${NC}"
echo ""

# ============================================================================
# ETAPA 6: Rebuild da Imagem com Playwright
# ============================================================================
echo -e "${BLUE}[6/8] Fazendo rebuild da imagem Docker (pode levar 10-15 minutos)...${NC}"
echo -e "${YELLOW}⏳ Aguarde... Instalando Playwright e todas as dependências...${NC}"
echo ""

ssh $SERVER << 'ENDSSH'
set -e
REMOTE_DIR="/opt/voalive"
cd $REMOTE_DIR

echo "🔨 Iniciando build da imagem..."
echo "   - Instalando dependências do sistema"
echo "   - Instalando Node.js dependencies"
echo "   - Instalando Playwright browsers"
echo "   - Configurando permissões"
echo ""

# Build com --no-cache para garantir fresh install
docker-compose -f docker-compose.prod.yml build --no-cache reservasegura-api 2>&1 | tail -30

echo ""
echo "✓ Build concluído"

ENDSSH

echo -e "${GREEN}✓ Imagem reconstruída com sucesso${NC}"
echo ""

# ============================================================================
# ETAPA 7: Iniciar Containers
# ============================================================================
echo -e "${BLUE}[7/8] Iniciando containers...${NC}"

ssh $SERVER << 'ENDSSH'
set -e
REMOTE_DIR="/opt/voalive"
cd $REMOTE_DIR

echo "🚀 Iniciando containers..."
docker-compose -f docker-compose.prod.yml up -d reservasegura-api

echo "⏳ Aguardando 15 segundos para a API inicializar..."
sleep 15

echo "✓ Containers iniciados"

ENDSSH

echo -e "${GREEN}✓ Containers iniciados${NC}"
echo ""

# ============================================================================
# ETAPA 8: Verificar Saúde da Aplicação
# ============================================================================
echo -e "${BLUE}[8/8] Verificando saúde da aplicação...${NC}"

ssh $SERVER << 'ENDSSH'
set -e

echo "🔍 Verificando status dos containers..."
docker ps | grep reservasegura-api

echo ""
echo "🏥 Testando health endpoint..."
curl -f https://www.reservasegura.pro/api/health || curl -f http://localhost:4000/health

echo ""
echo "📋 Últimas linhas do log:"
docker logs --tail 20 voalive-reservasegura-api-1

ENDSSH

echo ""
echo -e "${GREEN}✓ Verificações concluídas${NC}"
echo ""

# ============================================================================
# SUCESSO!
# ============================================================================
echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}✓✓✓ DEPLOY CONCLUÍDO COM SUCESSO! ✓✓✓${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${YELLOW}📊 Próximos Passos:${NC}"
echo ""
echo "1. Testar Playwright:"
echo "   curl -X POST https://www.reservasegura.pro/api/v1/airline-booking/search-booking \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"localizador\":\"PDCDX\",\"sobrenome\":\"Diniz\",\"origem\":\"SLZ\"}'"
echo ""
echo "2. Ver logs em tempo real:"
echo "   ssh $SERVER 'docker logs -f voalive-reservasegura-api-1'"
echo ""
echo "3. Verificar Playwright instalado:"
echo "   ssh $SERVER 'docker exec voalive-reservasegura-api-1 npx playwright --version'"
echo ""
echo "4. Acessar aplicação:"
echo "   https://www.reservasegura.pro"
echo ""
echo -e "${YELLOW}📦 Backups salvos em:${NC}"
echo "   $SERVER:$BACKUP_DIR/"
echo ""
echo -e "${YELLOW}🗑️  Limpar pacote local:${NC}"
echo "   rm $LOCAL_PACKAGE"
echo ""
echo -e "${BLUE}============================================================================${NC}"
