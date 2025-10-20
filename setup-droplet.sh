#!/bin/bash
set -e

echo "🚀 VoaLive - Droplet Setup Script"
echo "=================================="
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Por favor, execute como root"
  exit 1
fi

# Verificar Docker
echo "🐳 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker instalado"
else
    echo "✅ Docker já instalado: $(docker --version)"
fi

# Verificar Docker Compose
echo "🔧 Verificando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Instalando Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose instalado"
else
    echo "✅ Docker Compose já instalado: $(docker-compose --version)"
fi

# Configurar Firewall
echo "🔥 Configurando Firewall..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow OpenSSH
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 3010/tcp
    ufw allow 3011/tcp
    ufw allow 3012/tcp
    echo "✅ Firewall configurado"
else
    echo "⚠️  UFW não disponível"
fi

# Criar estrutura de diretórios
echo "📁 Criando diretórios..."
mkdir -p /opt/voalive
mkdir -p /opt/voalive/data/postgres
mkdir -p /opt/voalive/data/redis
mkdir -p /opt/voalive/nginx/ssl
mkdir -p /opt/voalive/nginx/conf.d
chmod -R 755 /opt/voalive
echo "✅ Diretórios criados"

# Criar arquivo .env
echo "📝 Criando arquivo .env..."
cat > /opt/voalive/.env << 'ENVFILE'
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgresql://voalive_user:voalive_prod_pass_2024@postgres:5432/voalive_production
POSTGRES_USER=voalive_user
POSTGRES_PASSWORD=voalive_prod_pass_2024
POSTGRES_DB=voalive_production

# Redis
REDIS_URL=redis://:voalive_redis_2024@redis:6379

# JWT
JWT_SECRET=voalive_jwt_secret_production_2024_secure_key_1234567890

# NextAuth
NEXTAUTH_SECRET=voalive_nextauth_secret_prod_2024_secure_random_key
NEXTAUTH_URL=https://app.voalive.com

# Public URLs
NEXT_PUBLIC_API_URL=https://api.voalive.com

# Firecrawl API
FIRECRAWL_API_KEY=fc-your-actual-key-here
ENVFILE

chmod 600 /opt/voalive/.env
echo "✅ Arquivo .env criado"

# Criar docker-compose.prod.yml
echo "📝 Criando docker-compose.prod.yml..."
cat > /opt/voalive/docker-compose.prod.yml << 'DOCKERCOMPOSE'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: voalive-postgres-prod
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - voalive-network

  redis:
    image: redis:7-alpine
    container_name: voalive-redis-prod
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_URL##*:}
    volumes:
      - ./data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - voalive-network

  api:
    image: ghcr.io/klebergobbi/voalive-api:latest
    container_name: voalive-api-prod
    restart: unless-stopped
    ports:
      - "3012:4000"
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
      FIRECRAWL_API_KEY: ${FIRECRAWL_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - voalive-network

  web:
    image: ghcr.io/klebergobbi/voalive-web:latest
    container_name: voalive-web-prod
    restart: unless-stopped
    ports:
      - "3011:3003"
    environment:
      NODE_ENV: production
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3003"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - voalive-network

  nginx:
    image: nginx:alpine
    container_name: voalive-nginx-prod
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
      - api
    networks:
      - voalive-network

networks:
  voalive-network:
    driver: bridge
DOCKERCOMPOSE

chmod 644 /opt/voalive/docker-compose.prod.yml
echo "✅ docker-compose.prod.yml criado"

# Criar configuração do Nginx
echo "📝 Criando configuração do Nginx..."
cat > /opt/voalive/nginx/conf.d/voalive.conf << 'NGINXCONF'
# API Upstream
upstream api_backend {
    server api:4000;
}

# Web App Upstream
upstream web_backend {
    server web:3003;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name voalive.com app.voalive.com api.voalive.com;

    location / {
        return 301 https://$host$request_uri;
    }
}

# API Server
server {
    listen 443 ssl http2;
    server_name api.voalive.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Web App Server
server {
    listen 443 ssl http2;
    server_name app.voalive.com voalive.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://web_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXCONF

chmod 644 /opt/voalive/nginx/conf.d/voalive.conf
echo "✅ Nginx configurado"

# Criar certificado SSL self-signed (temporário)
echo "🔐 Criando certificado SSL temporário..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /opt/voalive/nginx/ssl/key.pem \
    -out /opt/voalive/nginx/ssl/cert.pem \
    -subj "/C=BR/ST=SP/L=Sao Paulo/O=VoaLive/CN=voalive.com"
chmod 600 /opt/voalive/nginx/ssl/key.pem
chmod 644 /opt/voalive/nginx/ssl/cert.pem
echo "✅ Certificado SSL criado"

# Login no GitHub Container Registry
echo "🔐 GitHub Container Registry..."
echo "⚠️  Execute manualmente: docker login ghcr.io -u klebergobbi -p YOUR_GITHUB_TOKEN"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ SETUP COMPLETO!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📁 Arquivos criados em: /opt/voalive"
echo ""
echo "🚀 Próximos passos:"
echo ""
echo "1. Editar .env com as credenciais corretas:"
echo "   nano /opt/voalive/.env"
echo ""
echo "2. Fazer login no GitHub Container Registry:"
echo "   docker login ghcr.io -u klebergobbi"
echo ""
echo "3. Iniciar serviços:"
echo "   cd /opt/voalive"
echo "   docker-compose -f docker-compose.prod.yml pull"
echo "   docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "4. Ver logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "5. Verificar status:"
echo "   docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "═══════════════════════════════════════════════════════"
