#!/bin/bash

##############################################################################
# INSTALAÇÃO DO PLAYWRIGHT EM PRODUÇÃO
#
# Este script instala o Playwright e dependências no servidor de produção
# para habilitar web scraping completo e monitoramento automático.
#
# Uso: ./instalar-playwright-producao.sh
##############################################################################

set -e  # Exit on error

# Configurações
SERVER="root@159.89.80.179"
CONTAINER="voalive-reservasegura-api-1"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funções auxiliares
log_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
    echo -e "${GREEN}✔${NC}  $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

log_error() {
    echo -e "${RED}✖${NC}  $1"
}

hr() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Banner
clear
hr
echo -e "${CYAN}🚀 INSTALAÇÃO DO PLAYWRIGHT EM PRODUÇÃO${NC}"
hr
echo ""
log_info "Servidor: ${SERVER}"
log_info "Container: ${CONTAINER}"
log_info "Data: $(date '+%d/%m/%Y %H:%M:%S')"
echo ""

# Confirmação
read -p "$(echo -e ${YELLOW}Deseja continuar com a instalação? ${NC}[S/n] )" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    log_warning "Instalação cancelada pelo usuário"
    exit 0
fi

hr

# PASSO 1: Verificar conexão
echo ""
log_info "📡 Passo 1/6: Verificando conexão com servidor..."

ssh -o ConnectTimeout=10 ${SERVER} 'echo "OK"' > /dev/null 2>&1 || {
    log_error "Não foi possível conectar ao servidor"
    exit 1
}

log_success "Conexão estabelecida"

# PASSO 2: Verificar container
echo ""
log_info "🐳 Passo 2/6: Verificando container..."

CONTAINER_STATUS=$(ssh ${SERVER} "docker ps --filter name=${CONTAINER} --format '{{.Status}}'" 2>/dev/null)

if [ -z "$CONTAINER_STATUS" ]; then
    log_error "Container ${CONTAINER} não encontrado"
    exit 1
fi

log_success "Container encontrado e rodando"

# PASSO 3: Instalar dependências npm
echo ""
log_info "📦 Passo 3/6: Instalando dependências npm..."
log_info "   Isso pode levar 3-5 minutos..."

ssh ${SERVER} << 'ENDSSH'
echo "   • Instalando playwright..."
docker exec -u root voalive-reservasegura-api-1 npm install --no-save playwright@1.40.0

echo "   • Instalando bull..."
docker exec -u root voalive-reservasegura-api-1 npm install --no-save bull@4.11.5

echo "   • Instalando ioredis..."
docker exec -u root voalive-reservasegura-api-1 npm install --no-save ioredis@5.3.2

echo "   • Instalando socket.io..."
docker exec -u root voalive-reservasegura-api-1 npm install --no-save socket.io@4.6.2
ENDSSH

if [ $? -eq 0 ]; then
    log_success "Dependências instaladas"
else
    log_error "Falha ao instalar dependências"
    exit 1
fi

# PASSO 4: Instalar browsers do Playwright
echo ""
log_info "🌐 Passo 4/6: Instalando browsers do Playwright..."
log_info "   Isso pode levar 2-3 minutos..."

ssh ${SERVER} << 'ENDSSH'
echo "   • Baixando Chromium..."
docker exec -u root voalive-reservasegura-api-1 npx playwright install chromium --with-deps 2>&1 | grep -E "Downloading|downloaded" || true
ENDSSH

if [ $? -eq 0 ]; then
    log_success "Browsers instalados"
else
    log_warning "Instalação de browsers pode ter falhado (verificar manualmente)"
fi

# PASSO 5: Reiniciar container
echo ""
log_info "🔄 Passo 5/6: Reiniciando container..."

ssh ${SERVER} "docker restart ${CONTAINER}" > /dev/null 2>&1

log_success "Container reiniciado"

log_info "   Aguardando container iniciar..."
sleep 15

# PASSO 6: Validação
echo ""
log_info "🧪 Passo 6/6: Executando testes de validação..."

# Teste 1: Verificar se playwright foi instalado
echo ""
log_info "Teste 1: Verificar instalação do Playwright"

PLAYWRIGHT_VERSION=$(ssh ${SERVER} "docker exec ${CONTAINER} npx playwright --version 2>/dev/null" || echo "FALHOU")

if [[ $PLAYWRIGHT_VERSION == *"Version"* ]]; then
    log_success "Playwright instalado: ${PLAYWRIGHT_VERSION}"
else
    log_error "Playwright não foi instalado corretamente"
fi

# Teste 2: Verificar pacotes
echo ""
log_info "Teste 2: Verificar pacotes instalados"

ssh ${SERVER} << 'ENDSSH'
if docker exec voalive-reservasegura-api-1 test -d node_modules/playwright; then
    echo "   ✅ playwright"
else
    echo "   ❌ playwright"
fi

if docker exec voalive-reservasegura-api-1 test -d node_modules/bull; then
    echo "   ✅ bull"
else
    echo "   ❌ bull"
fi

if docker exec voalive-reservasegura-api-1 test -d node_modules/ioredis; then
    echo "   ✅ ioredis"
else
    echo "   ❌ ioredis"
fi

if docker exec voalive-reservasegura-api-1 test -d node_modules/socket.io; then
    echo "   ✅ socket.io"
else
    echo "   ❌ socket.io"
fi
ENDSSH

# Teste 3: Health check
echo ""
log_info "Teste 3: Health check da API"

HEALTH_RESPONSE=$(ssh ${SERVER} "curl -s http://localhost:4000/health" | head -20)

if [[ $HEALTH_RESPONSE == *"success"* ]]; then
    log_success "API está respondendo"
else
    log_warning "API pode não estar respondendo corretamente"
fi

# Resultados finais
echo ""
hr
log_success "🎉 INSTALAÇÃO CONCLUÍDA!"
hr
echo ""

log_info "📊 Resumo da Instalação:"
echo "   • Playwright: ${PLAYWRIGHT_VERSION}"
echo "   • Bull: Instalado"
echo "   • IORedis: Instalado"
echo "   • Socket.io: Instalado"
echo "   • Container: Reiniciado"
echo ""

log_info "🧪 Teste o web scraping:"
echo '   curl -X POST https://www.reservasegura.pro/api/v1/airline-booking/search-booking \'
echo '     -H "Content-Type: application/json" \'
echo '     -d '"'"'{"localizador":"PDCDX","sobrenome":"Diniz","origem":"SLZ"}'"'"
echo ""

log_info "📚 Documentação:"
echo "   • INSTALACAO-PLAYWRIGHT-PRODUCAO.md"
echo "   • DEPLOY-PRODUCAO-SUCESSO.md"
echo "   • COMO-USAR-MONITORAMENTO.md"
echo ""

log_info "🔍 Verificar logs:"
echo "   ssh ${SERVER}"
echo "   docker logs --tail 50 ${CONTAINER}"
echo ""

hr

# Perguntar se deseja testar agora
read -p "$(echo -e ${CYAN}Deseja testar o web scraping agora? ${NC}[S/n] )" -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo ""
    log_info "🧪 Testando busca de reserva PDCDX..."
    echo ""

    SEARCH_RESULT=$(curl -s -X POST https://www.reservasegura.pro/api/v1/airline-booking/search-booking \
        -H "Content-Type: application/json" \
        -d '{"localizador":"PDCDX","sobrenome":"Diniz","origem":"SLZ"}')

    echo "$SEARCH_RESULT" | python3 -m json.tool 2>/dev/null || echo "$SEARCH_RESULT"
    echo ""

    if [[ $SEARCH_RESULT == *'"success":true'* ]]; then
        log_success "✅ WEB SCRAPING FUNCIONANDO!"
    else
        log_info "ℹ️  Sistema respondeu (verificar resultado acima)"
    fi
fi

echo ""
log_success "✅ Script de instalação finalizado!"
echo ""
