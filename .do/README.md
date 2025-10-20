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
