# Digital Ocean Droplet - VoaLive Production

## 📋 Informações do Servidor

- **Nome**: voalive-prod
- **ID**: 525312791
- **IP Público**: 192.34.58.167
- **IP Privado**: 10.116.0.3
- **IPv6**: 2604:a880:400:d1:0:3:d90:5001
- **Região**: New York 1 (nyc1)
- **Tamanho**: s-2vcpu-4gb (2 vCPUs, 4GB RAM, 80GB SSD)
- **OS**: Ubuntu 22.04 LTS
- **Criado**: 2025-10-20T19:35:53Z

## 🔐 Acesso SSH

```bash
ssh root@192.34.58.167
```

**Chave SSH**: A chave SSH privada configurada no GitHub Actions está em `~/.ssh/id_rsa`

## 🐳 Docker

O servidor foi configurado automaticamente via user_data com:
- Docker Engine
- Docker Compose v2.24.0
- Firewall configurado (UFW)

### Verificar Docker

```bash
ssh root@192.34.58.167 "docker --version && docker-compose --version"
```

## 🔥 Firewall

Portas abertas:
- **22** - SSH
- **80** - HTTP
- **443** - HTTPS
- **3010** - Landing Page
- **3011** - Web App
- **3012** - API

## 📦 Deploy

### Via GitHub Actions (Automático)

O deploy é automático ao fazer push para `master`:

```bash
git push origin master
```

### Via Manual

```bash
# Conectar ao servidor
ssh root@192.34.58.167

# Navegar para o diretório
cd /opt/voalive

# Pull das imagens
docker-compose -f docker-compose.prod.yml pull

# Iniciar serviços
docker-compose -f docker-compose.prod.yml up -d
```

## 🔍 Monitoramento

### Ver logs dos containers

```bash
ssh root@192.34.58.167 "cd /opt/voalive && docker-compose -f docker-compose.prod.yml logs -f"
```

### Status dos serviços

```bash
ssh root@192.34.58.167 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

### Recursos do sistema

```bash
ssh root@192.34.58.167 "htop"
```

## 🌐 URLs

- **Landing Page**: http://192.34.58.167:3010 (temporário)
- **Web App**: http://192.34.58.167:3011 (temporário)
- **API**: http://192.34.58.167:3012 (temporário)

**Produção** (após configurar DNS):
- **Landing**: https://voalive.com
- **App**: https://app.voalive.com
- **API**: https://api.voalive.com

## ⚙️ Secrets Configurados no GitHub

Todos os secrets necessários foram configurados:

- ✅ `SERVER_HOST` - IP do droplet
- ✅ `SERVER_USER` - Usuário SSH (root)
- ✅ `SSH_PRIVATE_KEY` - Chave privada SSH
- ✅ `DATABASE_URL` - URL do PostgreSQL
- ✅ `FIRECRAWL_API_KEY` - API key do Firecrawl
- ✅ `JWT_SECRET` - Secret para JWT
- ✅ `NEXTAUTH_SECRET` - Secret do NextAuth
- ✅ `NEXTAUTH_URL` - URL pública da aplicação
- ✅ `NEXT_PUBLIC_API_URL` - URL pública da API

## 🚀 Próximos Passos

1. **Configurar DNS**
   - Aponte `voalive.com` para `192.34.58.167`
   - Aponte `app.voalive.com` para `192.34.58.167`
   - Aponte `api.voalive.com` para `192.34.58.167`

2. **Aguardar user_data completar** (2-3 minutos após criação)
   - Docker e Docker Compose serão instalados automaticamente

3. **Testar acesso SSH**
   ```bash
   ssh root@192.34.58.167
   ```

4. **Fazer primeiro deploy**
   - Corrigir problema de monorepo no Dockerfile
   - Push para master para disparar CI/CD

5. **Configurar SSL/HTTPS**
   - Traefik configurará automaticamente Let's Encrypt
   - Após DNS apontar para o servidor

## 📝 Notas

- Droplet criado via Digital Ocean API
- Configuração automática via user_data
- Monitoramento ativado (Digital Ocean Monitoring)
- Backups desativados (economizar custos)
- IPv6 ativado

## 🔗 Links Úteis

- [Digital Ocean Dashboard](https://cloud.digitalocean.com/droplets/525312791)
- [GitHub Actions Workflows](https://github.com/klebergobbi/voalive/actions)
- [GitHub Container Registry](https://github.com/klebergobbi?tab=packages)

---

**Última atualização**: 2025-10-20  
**Custo mensal**: $24/mês

---

## ⚠️ ACESSO INICIAL - SSH Key Setup

O droplet foi criado sem SSH keys pré-configuradas. Para acessar:

### Opção 1: Via Console Web (Mais Fácil)

1. **Acesse o console**:
   - URL: https://cloud.digitalocean.com/droplets/525312791
   - Clique em "Access" → "Launch Droplet Console"
   - O console web abrirá diretamente no navegador

2. **Login**:
   - User: `root`
   - Password: Enviada por email da Digital Ocean

3. **Adicionar sua SSH key**:
   ```bash
   mkdir -p ~/.ssh
   cat > ~/.ssh/authorized_keys << 'SSHKEY'
   ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDf0o7TSj2BHE6Ly4Sw0U8HtllqNaYvGXclfYWQryl+U6G/W6Llu6CZaFVX1QviGA1wPjDxTbY7cs1hQ57jEKmZ7g1A6CdDe5ZLULITn9T2nEa8a69axMks1WB9NMTAv3Kfm0PZ71gR+U0AvwBmrdDeqqD+cNv9z8qmPnWNYlo9O+9q1XwpM5S68vYLNGCkTD1RvL39FV2mpJ418XsmZnhY4aLs1fKK/+aKzgJoyj+rgVh8TI47Ew9boZtKsAAgWcdvF8sPTQK/j8Q12tXE37SPd3WAZ3MYPHhIUAUX/bSCdO0ih1MTghNCLItok0k+WwDEgn8Xw+lll753MGj5IIQOoFDjiXV2vNCse1vlnaS5IfkWroUsQIW2iC6XLoyeRUSc+ZU47m9FvbSfDsYWrBXbIJNhAhWe/72XrYXdElDxxD85pElh+QdOKpYuJoiWyKybhsxWgzr9vvCW1pw+33PcKC1kYI8iuP5x8R3PwnNOudIMMhZnZ/VL68BMOtXKNTUaj/UDJSDew6D8dVsC4JX/bBf0mwcPdYd/D+y//z6mJv6zt0/C80lUI0kdIeKZNEo8tjbz8iH9PPKlH0CP+GeGh7yYnC2nD6J0keGDAeA0w6BxdX5x0lxwhHRrPFZgsRWxN3vnOEBBJC7NQioV8bfq/ipsmpjxoxPpTX5zu8B9AQ== klebergobbi@protonmail.com
   SSHKEY
   
   chmod 600 ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   ```

4. **Testar SSH**:
   ```bash
   ssh root@192.34.58.167
   ```

### Opção 2: Via Password Reset

1. Acesse o dashboard: https://cloud.digitalocean.com/droplets/525312791
2. Clique em "Access" → "Reset Root Password"
3. Uma nova senha será enviada por email
4. Use a senha para fazer login via SSH

### Opção 3: Recriar Droplet (Se Necessário)

Se preferir começar do zero com SSH key:

```bash
# 1. Destruir droplet atual

# 2. Adicionar SSH key à conta (se ainda não existir)
# 3. Recriar droplet com a key associada
```

---

## 🚀 Deploy Manual (Após Acesso SSH)

Uma vez com acesso SSH, execute:

```bash
# Conectar ao servidor
ssh root@192.34.58.167

# Verificar Docker
docker --version
docker-compose --version

# Criar diretório da aplicação
mkdir -p /opt/voalive
cd /opt/voalive

# Criar docker-compose.prod.yml
cat > docker-compose.prod.yml << 'EOF'
# Cole o conteúdo do docker-compose.prod.yml aqui
