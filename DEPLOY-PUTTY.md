# Deploy ReservaSegura usando PuTTY (Windows)

Guia alternativo para fazer deploy usando PuTTY no Windows.

## Passo 1: Conectar ao Servidor com PuTTY

1. Abra o **PuTTY**
2. Em **Host Name**: `root@209.38.71.115`
3. Em **Port**: `22`
4. Em **Connection > SSH > Auth > Credentials**:
   - **Private key file**: Clique em "Browse" e selecione: `C:\Users\klebe\OneDrive\Documents\Keys\ssh.ppk`
5. Clique em **Open**

## Passo 2: Instalar Dependências

Após conectar ao servidor, execute os comandos abaixo:

```bash
# Atualizar sistema
apt-get update && apt-get upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker --version
docker-compose --version

# Instalar outras ferramentas
apt-get install -y git curl wget nano ufw

# Configurar firewall
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
```

## Passo 3: Criar Diretório do Projeto

```bash
mkdir -p /opt/reservasegura
cd /opt/reservasegura
```

## Passo 4: Copiar Arquivos (WinSCP)

1. Baixe e instale **WinSCP**: https://winscp.net/
2. Abra WinSCP
3. Configure nova conexão:
   - **File protocol**: SFTP
   - **Host name**: `209.38.71.115`
   - **Port**: `22`
   - **User name**: `root`
4. Clique em **Advanced**:
   - **SSH > Authentication > Private key file**: Selecione `C:\Users\klebe\OneDrive\Documents\Keys\ssh.ppk`
5. Clique em **OK** e depois em **Login**

6. No lado esquerdo (local), navegue até: `C:\Projetos\ReservaSegura`
7. No lado direito (servidor), navegue até: `/opt/reservasegura`
8. Selecione todos os arquivos e pastas do projeto (exceto node_modules, .next, dist, .git)
9. Clique em **Upload**

**Aguarde a cópia terminar (pode levar 5-10 minutos)**

## Passo 5: Configurar Variáveis de Ambiente

**No PuTTY (terminal do servidor):**

```bash
cd /opt/reservasegura

# Criar arquivo .env
nano .env
```

Cole o seguinte conteúdo:

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

## Passo 6: Configurar Docker Compose

```bash
cd /opt/reservasegura

# Editar docker-compose.prod.yml
nano docker-compose.prod.yml
```

**Substituir** `reservasegura.com` pelo seu domínio real (se diferente)
**Substituir** `admin@reservasegura.com` pelo seu email

**Salvar:** `Ctrl + O`, Enter, `Ctrl + X`

## Passo 7: Build e Deploy

```bash
cd /opt/reservasegura

# Build das imagens (pode levar 10-15 minutos)
docker-compose -f docker-compose.prod.yml build --no-cache

# Iniciar serviços
docker-compose -f docker-compose.prod.yml up -d

# Verificar status
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f
```

Pressione `Ctrl + C` para sair dos logs.

## Passo 8: Configurar DNS

No seu provedor de domínio (GoDaddy, Registro.br, etc), configure:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | @ | 209.38.71.115 | 3600 |
| CNAME | www | reservasegura.com | 3600 |
| A | api | 209.38.71.115 | 3600 |
| A | traefik | 209.38.71.115 | 3600 |
| A | monitor | 209.38.71.115 | 3600 |
| A | metrics | 209.38.71.115 | 3600 |
| A | status | 209.38.71.115 | 3600 |

**Aguarde 30 minutos a 2 horas para propagação**

## Passo 9: Verificar Deploy

Após propagação do DNS:

- **Frontend:** https://reservasegura.com
- **API:** https://api.reservasegura.com/health
- **Grafana:** https://monitor.reservasegura.com
  - Usuário: `admin`
  - Senha: `reservasegura_grafana_admin_2024`

## Comandos Úteis

```bash
# Ver status
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Ver logs de um serviço específico
docker-compose -f docker-compose.prod.yml logs -f reservasegura-api
docker-compose -f docker-compose.prod.yml logs -f reservasegura-web

# Reiniciar
docker-compose -f docker-compose.prod.yml restart

# Parar
docker-compose -f docker-compose.prod.yml down

# Iniciar
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Containers não iniciam

```bash
# Ver erro específico
docker-compose -f docker-compose.prod.yml logs

# Recriar containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Certificado SSL não gerado

```bash
# Ver logs do Traefik
docker-compose -f docker-compose.prod.yml logs traefik

# Verificar se DNS está propagado
nslookup reservasegura.com

# Reiniciar Traefik
docker-compose -f docker-compose.prod.yml restart traefik
```

### Erro de memória/build

```bash
# Ver uso de recursos
docker stats

# Limpar cache do Docker
docker system prune -a -f

# Rebuild
docker-compose -f docker-compose.prod.yml build --no-cache
```

---

## Pronto!

Seu deploy está completo! 🎉

Para suporte adicional, consulte **DEPLOY.md** para documentação completa.
