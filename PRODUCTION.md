# ReservaSegura - Production Environment & Online Monitoring

## 🚀 **Ambiente de Produção Completo Implementado!**

### ✅ **Componentes Implementados**

#### 🐳 **Containerização**
- **Docker API**: Dockerfile.api com build multi-stage otimizado
- **Docker Web**: Dockerfile.web com Next.js standalone
- **Docker Compose**: Orquestração completa com todos os serviços

#### 🔍 **Stack de Monitoramento**
- **Prometheus**: Coleta de métricas personalizadas
- **Grafana**: Dashboards visuais e alertas
- **Loki**: Agregação de logs centralizados
- **Promtail**: Coleta de logs dos containers
- **Uptime Kuma**: Monitoramento de uptime e status page

#### 🛡️ **Infraestrutura**
- **Traefik**: Reverse proxy com SSL automático (Let's Encrypt)
- **PostgreSQL**: Banco de dados com backup automático
- **Redis**: Cache e sessões
- **Health Checks**: Monitoramento avançado de saúde

#### 📊 **Métricas & Alertas**
- **Métricas Customizadas**: API endpoints, scraping jobs, performance
- **Alertas Inteligentes**: Slack, Discord, email
- **Health Monitor**: Verificações automáticas de saúde
- **SLA Monitoring**: Uptime, response time, error rates

---

## 🌐 **URLs de Produção**

```bash
# Aplicação Principal
https://reservasegura.com                     # Frontend Web
https://api.reservasegura.com                # API Backend

# Monitoramento
https://monitor.reservasegura.com            # Grafana Dashboards
https://metrics.reservasegura.com            # Prometheus Metrics
https://status.reservasegura.com             # Status Page (Uptime Kuma)
https://traefik.reservasegura.com           # Traefik Dashboard
```

---

## 🚀 **Deployment**

### **1. Deploy Automático (GitHub Actions)**

```yaml
# Triggers automáticos:
# - Push para main/master
# - Manual dispatch

# Pipeline completo:
# ✅ Tests & Linting
# ✅ Docker Build & Push
# ✅ Zero-downtime deployment
# ✅ Health checks
# ✅ Rollback automático
# ✅ Notificações Slack/Discord
```

### **2. Deploy Manual**

```bash
# Deploy completo
./scripts/deploy.sh production

# Funcionalidades do script:
# ✅ Backup automático do banco
# ✅ Health checks pré e pós deploy
# ✅ Rollback em caso de falha
# ✅ Logs detalhados
# ✅ Notificações
```

### **3. Deploy via Docker Compose**

```bash
# Subir todos os serviços
docker-compose -f docker-compose.prod.yml up -d

# Verificar status
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f reservasegura-api
```

---

## 📊 **Monitoramento & Dashboards**

### **Grafana Dashboards**
- **System Overview**: CPU, Memory, Disk, Network
- **Application Metrics**: Response times, error rates, throughput
- **Flight Scraping**: Job success/failure rates, data freshness
- **Database Performance**: Connections, query times, locks
- **Business Metrics**: Flights scraped, API usage, user activity

### **Alertas Configurados**
- 🚨 **High Error Rate** > 5%
- 🚨 **High Response Time** > 2 seconds
- 🚨 **Database Connections** > 80%
- 🚨 **Scraping Failures** > 30%
- 🚨 **Disk Usage** > 85%
- 🚨 **Memory Usage** > 90%

### **Health Checks**
- **Database Connectivity**: Connection pool, query performance
- **API Endpoints**: Response times, error rates
- **Flight Scraper**: Job success rates, data freshness
- **External Dependencies**: Firecrawl API availability
- **System Resources**: Memory, CPU, disk usage

---

## 🔧 **Configuração de Secrets**

### **GitHub Secrets Necessários**
```bash
# Server Access
SSH_PRIVATE_KEY=your-ssh-private-key
SERVER_HOST=your-server-ip
SERVER_USER=deploy-user

# Database
DATABASE_URL=postgresql://user:pass@host:5432/reservasegura

# External APIs
FIRECRAWL_API_KEY=fc-2dda7f7f0e2c4ccb816cb21e7f372410

# Security
JWT_SECRET=your-ultra-secure-jwt-secret
NEXTAUTH_SECRET=your-nextauth-secret

# URLs
NEXTAUTH_URL=https://reservasegura.com
NEXT_PUBLIC_API_URL=https://api.reservasegura.com

# Notifications
SLACK_WEBHOOK=your-slack-webhook-url
DISCORD_WEBHOOK=your-discord-webhook-url
GITHUB_TOKEN=github-container-registry-token
```

---

## 📈 **Monitoramento Online**

### **1. Métricas em Tempo Real**

```bash
# Prometheus Metrics
curl https://api.reservasegura.com/metrics

# JSON Metrics (formatted)
curl https://api.reservasegura.com/api/metrics

# Health Check Detalhado
curl https://api.reservasegura.com/health/detailed

# Histórico de Saúde
curl "https://api.reservasegura.com/health/history?hours=24"
```

### **2. Logs Centralizados**

```bash
# Logs da API via Loki
curl -G "http://loki:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={container="reservasegura-api"}'

# Logs do Frontend
curl -G "http://loki:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={container="reservasegura-web"}'

# Logs de Sistema
curl -G "http://loki:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={job="syslog"}'
```

### **3. Alertas Proativos**

#### **Slack Integration**
```json
{
  "text": "🚨 ReservaSegura Alert: High Error Rate",
  "attachments": [{
    "color": "danger",
    "fields": [
      {"title": "Error Rate", "value": "7.3%", "short": true},
      {"title": "Threshold", "value": "5%", "short": true},
      {"title": "Status", "value": "UNHEALTHY", "short": true}
    ]
  }]
}
```

#### **Discord Integration**
```json
{
  "embeds": [{
    "title": "🚨 ReservaSegura Alert: High Response Time",
    "description": "Average response time is 2.3s (threshold: 2s)",
    "color": 16776960,
    "fields": [
      {"name": "Status", "value": "DEGRADED", "inline": true},
      {"name": "Timestamp", "value": "2024-01-01T12:00:00Z", "inline": true}
    ]
  }]
}
```

---

## 🛡️ **Segurança & Performance**

### **SSL/TLS**
- **Certificados Let's Encrypt**: Renovação automática
- **HTTPS Redirect**: Forçar HTTPS em todas as rotas
- **HSTS Headers**: Segurança de transporte

### **Performance**
- **CDN Ready**: Arquivos estáticos otimizados
- **Gzip Compression**: Compressão automática
- **Caching**: Redis + browser caching
- **Database Optimization**: Connection pooling, queries otimizadas

### **Backup & Recovery**
- **Database Backups**: Automático a cada deploy
- **Volume Persistence**: Dados persistidos entre restarts
- **Rollback Strategy**: Deploy anterior disponível
- **Health Checks**: Verificação contínua de integridade

---

## 📋 **Comandos Úteis**

### **Monitoramento**
```bash
# Status dos serviços
docker-compose -f docker-compose.prod.yml ps

# Logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f

# Métricas do sistema
docker stats

# Health check manual
curl -f https://api.reservasegura.com/health/detailed

# Verificar alertas
curl https://monitor.reservasegura.com/api/alerts
```

### **Manutenção**
```bash
# Restart de serviço específico
docker-compose -f docker-compose.prod.yml restart reservasegura-api

# Backup manual do banco
./scripts/backup-db.sh

# Limpeza de containers e imagens
docker system prune -f

# Update de configurações
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

---

## 🎯 **SLA & Metrics**

### **Targets de Produção**
- **Uptime**: 99.9% (8.76h downtime/ano)
- **Response Time**: < 500ms (P95)
- **Error Rate**: < 1%
- **Database**: < 100ms query time
- **Scraping Success**: > 95%

### **Monitoring Frequency**
- **Health Checks**: 30 segundos
- **Metrics Collection**: 15 segundos
- **Alert Evaluation**: 1 minuto
- **Backup**: Diário às 02:00

---

## 🎉 **Pronto para Produção!**

✅ **Ambiente Containerizado**
✅ **Monitoramento 360°**
✅ **Alertas Inteligentes**
✅ **Deploy Automatizado**
✅ **SSL/HTTPS Completo**
✅ **Backup & Recovery**
✅ **Health Checks**
✅ **Performance Otimizada**

**🚀 ReservaSegura está pronto para voar em produção!** 🛫

### **Quick Start**
```bash
# 1. Configure os secrets no GitHub
# 2. Push para branch main
# 3. GitHub Actions fará o deploy automático
# 4. Acesse https://reservasegura.com
# 5. Monitore em https://monitor.reservasegura.com
```