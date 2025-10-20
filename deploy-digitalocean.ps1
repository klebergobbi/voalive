# ReservaSegura - Script de Deploy para Digital Ocean (PowerShell)
# Este script automatiza o processo de deploy da aplicação ReservaSegura na Digital Ocean via Windows

Write-Host "==========================================" -ForegroundColor Green
Write-Host "ReservaSegura - Deploy para Digital Ocean" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "docker-compose.prod.yml")) {
    Write-Host "[ERRO] docker-compose.prod.yml não encontrado!" -ForegroundColor Red
    Write-Host "Execute este script a partir do diretório raiz do projeto." -ForegroundColor Red
    exit 1
}

# Verificar se tem SSH instalado
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "[ERRO] SSH não encontrado no sistema!" -ForegroundColor Red
    Write-Host "Instale o OpenSSH Client:" -ForegroundColor Yellow
    Write-Host "  Settings > Apps > Optional Features > Add a feature > OpenSSH Client" -ForegroundColor Yellow
    exit 1
}

# Solicitar informações do servidor
Write-Host ""
Write-Host "[INFO] Configuração do Servidor Digital Ocean" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$SERVER_IP = Read-Host "IP do servidor (ex: 159.89.123.456)"
$SSH_USER = Read-Host "Usuário SSH (padrão: root)"
if ([string]::IsNullOrWhiteSpace($SSH_USER)) {
    $SSH_USER = "root"
}

$DOMAIN = Read-Host "Domínio principal (ex: reservasegura.com)"
$LETSENCRYPT_EMAIL = Read-Host "Email para Let's Encrypt"

# Confirmar dados
Write-Host ""
Write-Host "[AVISO] Confirme os dados:" -ForegroundColor Yellow
Write-Host "  Servidor: $SSH_USER@$SERVER_IP"
Write-Host "  Domínio: $DOMAIN"
Write-Host "  Email: $LETSENCRYPT_EMAIL"
Write-Host ""
$CONFIRM = Read-Host "Os dados estão corretos? (s/n)"

if ($CONFIRM -ne "s" -and $CONFIRM -ne "S") {
    Write-Host "[ERRO] Deploy cancelado." -ForegroundColor Red
    exit 1
}

# Testar conexão SSH
Write-Host ""
Write-Host "[INFO] Testando conexão SSH..." -ForegroundColor Cyan
$testConnection = ssh -o ConnectTimeout=5 "$SSH_USER@$SERVER_IP" "echo 'Conexão SSH OK'" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Não foi possível conectar ao servidor via SSH." -ForegroundColor Red
    Write-Host "Verifique se:" -ForegroundColor Yellow
    Write-Host "  - O IP está correto" -ForegroundColor Yellow
    Write-Host "  - Você tem acesso SSH configurado" -ForegroundColor Yellow
    Write-Host "  - O firewall permite conexão SSH" -ForegroundColor Yellow
    exit 1
}
Write-Host "[INFO] Conexão SSH estabelecida com sucesso!" -ForegroundColor Green

# Instalar dependências no servidor
Write-Host ""
Write-Host "[INFO] Instalando dependências no servidor..." -ForegroundColor Cyan

$installScript = @'
# Atualizar sistema
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

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
DEBIAN_FRONTEND=noninteractive apt-get install -y git curl wget nano ufw

# Configurar firewall
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw reload

echo "Dependências instaladas com sucesso!"
'@

ssh "$SSH_USER@$SERVER_IP" $installScript

Write-Host "[INFO] Dependências instaladas com sucesso!" -ForegroundColor Green

# Criar diretório da aplicação no servidor
Write-Host ""
Write-Host "[INFO] Criando diretório da aplicação..." -ForegroundColor Cyan
ssh "$SSH_USER@$SERVER_IP" "mkdir -p /opt/reservasegura"

# Atualizar docker-compose.prod.yml com domínio e email
Write-Host ""
Write-Host "[INFO] Configurando variáveis de ambiente..." -ForegroundColor Cyan
$dockerComposeContent = Get-Content "docker-compose.prod.yml" -Raw
$dockerComposeContent = $dockerComposeContent -replace "reservasegura\.com", $DOMAIN
$dockerComposeContent = $dockerComposeContent -replace "admin@reservasegura\.com", $LETSENCRYPT_EMAIL
$dockerComposeContent | Set-Content "docker-compose.prod.tmp.yml"

# Copiar arquivos para o servidor (usando SCP)
Write-Host ""
Write-Host "[INFO] Copiando arquivos para o servidor..." -ForegroundColor Cyan
Write-Host "[INFO] Este processo pode levar alguns minutos..." -ForegroundColor Yellow

# Criar arquivo temporário com lista de exclusões
$excludeFile = [System.IO.Path]::GetTempFileName()
@(
    "node_modules",
    ".next",
    "dist",
    ".git",
    ".env",
    ".env.local"
) | Set-Content $excludeFile

# Usar tar para comprimir e enviar
Write-Host "[INFO] Compactando e enviando arquivos..." -ForegroundColor Cyan
tar -czf reservasegura.tar.gz --exclude-from=$excludeFile .
scp reservasegura.tar.gz "$SSH_USER@${SERVER_IP}:/opt/reservasegura/"
Remove-Item reservasegura.tar.gz
Remove-Item $excludeFile

# Descompactar no servidor
ssh "$SSH_USER@$SERVER_IP" "cd /opt/reservasegura && tar -xzf reservasegura.tar.gz && rm reservasegura.tar.gz"

# Copiar docker-compose modificado
scp docker-compose.prod.tmp.yml "$SSH_USER@${SERVER_IP}:/opt/reservasegura/docker-compose.prod.yml"
Remove-Item docker-compose.prod.tmp.yml

Write-Host "[INFO] Arquivos copiados com sucesso!" -ForegroundColor Green

# Configurar variáveis de ambiente no servidor
Write-Host ""
Write-Host "[INFO] Configurando variáveis de ambiente no servidor..." -ForegroundColor Cyan

$envScript = @"
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
"@

ssh "$SSH_USER@$SERVER_IP" $envScript

# Build e deploy
Write-Host ""
Write-Host "[INFO] Iniciando build e deploy..." -ForegroundColor Cyan
Write-Host "[INFO] Este processo pode levar 10-15 minutos..." -ForegroundColor Yellow

$deployScript = @'
cd /opt/reservasegura

# Parar containers existentes
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Remover imagens antigas
docker-compose -f docker-compose.prod.yml rm -f 2>/dev/null || true

# Build das imagens
echo "Building images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Iniciar serviços
echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo "Deploy concluído!"
'@

ssh "$SSH_USER@$SERVER_IP" $deployScript

# Verificar status dos containers
Write-Host ""
Write-Host "[INFO] Verificando status dos containers..." -ForegroundColor Cyan
ssh "$SSH_USER@$SERVER_IP" "cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml ps"

# Aguardar serviços iniciarem
Write-Host ""
Write-Host "[INFO] Aguardando serviços iniciarem (30 segundos)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Verificar logs
Write-Host ""
Write-Host "[INFO] Verificando logs..." -ForegroundColor Cyan
ssh "$SSH_USER@$SERVER_IP" "cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml logs --tail=50"

# Configurar DNS
Write-Host ""
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "PRÓXIMOS PASSOS - CONFIGURAÇÃO DE DNS" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Configure os seguintes registros DNS no seu provedor:"
Write-Host ""
Write-Host "  $DOMAIN              A      $SERVER_IP" -ForegroundColor White
Write-Host "  www.$DOMAIN          CNAME  $DOMAIN" -ForegroundColor White
Write-Host "  api.$DOMAIN          A      $SERVER_IP" -ForegroundColor White
Write-Host "  traefik.$DOMAIN      A      $SERVER_IP" -ForegroundColor White
Write-Host "  monitor.$DOMAIN      A      $SERVER_IP" -ForegroundColor White
Write-Host "  metrics.$DOMAIN      A      $SERVER_IP" -ForegroundColor White
Write-Host "  status.$DOMAIN       A      $SERVER_IP" -ForegroundColor White
Write-Host ""
Write-Host "[INFO] Após configurar o DNS, aguarde alguns minutos para propagação." -ForegroundColor Cyan
Write-Host "[INFO] O Traefik irá gerar automaticamente os certificados SSL com Let's Encrypt." -ForegroundColor Cyan
Write-Host ""

# URLs de acesso
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "URLs de acesso (após configuração do DNS):" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend:        https://$DOMAIN" -ForegroundColor White
Write-Host "  API:             https://api.$DOMAIN" -ForegroundColor White
Write-Host "  Grafana:         https://monitor.$DOMAIN" -ForegroundColor White
Write-Host "  Prometheus:      https://metrics.$DOMAIN" -ForegroundColor White
Write-Host "  Traefik:         https://traefik.$DOMAIN" -ForegroundColor White
Write-Host "  Status Page:     https://status.$DOMAIN" -ForegroundColor White
Write-Host ""
Write-Host "[INFO] Credenciais Grafana:" -ForegroundColor Cyan
Write-Host "  Usuário: admin" -ForegroundColor White
Write-Host "  Senha: reservasegura_grafana_admin_2024" -ForegroundColor White
Write-Host ""

# Comandos úteis
Write-Host "[AVISO] Comandos úteis no servidor:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Ver logs:           ssh $SSH_USER@$SERVER_IP 'cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml logs -f'" -ForegroundColor White
Write-Host "  Reiniciar:          ssh $SSH_USER@$SERVER_IP 'cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml restart'" -ForegroundColor White
Write-Host "  Parar:              ssh $SSH_USER@$SERVER_IP 'cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml down'" -ForegroundColor White
Write-Host "  Iniciar:            ssh $SSH_USER@$SERVER_IP 'cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml up -d'" -ForegroundColor White
Write-Host "  Status:             ssh $SSH_USER@$SERVER_IP 'cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml ps'" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Deploy finalizado!" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
