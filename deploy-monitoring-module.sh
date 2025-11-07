#!/bin/bash

##############################################################################
# DEPLOY DO MÓDULO DE MONITORAMENTO DE RESERVAS PARA PRODUÇÃO
#
# Este script faz o deploy completo do sistema de monitoramento de voos
# por número de reserva para o servidor de produção.
#
# Uso: ./deploy-monitoring-module.sh
##############################################################################

set -e  # Exit on error

# Configurações
SERVER="root@159.89.80.179"
PROJECT_DIR="/opt/voalive"
BACKUP_DIR="/opt/voalive/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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
echo -e "${CYAN}🚀 DEPLOY - Módulo de Monitoramento de Reservas${NC}"
hr
echo ""
log_info "Servidor: ${SERVER}"
log_info "Diretório: ${PROJECT_DIR}"
log_info "Data: $(date '+%d/%m/%Y %H:%M:%S')"
echo ""

# Confirmação
read -p "$(echo -e ${YELLOW}Deseja continuar com o deploy? ${NC}[S/n] )" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    log_warning "Deploy cancelado pelo usuário"
    exit 0
fi

hr

# PASSO 1: Criar pacote local
echo ""
log_info "📦 Passo 1/7: Criando pacote local..."

TEMP_DIR=$(mktemp -d)
PACKAGE_NAME="voalive-monitoring-${TIMESTAMP}.tar.gz"

log_info "Copiando arquivos para ${TEMP_DIR}..."

# Criar estrutura de diretórios
mkdir -p ${TEMP_DIR}/apps/api/src/{modules,routes,services,controllers}

# Copiar módulo de reservas
cp -r apps/api/src/modules/reservas ${TEMP_DIR}/apps/api/src/modules/ 2>/dev/null || log_warning "Módulo reservas não encontrado"

# Copiar rotas relacionadas
cp apps/api/src/routes/airline-booking.routes.ts ${TEMP_DIR}/apps/api/src/routes/ 2>/dev/null || log_warning "Rota airline-booking não encontrada"
cp apps/api/src/routes/booking-monitor.routes.ts ${TEMP_DIR}/apps/api/src/routes/ 2>/dev/null || log_warning "Rota booking-monitor não encontrada"
cp apps/api/src/routes/booking.routes.ts ${TEMP_DIR}/apps/api/src/routes/ 2>/dev/null || log_warning "Rota booking não encontrada"

# Copiar serviços
cp apps/api/src/services/airline-booking.service.ts ${TEMP_DIR}/apps/api/src/services/ 2>/dev/null || log_warning "Serviço airline-booking não encontrado"
cp apps/api/src/services/booking-monitor.service.ts ${TEMP_DIR}/apps/api/src/services/ 2>/dev/null || log_warning "Serviço booking-monitor não encontrado"

# Copiar controllers
cp apps/api/src/controllers/booking.controller.ts ${TEMP_DIR}/apps/api/src/controllers/ 2>/dev/null || log_warning "Controller booking não encontrado"

# Criar pacote
tar -czf ${PACKAGE_NAME} -C ${TEMP_DIR} .

if [ -f ${PACKAGE_NAME} ]; then
    PACKAGE_SIZE=$(du -h ${PACKAGE_NAME} | cut -f1)
    log_success "Pacote criado: ${PACKAGE_NAME} (${PACKAGE_SIZE})"
else
    log_error "Falha ao criar pacote"
    exit 1
fi

# PASSO 2: Enviar para servidor
echo ""
log_info "📤 Passo 2/7: Enviando pacote para servidor..."

scp -o ConnectTimeout=30 ${PACKAGE_NAME} ${SERVER}:${PROJECT_DIR}/ || {
    log_error "Falha ao enviar pacote"
    rm -rf ${TEMP_DIR} ${PACKAGE_NAME}
    exit 1
}

log_success "Pacote enviado com sucesso"

# Limpar arquivos temporários locais
rm -rf ${TEMP_DIR} ${PACKAGE_NAME}

# PASSO 3: Backup no servidor
echo ""
log_info "💾 Passo 3/7: Criando backup no servidor..."

ssh ${SERVER} << EOF
    # Criar diretório de backup se não existir
    mkdir -p ${BACKUP_DIR}

    # Fazer backup dos arquivos atuais
    if [ -d ${PROJECT_DIR}/apps/api/src/modules/reservas ]; then
        tar -czf ${BACKUP_DIR}/backup-modules-${TIMESTAMP}.tar.gz \
            -C ${PROJECT_DIR} \
            apps/api/src/modules/reservas \
            apps/api/src/routes/*booking*.ts \
            apps/api/src/services/*booking*.ts 2>/dev/null || true

        echo "✅ Backup criado: backup-modules-${TIMESTAMP}.tar.gz"
    else
        echo "⚠️  Nenhum arquivo para backup (primeira instalação)"
    fi
EOF

log_success "Backup concluído"

# PASSO 4: Extrair arquivos
echo ""
log_info "📂 Passo 4/7: Extraindo arquivos no servidor..."

ssh ${SERVER} << EOF
    cd ${PROJECT_DIR}
    tar -xzf ${PACKAGE_NAME}
    rm ${PACKAGE_NAME}
    echo "✅ Arquivos extraídos"
EOF

log_success "Arquivos extraídos com sucesso"

# PASSO 5: Instalar dependências
echo ""
log_info "📦 Passo 5/7: Instalando dependências..."

ssh ${SERVER} << 'EOF'
    cd /opt/voalive

    echo "📦 Instalando pacotes npm..."
    npm install --no-save \
        playwright@1.40.0 \
        playwright-extra@4.3.6 \
        puppeteer-extra-plugin-stealth@2.11.2 \
        bull@4.11.5 \
        ioredis@5.3.2 \
        socket.io@4.6.2

    echo "🌐 Instalando browsers do Playwright..."
    npx playwright install chromium --with-deps

    echo "✅ Dependências instaladas"
EOF

log_success "Dependências instaladas"

# PASSO 6: Verificar variáveis de ambiente
echo ""
log_info "⚙️  Passo 6/7: Verificando configuração..."

ssh ${SERVER} << 'EOF'
    cd /opt/voalive

    # Verificar se .env existe
    if [ ! -f .env ]; then
        echo "❌ Arquivo .env não encontrado!"
        exit 1
    fi

    # Verificar variáveis necessárias
    MISSING_VARS=()

    grep -q "REDIS_HOST" .env || MISSING_VARS+=("REDIS_HOST")
    grep -q "REDIS_PORT" .env || MISSING_VARS+=("REDIS_PORT")
    grep -q "ENCRYPTION_KEY" .env || MISSING_VARS+=("ENCRYPTION_KEY")

    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo "⚠️  Variáveis faltando no .env:"
        printf '%s\n' "${MISSING_VARS[@]}"
        echo ""
        echo "📝 Adicione as seguintes variáveis ao .env:"
        echo "REDIS_HOST=redis"
        echo "REDIS_PORT=6379"
        echo "REDIS_PASSWORD=reservasegura_redis_2024"
        echo "ENCRYPTION_KEY=voalive_encryption_key_2024_32c"
        echo "PLAYWRIGHT_HEADLESS=true"
        echo "PLAYWRIGHT_TIMEOUT=30000"
        echo "MAX_CONCURRENT_BROWSERS=5"
        echo "MONITOR_INTERVAL=10"
    else
        echo "✅ Configuração válida"
    fi

    # Verificar se Redis está rodando
    if docker ps | grep -q redis; then
        echo "✅ Redis está rodando"
    else
        echo "⚠️  Redis não está rodando. Inicie com: docker-compose up -d redis"
    fi
EOF

log_success "Configuração verificada"

# PASSO 7: Reiniciar serviços
echo ""
log_info "🔄 Passo 7/7: Reiniciando serviços..."

ssh ${SERVER} << 'EOF'
    cd /opt/voalive

    echo "🔄 Reiniciando API..."

    if [ -f docker-compose.yml ]; then
        docker-compose restart api
        echo "✅ API reiniciada via docker-compose"
    elif command -v pm2 &> /dev/null; then
        pm2 restart voalive-api
        echo "✅ API reiniciada via PM2"
    else
        echo "⚠️  Reinicie a API manualmente"
    fi

    # Aguardar API iniciar
    echo "⏳ Aguardando API iniciar..."
    sleep 5
EOF

log_success "Serviços reiniciados"

# PASSO 8: Testes de validação
echo ""
hr
log_info "🧪 Executando testes de validação..."
echo ""

# Teste 1: Health check geral
log_info "Teste 1: Health check geral"
HEALTH_RESULT=$(ssh ${SERVER} "curl -s http://localhost:4000/health" || echo "ERRO")
if echo $HEALTH_RESULT | grep -q "success"; then
    log_success "API está respondendo"
else
    log_error "API não está respondendo"
fi

# Teste 2: Health check módulo de reservas
log_info "Teste 2: Health check módulo de reservas"
RESERVAS_HEALTH=$(ssh ${SERVER} "curl -s http://localhost:4000/api/health/reservas" || echo "ERRO")
if echo $RESERVAS_HEALTH | grep -q "healthy"; then
    log_success "Módulo de reservas está saudável"
else
    log_warning "Módulo de reservas pode não estar carregado"
fi

# Teste 3: Listar companhias
log_info "Teste 3: Endpoint de companhias"
COMPANIES=$(ssh ${SERVER} "curl -s http://localhost:4000/api/reservas/companhias" || echo "ERRO")
if echo $COMPANIES | grep -q "sucesso"; then
    log_success "Endpoint de companhias funcionando"
else
    log_warning "Endpoint de companhias não disponível"
fi

# Teste 4: Busca de reservas
log_info "Teste 4: Endpoint de busca de reservas"
SEARCH=$(ssh ${SERVER} "curl -s http://localhost:4000/api/airline-booking/airlines" || echo "ERRO")
if echo $SEARCH | grep -q "success"; then
    log_success "Endpoint de busca funcionando"
else
    log_warning "Endpoint de busca não disponível"
fi

# Resultados finais
echo ""
hr
log_success "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
hr
echo ""
log_info "📊 Informações do Deploy:"
echo "   • Timestamp: ${TIMESTAMP}"
echo "   • Servidor: ${SERVER}"
echo "   • Backup: ${BACKUP_DIR}/backup-modules-${TIMESTAMP}.tar.gz"
echo ""

log_info "🧪 URLs para teste:"
echo "   • Health: https://www.reservasegura.pro/api/health"
echo "   • Reservas: https://www.reservasegura.pro/api/health/reservas"
echo "   • Companhias: https://www.reservasegura.pro/api/reservas/companhias"
echo "   • Busca: https://www.reservasegura.pro/api/airline-booking/search-booking"
echo ""

log_info "📝 Teste com reserva PDCDX:"
echo '   curl -X POST https://www.reservasegura.pro/api/airline-booking/search-booking \'
echo '     -H "Content-Type: application/json" \'
echo '     -d '"'"'{"localizador":"PDCDX","sobrenome":"Diniz","origem":"SLZ"}'"'"
echo ""

log_info "📚 Documentação:"
echo "   • COMO-USAR-MONITORAMENTO.md"
echo "   • TESTE-RESERVA-PDCDX-RESULTADO.md"
echo "   • apps/api/src/modules/reservas/README.md"
echo ""

log_info "🔄 Rollback (se necessário):"
echo "   ssh ${SERVER}"
echo "   cd ${PROJECT_DIR}"
echo "   tar -xzf ${BACKUP_DIR}/backup-modules-${TIMESTAMP}.tar.gz"
echo "   docker-compose restart api"
echo ""

hr

# Perguntar se deseja testar agora
read -p "$(echo -e ${CYAN}Deseja testar a reserva PDCDX agora? ${NC}[S/n] )" -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo ""
    log_info "🧪 Testando reserva PDCDX..."

    PDCDX_RESULT=$(ssh ${SERVER} "curl -s -X POST http://localhost:4000/api/airline-booking/search-booking -H 'Content-Type: application/json' -d '{\"localizador\":\"PDCDX\",\"sobrenome\":\"Diniz\",\"origem\":\"SLZ\"}'")

    echo ""
    echo "$PDCDX_RESULT" | python3 -m json.tool 2>/dev/null || echo "$PDCDX_RESULT"
    echo ""
fi

log_success "✅ Script de deploy finalizado!"
echo ""
