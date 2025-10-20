# Guia de Deploy - ReservaSegura na Digital Ocean

Este guia fornece instruções detalhadas para fazer o deploy da aplicação ReservaSegura na Digital Ocean.

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Criação do Droplet na Digital Ocean](#criação-do-droplet)
3. [Configuração Inicial do Servidor](#configuração-inicial)
4. [Deploy Automatizado](#deploy-automatizado)
5. [Deploy Manual](#deploy-manual)
6. [Configuração de DNS](#configuração-de-dns)
7. [Monitoramento e Logs](#monitoramento-e-logs)
8. [Troubleshooting](#troubleshooting)
9. [Manutenção](#manutenção)

---

## Pré-requisitos

Antes de iniciar o deploy, certifique-se de ter:

- ✅ Conta na Digital Ocean
- ✅ Domínio registrado (ex: reservasegura.com)
- ✅ Acesso SSH configurado (chave SSH)
- ✅ Git instalado localmente
- ✅ Cliente SSH (Terminal, PuTTY, etc.)

### Ferramentas Necessárias

```bash
# Verificar se tem as ferramentas instaladas
git --version
ssh -V
rsync --version  # Linux/Mac
```

---

## Criação do Droplet

### 1. Acessar Digital Ocean

1. Acesse https://cloud.digitalocean.com
2. Clique em "Create" > "Droplets"

### 2. Configurar o Droplet

**Especificações Recomendadas:**

| Configuração | Valor Recomendado |
|-------------|-------------------|
| **Imagem** | Ubuntu 22.04 (LTS) x64 |
| **Plano** | Basic (Regular Intel) |
| **CPU** | 2 vCPUs |
| **RAM** | 4 GB |
| **SSD** | 80 GB |
| **Transferência** | 4 TB |
| **Preço** | ~$24/mês |

**Para produção com mais tráfego:**

| Configuração | Valor |
|-------------|-------|
| **CPU** | 4 vCPUs |
| **RAM** | 8 GB |
| **SSD** | 160 GB |
| **Preço** | ~$48/mês |

### 3. Região

Escolha a região mais próxima dos seus usuários:
- **Brasil**: Não disponível direto (usar São Paulo AWS via Marketplace)
- **Mais próximo**: New York (NYC1, NYC2, NYC3)
- **América do Sul**: San Francisco (SFO2, SFO3)

### 4. Autenticação

- ✅ **SSH Key** (Recomendado)
  - Adicione sua chave SSH pública
  - No Windows: Use PuTTYgen para gerar
  - No Linux/Mac: `ssh-keygen -t rsa -b 4096`

- ❌ **Password** (Menos seguro)

### 5. Configurações Adicionais

- ✅ Enable Monitoring (Gratuito)
- ✅ Enable Backups (+20% do custo - Recomendado)
- ✅ IPv6
- Nome do Droplet: `reservasegura-prod`
- Tags: `reservasegura`, `production`, `web`

### 6. Criar Droplet

Clique em **"Create Droplet"** e aguarde 1-2 minutos.

**Anote o IP do servidor** (ex: `159.89.123.456`)

---

## Configuração Inicial

### 1. Conectar ao Servidor

```bash
# Via SSH (substitua pelo seu IP)
ssh root@159.89.123.456

# Se usar uma chave SSH específica
ssh -i ~/.ssh/reservasegura_rsa root@159.89.123.456
```

### 2. Atualizar Sistema

```bash
# Atualizar pacotes
apt-get update && apt-get upgrade -y

# Reiniciar se necessário
reboot
```

### 3. Criar Usuário (Opcional mas Recomendado)

```bash
# Criar usuário
adduser reservasegura

# Adicionar ao grupo sudo
usermod -aG sudo reservasegura

# Copiar chave SSH
rsync --archive --chown=reservasegura:reservasegura ~/.ssh /home/reservasegura

# Testar login
exit
ssh reservasegura@159.89.123.456
```

### 4. Configurar Firewall

```bash
# Habilitar UFW
ufw --force enable

# Permitir SSH, HTTP e HTTPS
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS

# Verificar status
ufw status
```

---

## Deploy Automatizado

O método mais rápido e recomendado é usar o script automatizado.

### 1. No seu computador local

```bash
# Navegar até o projeto
cd C:/Projetos/ReservaSegura

# Tornar o script executável (Linux/Mac/WSL)
chmod +x deploy-digitalocean.sh

# Executar o script
./deploy-digitalocean.sh
```

### 2. O script irá solicitar:

- IP do servidor
- Usuário SSH (padrão: root)
- Domínio principal (ex: reservasegura.com)
- Email para Let's Encrypt

### 3. Aguardar conclusão

O script irá:
- ✅ Instalar Docker e Docker Compose
- ✅ Configurar firewall
- ✅ Copiar arquivos do projeto
- ✅ Configurar variáveis de ambiente
- ✅ Build das imagens Docker
- ✅ Iniciar todos os serviços
- ✅ Configurar health checks

**Tempo estimado: 10-15 minutos**

---

## Deploy Manual

Se preferir fazer manualmente ou o script automatizado falhar:

### 1. Instalar Docker

```bash
# Conectar ao servidor
ssh root@159.89.123.456

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Verificar instalação
docker --version
```

### 2. Instalar Docker Compose

```bash
# Baixar Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Tornar executável
chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker-compose --version
```

### 3. Copiar Projeto para o Servidor

**No seu computador local:**

```bash
# Usando rsync (Linux/Mac/WSL)
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude 'dist' \
    --exclude '.git' \
    C:/Projetos/ReservaSegura/ root@159.89.123.456:/opt/reservasegura/

# Usando scp (alternativa)
scp -r C:/Projetos/ReservaSegura root@159.89.123.456:/opt/
```

**No Windows sem WSL:**
Use WinSCP ou FileZilla para transferir os arquivos.

### 4. Configurar Variáveis de Ambiente

**No servidor:**

```bash
cd /opt/reservasegura

# Criar arquivo .env
nano .env
```

**Conteúdo do .env:**

```bash
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
NEXTAUTH_URL=https://reservasegura.com

# API
PORT=4000
NODE_ENV=production
AUTO_START_SCRAPER=true
LOG_LEVEL=info

# URLs
NEXT_PUBLIC_API_URL=https://api.reservasegura.com
```

**Salvar:** `Ctrl + O`, Enter, `Ctrl + X`

### 5. Editar docker-compose.prod.yml

```bash
nano docker-compose.prod.yml
```

**Substituir:**
- `reservasegura.com` pelo seu domínio
- `admin@reservasegura.com` pelo seu email

### 6. Build e Deploy

```bash
# Build das imagens
docker-compose -f docker-compose.prod.yml build --no-cache

# Iniciar serviços
docker-compose -f docker-compose.prod.yml up -d

# Verificar status
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## Configuração de DNS

### 1. Acessar Provedor de Domínio

Exemplos: GoDaddy, Registro.br, Cloudflare, Namecheap

### 2. Adicionar Registros DNS

Configure os seguintes registros **A** e **CNAME**:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | @ | 159.89.123.456 | 3600 |
| CNAME | www | reservasegura.com | 3600 |
| A | api | 159.89.123.456 | 3600 |
| A | traefik | 159.89.123.456 | 3600 |
| A | monitor | 159.89.123.456 | 3600 |
| A | metrics | 159.89.123.456 | 3600 |
| A | status | 159.89.123.456 | 3600 |

**Substitua `159.89.123.456` pelo IP do seu servidor!**

### 3. Aguardar Propagação

- **Tempo estimado:** 5 minutos a 48 horas
- **Normalmente:** 30 minutos a 2 horas

**Verificar propagação:**

```bash
# No seu computador local
nslookup reservasegura.com
nslookup api.reservasegura.com
```

### 4. Certificado SSL

O Traefik gerará automaticamente certificados SSL com Let's Encrypt após a propagação do DNS.

**Verificar:**
```bash
# No servidor
docker-compose -f docker-compose.prod.yml logs traefik | grep certificate
```

---

## Monitoramento e Logs

### URLs de Acesso

Após configuração do DNS e SSL:

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **Frontend** | https://reservasegura.com | - |
| **API** | https://api.reservasegura.com | - |
| **Grafana** | https://monitor.reservasegura.com | admin / reservasegura_grafana_admin_2024 |
| **Prometheus** | https://metrics.reservasegura.com | - |
| **Traefik** | https://traefik.reservasegura.com | - |
| **Status Page** | https://status.reservasegura.com | - |

### Comandos de Log

```bash
# Ver todos os logs
docker-compose -f docker-compose.prod.yml logs -f

# Logs de um serviço específico
docker-compose -f docker-compose.prod.yml logs -f reservasegura-api
docker-compose -f docker-compose.prod.yml logs -f reservasegura-web

# Últimas 100 linhas
docker-compose -f docker-compose.prod.yml logs --tail=100

# Logs com timestamp
docker-compose -f docker-compose.prod.yml logs -f -t
```

### Status dos Containers

```bash
# Ver status
docker-compose -f docker-compose.prod.yml ps

# Estatísticas de uso
docker stats

# Informações detalhadas
docker-compose -f docker-compose.prod.yml top
```

---

## Troubleshooting

### Problema: Containers não iniciam

```bash
# Ver logs de erro
docker-compose -f docker-compose.prod.yml logs

# Reiniciar serviços
docker-compose -f docker-compose.prod.yml restart

# Recriar containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Problema: Erro de conexão com banco de dados

```bash
# Verificar se PostgreSQL está rodando
docker-compose -f docker-compose.prod.yml ps postgres

# Conectar ao banco
docker-compose -f docker-compose.prod.yml exec postgres psql -U reservasegura_user -d reservasegura

# Ver logs do banco
docker-compose -f docker-compose.prod.yml logs postgres
```

### Problema: Certificado SSL não gerado

```bash
# Verificar logs do Traefik
docker-compose -f docker-compose.prod.yml logs traefik

# Verificar DNS
nslookup reservasegura.com

# Forçar renovação (se necessário)
docker-compose -f docker-compose.prod.yml restart traefik
```

### Problema: Aplicação lenta

```bash
# Ver uso de recursos
docker stats

# Verificar logs de erro
docker-compose -f docker-compose.prod.yml logs -f | grep -i error

# Reiniciar serviços específicos
docker-compose -f docker-compose.prod.yml restart reservasegura-api
```

### Problema: Porta em uso

```bash
# Ver portas em uso
netstat -tulpn | grep LISTEN

# Parar processo na porta
kill $(lsof -t -i:80)
kill $(lsof -t -i:443)
```

---

## Manutenção

### Backup do Banco de Dados

```bash
# Criar backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U reservasegura_user reservasegura > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U reservasegura_user reservasegura < backup_20250116.sql
```

### Atualizar Aplicação

```bash
# No seu computador local, fazer commit das mudanças
cd C:/Projetos/ReservaSegura
git add .
git commit -m "Update feature X"

# Copiar para o servidor
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude 'dist' \
    --exclude '.git' \
    C:/Projetos/ReservaSegura/ root@159.89.123.456:/opt/reservasegura/

# No servidor
ssh root@159.89.123.456
cd /opt/reservasegura

# Rebuild e restart
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Limpeza de Recursos

```bash
# Remover containers parados
docker container prune -f

# Remover imagens não usadas
docker image prune -a -f

# Remover volumes não usados (CUIDADO: pode deletar dados)
docker volume prune -f

# Limpeza completa
docker system prune -a --volumes -f
```

### Atualizar Dependências

```bash
# No servidor
cd /opt/reservasegura

# Parar containers
docker-compose -f docker-compose.prod.yml down

# Atualizar imagens base
docker-compose -f docker-compose.prod.yml pull

# Rebuild
docker-compose -f docker-compose.prod.yml build --no-cache

# Iniciar
docker-compose -f docker-compose.prod.yml up -d
```

### Monitoramento de Disco

```bash
# Ver uso de disco
df -h

# Ver uso por container
docker system df

# Limpar logs antigos
journalctl --vacuum-time=7d
```

---

## Comandos Rápidos

### Iniciar/Parar Aplicação

```bash
# Iniciar
cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml up -d

# Parar
cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml down

# Reiniciar
cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml restart

# Reiniciar serviço específico
cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml restart reservasegura-api
```

### Ver Status

```bash
# Status dos containers
cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml ps

# Logs em tempo real
cd /opt/reservasegura && docker-compose -f docker-compose.prod.yml logs -f

# Uso de recursos
docker stats
```

### Acesso aos Containers

```bash
# Shell no container da API
docker-compose -f docker-compose.prod.yml exec reservasegura-api sh

# Shell no container do Web
docker-compose -f docker-compose.prod.yml exec reservasegura-web sh

# Shell no PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres psql -U reservasegura_user reservasegura

# Shell no Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a reservasegura_redis_2024
```

---

## Checklist de Deploy

Antes de considerar o deploy concluído:

- [ ] Droplet criado e acessível via SSH
- [ ] Docker e Docker Compose instalados
- [ ] Firewall configurado (portas 22, 80, 443)
- [ ] Código copiado para `/opt/reservasegura`
- [ ] Arquivo `.env` configurado
- [ ] DNS configurado e propagado
- [ ] Containers rodando (`docker-compose ps`)
- [ ] SSL/TLS funcionando (certificado Let's Encrypt)
- [ ] Frontend acessível em https://reservasegura.com
- [ ] API acessível em https://api.reservasegura.com
- [ ] Grafana acessível em https://monitor.reservasegura.com
- [ ] Logs sem erros críticos
- [ ] Backup configurado
- [ ] Monitoramento funcionando

---

## Suporte

**Documentação:**
- Digital Ocean: https://docs.digitalocean.com
- Docker: https://docs.docker.com
- Traefik: https://doc.traefik.io
- Let's Encrypt: https://letsencrypt.org/docs

**Logs do Deploy:**
Todos os logs estão disponíveis em:
```bash
/opt/reservasegura/
```

**Contato:**
Para suporte técnico, consulte a documentação do projeto ou entre em contato com a equipe de desenvolvimento.

---

**Última atualização:** Janeiro 2025
**Versão:** 1.0.0
