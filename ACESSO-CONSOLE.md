# 🖥️ Acesso ao Droplet via Console Digital Ocean

## ⚠️ Situação Atual

O droplet **voalive-prod** (IP: 192.34.58.167) foi criado sem SSH keys configuradas, portanto o acesso via SSH não está funcionando. A solução é usar o **Console Web** da Digital Ocean.

## 📋 Informações do Droplet

- **Nome**: voalive-prod
- **ID**: 525312791
- **IP**: 192.34.58.167
- **Console**: https://cloud.digitalocean.com/droplets/525312791

---

## 🚀 MÉTODO 1: Acesso Via Console Web (RECOMENDADO)

### Passo 1: Acessar o Console

1. Abra seu navegador e acesse:
   ```
   https://cloud.digitalocean.com/droplets/525312791
   ```

2. Faça login na sua conta Digital Ocean

3. Clique na aba **"Access"** no menu lateral

4. Clique em **"Launch Droplet Console"**

5. Uma janela de console será aberta diretamente no navegador

### Passo 2: Login no Console

O console será aberto e você verá:
```
Ubuntu 22.04 LTS voalive-prod tty1

voalive-prod login: _
```

Digite:
- **Username**: `root`
- **Password**: Verifique seu email da Digital Ocean

> **Nota**: Se você não recebeu a senha por email, vá para **Método 2** abaixo.

### Passo 3: Copiar o Script de Setup

Uma vez logado no console, execute os comandos abaixo para fazer o download do script de setup:

```bash
# Criar arquivo temporário
cat > /tmp/setup.sh << 'SETUPSCRIPT'
#!/bin/bash
set -e

echo "🚀 VoaLive - Droplet Setup Script"
echo "=================================="

# Verificar Docker
echo "🐳 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Verificar Docker Compose
echo "🔧 Verificando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Instalando Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Configurar Firewall
echo "🔥 Configurando Firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3010/tcp
ufw allow 3011/tcp
ufw allow 3012/tcp

# Criar estrutura
echo "📁 Criando diretórios..."
mkdir -p /opt/voalive/{data/{postgres,redis},nginx/{ssl,conf.d}}

echo "✅ Setup básico completo!"
SETUPSCRIPT

# Executar o script
chmod +x /tmp/setup.sh
bash /tmp/setup.sh
```

### Passo 4: Adicionar SSH Key

Para poder conectar via SSH posteriormente, adicione sua chave pública:

```bash
# Criar diretório SSH se não existir
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Adicionar sua chave pública
cat > ~/.ssh/authorized_keys << 'SSHKEY'
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDf0o7TSj2BHE6Ly4Sw0U8HtllqNaYvGXclfYWQryl+U6G/W6Llu6CZaFVX1QviGA1wPjDxTbY7cs1hQ57jEKmZ7g1A6CdDe5ZLULITn9T2nEa8a69axMks1WB9NMTAv3Kfm0PZ71gR+U0AvwBmrdDeqqD+cNv9z8qmPnWNYlo9O+9q1XwpM5S68vYLNGCkTD1RvL39FV2mpJ418XsmZnhY4aLs1fKK/+aKzgJoyj+rgVh8TI47Ew9boZtKsAAgWcdvF8sPTQK/j8Q12tXE37SPd3WAZ3MYPHhIUAUX/bSCdO0ih1MTghNCLItok0k+WwDEgn8Xw+lll753MGj5IIQOoFDjiXV2vNCse1vlnaS5IfkWroUsQIW2iC6XLoyeRUSc+ZU47m9FvbSfDsYWrBXbIJNhAhWe/72XrYXdElDxxD85pElh+QdOKpYuJoiWyKybhsxWgzr9vvCW1pw+33PcKC1kYI8iuP5x8R3PwnNOudIMMhZnZ/VL68BMOtXKNTUaj/UDJSDew6D8dVsC4JX/bBf0mwcPdYd/D+y//z6mJv6zt0/C80lUI0kdIeKZNEo8tjbz8iH9PPKlH0CP+GeGh7yYnC2nD6J0keGDAeA0w6BxdX5x0lxwhHRrPFZgsRWxN3vnOEBBJC7NQioV8bfq/ipsmpjxoxPpTX5zu8B9AQ== klebergobbi@protonmail.com
SSHKEY

# Ajustar permissões
chmod 600 ~/.ssh/authorized_keys
```

### Passo 5: Testar SSH

Agora você pode testar o acesso SSH do seu computador local:

```bash
ssh root@192.34.58.167
```

---

## 🚀 MÉTODO 2: Reset de Senha

Se você não conseguiu a senha do root por email:

1. Acesse: https://cloud.digitalocean.com/droplets/525312791
2. Clique em **"Access"** → **"Reset Root Password"**
3. Uma nova senha será enviada para o seu email
4. Use a senha no console ou via SSH

---

## 🐳 Deploy da Aplicação

### Opção A: Download do Script de Setup Completo

Se você já adicionou a SSH key, pode baixar o script completo:

```bash
# Do seu computador local
scp setup-droplet.sh root@192.34.58.167:/tmp/

# Conectar e executar
ssh root@192.34.58.167
chmod +x /tmp/setup-droplet.sh
bash /tmp/setup-droplet.sh
```

### Opção B: Setup Manual Via Console

Se preferir fazer tudo via console web:

```bash
# 1. Criar estrutura de diretórios
mkdir -p /opt/voalive/data/{postgres,redis}
mkdir -p /opt/voalive/nginx/{ssl,conf.d}

# 2. Criar arquivo .env
cd /opt/voalive
cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://voalive_user:voalive_prod_pass_2024@postgres:5432/voalive_production
POSTGRES_USER=voalive_user
POSTGRES_PASSWORD=voalive_prod_pass_2024
POSTGRES_DB=voalive_production
REDIS_URL=redis://:voalive_redis_2024@redis:6379
JWT_SECRET=voalive_jwt_secret_production_2024_secure_key
NEXTAUTH_SECRET=voalive_nextauth_secret_prod_2024_secure_key
NEXTAUTH_URL=https://app.voalive.com
NEXT_PUBLIC_API_URL=https://api.voalive.com
FIRECRAWL_API_KEY=fc-your-key-here
EOF

# 3. Fazer login no GitHub Container Registry
docker login ghcr.io -u klebergobbi

# 4. Pull das imagens (quando estiverem prontas)
docker pull ghcr.io/klebergobbi/voalive-api:latest
docker pull ghcr.io/klebergobbi/voalive-web:latest

# 5. Ver status
docker ps
```

---

## ⚙️ Configuração do docker-compose.prod.yml

O arquivo `docker-compose.prod.yml` deve ser copiado para o servidor:

```bash
# Via SCP (se SSH funcionando)
scp docker-compose.prod.yml root@192.34.58.167:/opt/voalive/

# Via Console (copiar e colar)
cd /opt/voalive
nano docker-compose.prod.yml
# Cole o conteúdo do arquivo
```

---

## 🔍 Verificações Importantes

### Verificar Docker

```bash
docker --version
docker-compose --version
```

### Verificar Firewall

```bash
ufw status
```

### Verificar Serviços

```bash
cd /opt/voalive
docker-compose -f docker-compose.prod.yml ps
```

### Ver Logs

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 📝 Checklist Pós-Acesso

- [ ] Login no console bem-sucedido
- [ ] Docker instalado e funcionando
- [ ] SSH key adicionada
- [ ] Teste de SSH do computador local funcionando
- [ ] Diretórios criados (/opt/voalive)
- [ ] Arquivo .env configurado
- [ ] docker-compose.prod.yml copiado
- [ ] Login no GitHub Container Registry realizado
- [ ] Imagens Docker baixadas
- [ ] Serviços iniciados
- [ ] Portas abertas no firewall

---

## 🆘 Troubleshooting

### Console não abre
- Tente outro navegador (Chrome, Firefox)
- Limpe o cache do navegador
- Desabilite extensões de bloqueio

### Login falha no console
- Verifique se usou `root` como username
- Faça reset da senha via dashboard

### SSH ainda não funciona após adicionar key
```bash
# No console, verifique as permissões
ls -la ~/.ssh/
cat ~/.ssh/authorized_keys

# Devem estar:
# drwx------ (700) para .ssh
# -rw------- (600) para authorized_keys
```

### Docker não instala
```bash
# Verificar conectividade
ping -c 3 8.8.8.8

# Tentar instalação manual
apt-get update
apt-get install -y docker.io docker-compose
```

---

## 🔗 Links Úteis

- **Dashboard do Droplet**: https://cloud.digitalocean.com/droplets/525312791
- **Documentação DO Console**: https://docs.digitalocean.com/products/droplets/how-to/connect-with-console/
- **GitHub Repo**: https://github.com/klebergobbi/voalive
- **GitHub Actions**: https://github.com/klebergobbi/voalive/actions

---

## 📞 Próximos Passos

1. ✅ Acessar console via web
2. ✅ Fazer login como root
3. ✅ Executar script de setup
4. ✅ Adicionar SSH key
5. ✅ Testar SSH do computador local
6. ⏳ Copiar arquivos de configuração
7. ⏳ Iniciar serviços Docker
8. ⏳ Configurar DNS
9. ⏳ Configurar SSL/HTTPS

---

**Última atualização**: 2025-10-20
**Droplet ID**: 525312791
**IP**: 192.34.58.167
