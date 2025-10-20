#!/bin/bash
# ReservaSegura - Passo 1: Instalar dependências no servidor
# Execute: ssh root@209.38.71.115 'bash -s' < deploy-step1-install.sh

echo "=========================================="
echo "ReservaSegura Deploy - Instalando Dependências"
echo "=========================================="

# Atualizar sistema
echo "[1/7] Atualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

# Instalar Docker
echo "[2/7] Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "Docker instalado!"
else
    echo "Docker já instalado!"
fi

# Instalar Docker Compose
echo "[3/7] Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose instalado!"
else
    echo "Docker Compose já instalado!"
fi

# Verificar versões
echo "[4/7] Verificando instalação..."
docker --version
docker-compose --version

# Instalar ferramentas adicionais
echo "[5/7] Instalando ferramentas adicionais..."
apt-get install -y git curl wget nano ufw zip unzip

# Configurar firewall
echo "[6/7] Configurando firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
echo "Firewall configurado!"

# Criar diretório do projeto
echo "[7/7] Criando diretório do projeto..."
mkdir -p /opt/reservasegura
chmod 755 /opt/reservasegura

echo ""
echo "=========================================="
echo "✓ Dependências instaladas com sucesso!"
echo "=========================================="
echo ""
echo "Próximo passo: Copiar arquivos do projeto"
