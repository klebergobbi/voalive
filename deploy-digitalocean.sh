#!/bin/bash

# ReservaSegura - Script de Deploy para Digital Ocean
# Este script automatiza o processo de deploy da aplicação ReservaSegura na Digital Ocean

set -e

echo "=========================================="
echo "ReservaSegura - Deploy para Digital Ocean"
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para exibir mensagens
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está no diretório correto
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "docker-compose.prod.yml não encontrado!"
    log_error "Execute este script a partir do diretório raiz do projeto."
    exit 1
fi

# Solicitar informações do servidor
echo ""
log_info "Configuração do Servidor Digital Ocean"
echo "========================================"
read -p "IP do servidor (ex: 159.89.123.456): " SERVER_IP
read -p "Usuário SSH (padrão: root): " SSH_USER
SSH_USER=${SSH_USER:-root}

read -p "Domínio principal (ex: reservasegura.com): " DOMAIN
read -p "Email para Let's Encrypt: " LETSENCRYPT_EMAIL

# Confirmar dados
echo ""
log_warning "Confirme os dados:"
echo "  Servidor: $SSH_USER@$SERVER_IP"
echo "  Domínio: $DOMAIN"
echo "  Email: $LETSENCRYPT_EMAIL"
echo ""
read -p "Os dados estão corretos? (s/n): " CONFIRM

if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
    log_error "Deploy cancelado."
    exit 1
fi

# Testar conexão SSH
log_info "Testando conexão SSH..."
if ! ssh -o ConnectTimeout=5 $SSH_USER@$SERVER_IP "echo 'Conexão SSH OK'"; then
    log_error "Não foi possível conectar ao servidor via SSH."
    log_error "Verifique se:"
    log_error "  - O IP está correto"
    log_error "  - Você tem acesso SSH configurado"
    log_error "  - O firewall permite conexão SSH"
    exit 1
fi
log_info "Conexão SSH estabelecida com sucesso!"

# Instalar dependências no servidor
log_info "Instalando dependências no servidor..."
ssh $SSH_USER@$SERVER_IP << 'ENDSSH'
    # Atualizar sistema
    apt-get update
    apt-get upgrade -y

    # Instalar Docker
    if ! command -v docker &> /dev/null; then
        echo "Instalando Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    fi

    # Instalar Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo "Instalando Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi

    # Instalar outras dependências
    apt-get install -y git curl wget nano ufw

    # Configurar firewall
    ufw --force enable
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    ufw reload

    echo "Dependências instaladas com sucesso!"
ENDSSH

log_info "Dependências instaladas com sucesso!"

# Criar diretório da aplicação no servidor
log_info "Criando diretório da aplicação..."
ssh $SSH_USER@$SERVER_IP "mkdir -p /opt/reservasegura"

# Atualizar docker-compose.prod.yml com domínio e email
log_info "Configurando variáveis de ambiente..."
cp docker-compose.prod.yml docker-compose.prod.tmp.yml
sed -i "s/reservasegura.com/$DOMAIN/g" docker-compose.prod.tmp.yml
sed -i "s/admin@reservasegura.com/$LETSENCRYPT_EMAIL/g" docker-compose.prod.tmp.yml

# Copiar arquivos para o servidor
log_info "Copiando arquivos para o servidor..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude '.env.local' \
    ./ $SSH_USER@$SERVER_IP:/opt/reservasegura/

# Copiar docker-compose modificado
scp docker-compose.prod.tmp.yml $SSH_USER@$SERVER_IP:/opt/reservasegura/docker-compose.prod.yml
rm docker-compose.prod.tmp.yml

# Configurar variáveis de ambiente no servidor
log_info "Configurando variáveis de ambiente..."
ssh $SSH_USER@$SERVER_IP << ENDSSH
    cd /opt/reservasegura

    # Criar arquivo .env se não existir
    if [ ! -f .env ]; then
        cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://reservasegura_user:reservasegura_pass_prod_2024@postgres:5432/reservasegura

# Redis
REDIS_URL=redis://:reservasegura_redis_2024@redis:6379

# Firecrawl API
FIRECRAWL_API_KEY=fc-2dda7f7f0e2c4ccb816cb21e7f372410

# JWT
JWT_SECRET=reservasegura_jwt_secret_prod_2024_ultra_secure

# NextAuth
NEXTAUTH_SECRET=reservasegura_nextauth_secret_prod_2024
NEXTAUTH_URL=https://$DOMAIN

# API
PORT=4000
NODE_ENV=production
AUTO_START_SCRAPER=true
LOG_LEVEL=info

# URLs
NEXT_PUBLIC_API_URL=https://api.$DOMAIN
EOF
    fi
ENDSSH

# Build e deploy
log_info "Iniciando build e deploy..."
ssh $SSH_USER@$SERVER_IP << 'ENDSSH'
    cd /opt/reservasegura

    # Parar containers existentes
    docker-compose -f docker-compose.prod.yml down

    # Remover imagens antigas
    docker-compose -f docker-compose.prod.yml rm -f

    # Build das imagens
    docker-compose -f docker-compose.prod.yml build --no-cache

    # Iniciar serviços
    docker-compose -f docker-compose.prod.yml up -d

    echo "Deploy concluído!"
ENDSSH

# Verificar status dos containers
log_info "Verificando status dos containers..."
ssh $SSH_USER@$SERVER_IP "cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml ps"

# Aguardar serviços iniciarem
log_info "Aguardando serviços iniciarem (30 segundos)..."
sleep 30

# Verificar logs
log_info "Verificando logs..."
ssh $SSH_USER@$SERVER_IP "cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml logs --tail=50"

# Configurar DNS
echo ""
log_warning "=========================================="
log_warning "PRÓXIMOS PASSOS - CONFIGURAÇÃO DE DNS"
log_warning "=========================================="
echo ""
echo "Configure os seguintes registros DNS no seu provedor:"
echo ""
echo "  $DOMAIN              A      $SERVER_IP"
echo "  www.$DOMAIN          CNAME  $DOMAIN"
echo "  api.$DOMAIN          A      $SERVER_IP"
echo "  traefik.$DOMAIN      A      $SERVER_IP"
echo "  monitor.$DOMAIN      A      $SERVER_IP"
echo "  metrics.$DOMAIN      A      $SERVER_IP"
echo "  status.$DOMAIN       A      $SERVER_IP"
echo ""
log_info "Após configurar o DNS, aguarde alguns minutos para propagação."
log_info "O Traefik irá gerar automaticamente os certificados SSL com Let's Encrypt."
echo ""

# URLs de acesso
echo ""
log_info "=========================================="
log_info "DEPLOY CONCLUÍDO COM SUCESSO!"
log_info "=========================================="
echo ""
echo "URLs de acesso (após configuração do DNS):"
echo ""
echo "  Frontend:        https://$DOMAIN"
echo "  API:             https://api.$DOMAIN"
echo "  Grafana:         https://monitor.$DOMAIN"
echo "  Prometheus:      https://metrics.$DOMAIN"
echo "  Traefik:         https://traefik.$DOMAIN"
echo "  Status Page:     https://status.$DOMAIN"
echo ""
log_info "Credenciais Grafana:"
echo "  Usuário: admin"
echo "  Senha: reservasegura_grafana_admin_2024"
echo ""

# Comandos úteis
log_warning "Comandos úteis no servidor:"
echo ""
echo "  Ver logs:           cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml logs -f"
echo "  Reiniciar:          cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml restart"
echo "  Parar:              cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml down"
echo "  Iniciar:            cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml up -d"
echo "  Status:             cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml ps"
echo ""

log_info "Deploy finalizado!"
