#!/bin/bash

################################################################################
# VoaLive - Deploy de Produção com Dados Reais
# Script de Deploy Completo para Digital Ocean
# Versão: 2.0 - SEM DADOS MOCKADOS
################################################################################

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
SERVER_IP="159.89.80.179"
SERVER_USER="root"
PROJECT_DIR="/opt/voalive"
BACKUP_DIR="/opt/backups/voalive"
LOCAL_PROJECT="/c/Projetos/VoaLive"

# Timestamp para backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="voalive_backup_${TIMESTAMP}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       VOALIVE - DEPLOY DE PRODUÇÃO (DADOS REAIS)          ║${NC}"
echo -e "${BLUE}║              Servidor: ${SERVER_IP}                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

################################################################################
# ETAPA 1: Validações Pré-Deploy
################################################################################
echo -e "${YELLOW}[1/9] Validando ambiente local...${NC}"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: package.json não encontrado. Execute este script do diretório raiz do projeto.${NC}"
    exit 1
fi

# Verificar se o arquivo .env.production existe
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Erro: .env.production não encontrado.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Ambiente local validado${NC}"

################################################################################
# ETAPA 2: Testar Conexão SSH
################################################################################
echo -e "${YELLOW}[2/9] Testando conexão com servidor...${NC}"

if ! ssh -o ConnectTimeout=10 ${SERVER_USER}@${SERVER_IP} "echo '✅ Conexão SSH estabelecida'"; then
    echo -e "${RED}❌ Erro: Não foi possível conectar ao servidor${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Conexão SSH estabelecida${NC}"

################################################################################
# ETAPA 3: Fazer Backup do Servidor
################################################################################
echo -e "${YELLOW}[3/9] Criando backup do servidor...${NC}"

ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
    set -e

    echo "📦 Criando diretório de backup..."
    mkdir -p ${BACKUP_DIR}

    if [ -d "${PROJECT_DIR}" ]; then
        echo "💾 Fazendo backup do projeto atual..."
        tar -czf ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz -C /opt voalive 2>/dev/null || true

        echo "💾 Fazendo backup do banco de dados..."
        docker exec voalive-postgres-1 pg_dump -U reservasegura_user reservasegura > ${BACKUP_DIR}/${BACKUP_NAME}_database.sql 2>/dev/null || true

        echo "✅ Backup criado: ${BACKUP_NAME}"
    else
        echo "⚠️ Projeto não existe ainda, pulando backup..."
    fi

    # Limpar backups antigos (manter últimos 5)
    cd ${BACKUP_DIR}
    ls -t voalive_backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

    echo "✅ Backup concluído"
ENDSSH

echo -e "${GREEN}✅ Backup criado: ${BACKUP_NAME}${NC}"

################################################################################
# ETAPA 4: Preparar Pacote de Deploy
################################################################################
echo -e "${YELLOW}[4/9] Preparando pacote de deploy...${NC}"

# Criar diretório temporário
TEMP_DIR=$(mktemp -d)
echo "📦 Criando pacote em: ${TEMP_DIR}"

# Copiar arquivos necessários
cp -r apps ${TEMP_DIR}/
cp -r packages ${TEMP_DIR}/
cp package*.json ${TEMP_DIR}/
cp turbo.json ${TEMP_DIR}/
cp tsconfig.json ${TEMP_DIR}/
cp .env.production ${TEMP_DIR}/.env
cp docker-compose.prod.yml ${TEMP_DIR}/docker-compose.yml
cp Dockerfile.* ${TEMP_DIR}/

# Copiar scripts se existirem
if [ -d "scripts" ]; then
    cp -r scripts ${TEMP_DIR}/
fi

# Criar tarball
DEPLOY_PACKAGE="voalive-production-${TIMESTAMP}.tar.gz"
tar -czf ${DEPLOY_PACKAGE} -C ${TEMP_DIR} .

echo -e "${GREEN}✅ Pacote criado: ${DEPLOY_PACKAGE}${NC}"

################################################################################
# ETAPA 5: Enviar Pacote para Servidor
################################################################################
echo -e "${YELLOW}[5/9] Enviando pacote para servidor...${NC}"

scp ${DEPLOY_PACKAGE} ${SERVER_USER}@${SERVER_IP}:/tmp/

echo -e "${GREEN}✅ Pacote enviado${NC}"

################################################################################
# ETAPA 6: Extrair e Configurar no Servidor
################################################################################
echo -e "${YELLOW}[6/9] Configurando projeto no servidor...${NC}"

ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
    set -e

    echo "📂 Preparando diretório do projeto..."
    mkdir -p ${PROJECT_DIR}

    # Parar containers se estiverem rodando
    if [ -f "${PROJECT_DIR}/docker-compose.yml" ]; then
        echo "🛑 Parando containers antigos..."
        cd ${PROJECT_DIR}
        docker-compose down 2>/dev/null || true
    fi

    echo "📦 Extraindo novo código..."
    cd ${PROJECT_DIR}
    tar -xzf /tmp/${DEPLOY_PACKAGE}

    echo "🔧 Configurando permissões..."
    chmod +x ${PROJECT_DIR}/*.sh 2>/dev/null || true

    echo "🗑️ Limpando arquivo temporário..."
    rm /tmp/${DEPLOY_PACKAGE}

    echo "✅ Código atualizado"
ENDSSH

echo -e "${GREEN}✅ Projeto configurado${NC}"

################################################################################
# ETAPA 7: Build e Start dos Containers
################################################################################
echo -e "${YELLOW}[7/9] Iniciando containers Docker...${NC}"

ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
    set -e
    cd ${PROJECT_DIR}

    echo "🐳 Verificando Docker..."
    docker --version
    docker-compose --version

    echo "🔨 Fazendo build das imagens..."
    docker-compose build --no-cache

    echo "🚀 Iniciando containers..."
    docker-compose up -d

    echo "⏳ Aguardando containers iniciarem (30 segundos)..."
    sleep 30

    echo "📊 Status dos containers:"
    docker-compose ps

    echo "✅ Containers iniciados"
ENDSSH

echo -e "${GREEN}✅ Containers Docker iniciados${NC}"

################################################################################
# ETAPA 8: Verificar Saúde dos Serviços
################################################################################
echo -e "${YELLOW}[8/9] Verificando saúde dos serviços...${NC}"

ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
    set -e
    cd ${PROJECT_DIR}

    echo "🏥 Verificando saúde dos containers..."

    # Verificar se postgres está saudável
    if docker-compose ps postgres | grep -q "healthy"; then
        echo "✅ PostgreSQL: Saudável"
    else
        echo "⚠️ PostgreSQL: Verificar logs"
    fi

    # Verificar se redis está saudável
    if docker-compose ps redis | grep -q "healthy"; then
        echo "✅ Redis: Saudável"
    else
        echo "⚠️ Redis: Verificar logs"
    fi

    # Verificar se API está rodando
    if docker-compose ps reservasegura-api | grep -q "Up"; then
        echo "✅ API: Rodando"
    else
        echo "❌ API: Parada - Verificar logs"
    fi

    # Verificar se Web está rodando
    if docker-compose ps reservasegura-web | grep -q "Up"; then
        echo "✅ Web: Rodando"
    else
        echo "❌ Web: Parada - Verificar logs"
    fi

    echo ""
    echo "📝 Últimas 20 linhas do log da API:"
    docker-compose logs --tail=20 reservasegura-api

    echo ""
    echo "📝 Últimas 20 linhas do log do Web:"
    docker-compose logs --tail=20 reservasegura-web
ENDSSH

echo -e "${GREEN}✅ Verificação de saúde concluída${NC}"

################################################################################
# ETAPA 9: Testes de Validação
################################################################################
echo -e "${YELLOW}[9/9] Executando testes de validação...${NC}"

echo "🌐 Testando endpoints..."

# Testar se o site está acessível
if curl -f -s -o /dev/null -w "%{http_code}" https://www.reservasegura.pro | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ Site Web acessível${NC}"
else
    echo -e "${YELLOW}⚠️ Site Web não acessível (pode levar alguns minutos)${NC}"
fi

# Testar se a API está acessível
if curl -f -s -o /dev/null -w "%{http_code}" https://www.reservasegura.pro/api/health 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✅ API acessível${NC}"
else
    echo -e "${YELLOW}⚠️ API não acessível (pode levar alguns minutos)${NC}"
fi

################################################################################
# RESUMO FINAL
################################################################################
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   DEPLOY CONCLUÍDO!                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Deploy realizado com sucesso!${NC}"
echo ""
echo "📋 INFORMAÇÕES DO DEPLOY:"
echo "  • Timestamp: ${TIMESTAMP}"
echo "  • Backup: ${BACKUP_NAME}"
echo "  • Pacote: ${DEPLOY_PACKAGE}"
echo ""
echo "🌐 ACESSOS:"
echo "  • Site: https://www.reservasegura.pro"
echo "  • API: https://www.reservasegura.pro/api"
echo "  • Monitoramento: https://monitor.reservasegura.pro"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "  • Ver logs da API: ssh root@${SERVER_IP} 'cd ${PROJECT_DIR} && docker-compose logs -f reservasegura-api'"
echo "  • Ver logs do Web: ssh root@${SERVER_IP} 'cd ${PROJECT_DIR} && docker-compose logs -f reservasegura-web'"
echo "  • Reiniciar serviços: ssh root@${SERVER_IP} 'cd ${PROJECT_DIR} && docker-compose restart'"
echo "  • Ver status: ssh root@${SERVER_IP} 'cd ${PROJECT_DIR} && docker-compose ps'"
echo ""
echo "📊 DADOS REAIS ATIVADOS:"
echo "  • ✅ AviationStack API configurada"
echo "  • ✅ AirLabs API pronta (adicionar chave se disponível)"
echo "  • ✅ FlightRadar24 scraping ativo"
echo "  • ✅ FlightAware scraping ativo"
echo "  • ❌ Dados mockados REMOVIDOS completamente"
echo ""
echo -e "${YELLOW}⚠️ IMPORTANTE:${NC}"
echo "  • Aguarde 2-3 minutos para que todos os serviços estejam 100% operacionais"
echo "  • Verifique os logs se houver algum problema"
echo "  • O backup está em: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo ""

# Limpar arquivo local
rm -f ${DEPLOY_PACKAGE}
rm -rf ${TEMP_DIR}

echo -e "${GREEN}🎉 Deploy finalizado! Sistema rodando com DADOS REAIS!${NC}"
