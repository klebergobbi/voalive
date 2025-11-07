# Sistema de Monitoramento de Reservas Aéreas - IMPLEMENTADO ✅

## 📋 Resumo da Implementação

O sistema completo de monitoramento de reservas aéreas foi implementado com sucesso, incluindo:

### ✅ Componentes Implementados

#### 1. **Sistema de Scraping Anti-Detecção** (`apps/api/src/scrapers/`)
- ✅ `base.scraper.ts` - Classe base com anti-detecção Playwright
- ✅ `latam.scraper.ts` - Scraper específico para LATAM Airlines
- ✅ `gol.scraper.ts` - Scraper específico para GOL
- ✅ `azul.scraper.ts` - Scraper específico para Azul
- ✅ `scraper.factory.ts` - Factory pattern para instanciar scrapers

**Features:**
- Rotação de User Agents
- Randomização de delays (300-1500ms)
- Remoção de sinais de automação
- Detecção de CAPTCHA
- Screenshots para debug

#### 2. **Serviço de Monitoramento** (`apps/api/src/services/`)
- ✅ `airline-monitoring.service.ts` - Serviço principal de monitoramento
- ✅ `webhook-notification.service.ts` - Sistema de notificações via webhooks

**Features:**
- Detecção automática de mudanças de status
- Comparação de voo, origem, destino, assento, portão, terminal
- Agendamento inteligente (5min após mudança, 15min estável)
- Notificações com retry e backoff exponencial
- Assinatura HMAC para webhooks

#### 3. **Sistema de Filas BullMQ** (`apps/api/src/queues/`)
- ✅ `queue-manager.ts` - Gerenciador de filas com Redis
- ✅ `booking-monitor.processor.ts` - Worker que processa jobs

**Features:**
- Concorrência configurável (5 jobs simultâneos)
- Rate limiting (10 jobs/minuto)
- Retry automático com backoff exponencial
- Dead letter queue para jobs falhos
- Estatísticas e métricas em tempo real

#### 4. **API REST** (`apps/api/src/routes/`)
- ✅ `airline-monitoring.routes.ts` - Rotas REST completas

**Endpoints:**
```
POST   /api/monitoring/bookings          - Adiciona reserva ao monitoramento
GET    /api/monitoring/bookings/:pnr     - Consulta histórico
DELETE /api/monitoring/bookings/:pnr     - Remove do monitoramento
POST   /api/monitoring/bookings/:pnr/check - Força verificação imediata
GET    /api/monitoring/airlines           - Lista companhias suportadas
GET    /api/monitoring/queue/stats        - Estatísticas da fila
POST   /api/monitoring/queue/clean        - Limpa jobs antigos
POST   /api/monitoring/webhook/test       - Testa webhook
GET    /api/health                        - Health check
GET    /api/metrics                       - Métricas do sistema
```

#### 5. **Utilitários** (`apps/api/src/utils/`)
- ✅ `logger.util.ts` - Sistema de logging estruturado

---

## 🚀 Como Usar

### 1. Instalação de Dependências

```bash
cd /c/Projetos/VoaLive
npm install bullmq axios
npx playwright install chromium --with-deps
```

### 2. Configuração (`.env`)

```env
# Redis (para BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Webhooks
WEBHOOK_URL=https://seu-servidor.com/api/webhooks/booking-status
WEBHOOK_SECRET=seu_secret_seguro_aqui

# Scraping
SCRAPING_TIMEOUT=30000
MAX_RETRIES=3
HEADLESS=true
```

### 3. Integração no Servidor Principal

Adicione no arquivo principal da API (ex: `apps/api/src/index.ts`):

```typescript
import { getQueueManager } from './queues/queue-manager';
import airlineMonitoringRoutes from './routes/airline-monitoring.routes';

// Inicializar sistema de filas
const queueManager = getQueueManager();
await queueManager.initialize();

// Registrar rotas
app.use('/api/monitoring', airlineMonitoringRoutes);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await queueManager.close();
  process.exit(0);
});
```

### 4. Deploy para Produção

```bash
chmod +x deploy-airline-monitoring.sh
./deploy-airline-monitoring.sh
```

---

## 📊 Exemplos de Uso

### Adicionar Reserva para Monitoramento

```bash
curl -X POST http://localhost:3012/api/monitoring/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "pnr": "ABC123",
    "airline": "LATAM",
    "lastName": "SILVA",
    "flightNumber": "LA3090",
    "departureDate": "2025-12-15T10:00:00Z",
    "route": "GRU-BSB",
    "checkInterval": 15
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "clm123...",
    "pnr": "ABC123",
    "airline": "LATAM",
    "flightNumber": "LA3090",
    "route": "GRU → BSB",
    "departureDate": "2025-12-15T10:00:00.000Z",
    "status": "CONFIRMED",
    "autoUpdate": true
  },
  "message": "Reserva adicionada ao monitoramento com sucesso"
}
```

### Consultar Histórico

```bash
curl http://localhost:3012/api/monitoring/bookings/ABC123
```

### Forçar Verificação Imediata

```bash
curl -X POST http://localhost:3012/api/monitoring/bookings/ABC123/check
```

### Remover do Monitoramento

```bash
curl -X DELETE http://localhost:3012/api/monitoring/bookings/ABC123
```

### Testar Webhook

```bash
curl -X POST http://localhost:3012/api/monitoring/webhook/test
```

---

## 🔔 Payload do Webhook

Quando uma mudança é detectada, o webhook recebe:

```json
{
  "event": "booking.status.changed",
  "timestamp": "2025-11-04T15:30:00.000Z",
  "data": {
    "pnr": "ABC123",
    "airline": "LATAM",
    "flightNumber": "LA3090",
    "route": "GRU-BSB",
    "departureDate": "2025-12-15T10:00:00Z",
    "oldStatus": "WL",
    "newStatus": "HK",
    "statusName": "Confirmado",
    "details": {
      "seatNumbers": ["12A"],
      "gate": "15",
      "terminal": "3"
    }
  }
}
```

**Headers:**
- `Content-Type: application/json`
- `X-Webhook-Secret: seu_secret`
- `X-Webhook-Signature: hmac_sha256_signature`

---

## 📈 Monitoramento e Métricas

### Health Check

```bash
curl http://localhost:3012/api/health
```

**Resposta:**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "queue": {
    "status": "healthy",
    "stats": {
      "waiting": 5,
      "active": 2,
      "completed": 150,
      "failed": 3,
      "delayed": 10
    }
  },
  "timestamp": "2025-11-04T15:30:00.000Z"
}
```

### Métricas

```bash
curl http://localhost:3012/api/metrics
```

---

## 🎯 Funcionalidades Implementadas

### ✅ Detecção de Mudanças

O sistema detecta automaticamente:

1. **Mudança de número de voo** (Severidade: CRITICAL)
2. **Mudança de origem/destino** (Severidade: CRITICAL)
3. **Mudança de assento** (Severidade: MEDIUM)
4. **Mudança de portão** (Severidade: HIGH)
5. **Mudança de terminal** (Severidade: HIGH)

### ✅ Agendamento Inteligente

- **5 minutos** após detectar mudança (para acompanhar alterações rápidas)
- **15 minutos** quando status está estável
- **30-120 minutos** após erro (com backoff exponencial)

### ✅ Retry e Resiliência

- **3 tentativas automáticas** para cada verificação
- **Backoff exponencial** (5s, 10s, 20s)
- **Circuit breaker** após 3 falhas consecutivas
- **Notificações de erro** para o usuário

### ✅ Segurança

- **HMAC SHA256** para assinatura de webhooks
- **Rate limiting** (10 jobs/minuto)
- **Timeout** configurável (30s padrão)
- **Validação de entrada** em todos os endpoints

---

## 🔧 Configurações Avançadas

### Ajustar Concorrência

No arquivo `queue-manager.ts`:

```typescript
concurrency: 5  // Aumentar para mais jobs simultâneos
```

### Ajustar Rate Limiting

```typescript
limiter: {
  max: 10,        // Máximo de jobs
  duration: 60000 // Por período (ms)
}
```

### Ajustar Intervalo de Verificação

Ao adicionar reserva:

```json
{
  "checkInterval": 5  // Minutos entre verificações
}
```

---

## 📝 Logs Estruturados

Todos os logs seguem o formato:

```
[2025-11-04T15:30:00.000Z] [INFO] [LatamScraper] Consultando reserva LATAM - PNR: ABC123
[2025-11-04T15:30:05.000Z] [INFO] [AirlineMonitoringService] 2 mudança(s) detectada(s) em ABC123
[2025-11-04T15:30:06.000Z] [INFO] [WebhookNotificationService] Webhook enviado com sucesso em 234ms
```

---

## 🚨 Tratamento de Erros

### CAPTCHA Detectado

```json
{
  "success": false,
  "error": "CAPTCHA detectado - necessário resolução manual"
}
```

**Solução:** Sistema envia notificação e agenda retry com delay maior.

### Reserva Não Encontrada

```json
{
  "success": false,
  "error": "Reserva não encontrada"
}
```

**Solução:** Verificar PNR e sobrenome, ou reserva pode ter sido cancelada.

### Timeout

Após 3 timeouts consecutivos, o sistema:
1. Aumenta intervalo de verificação para 120 minutos
2. Envia notificação de erro
3. Continua tentando com backoff exponencial

---

## 🎓 Melhores Práticas

### 1. Monitoramento de Produção

```bash
# Ver logs em tempo real
ssh root@159.89.80.179 'docker-compose logs -f api | grep -i "monitoring\|scraper\|webhook"'

# Ver estatísticas da fila
curl http://159.89.80.179:3012/api/monitoring/queue/stats
```

### 2. Limpeza Periódica

```bash
# Limpar jobs antigos (executar semanalmente)
curl -X POST http://localhost:3012/api/monitoring/queue/clean
```

### 3. Teste de Webhooks

Sempre teste após mudanças:

```bash
curl -X POST http://localhost:3012/api/monitoring/webhook/test
```

---

## 📚 Próximos Passos Sugeridos

1. **Dashboard Web** para visualizar reservas monitoradas
2. **Notificações Push** via Firebase Cloud Messaging
3. **Email e SMS** como canais adicionais
4. **Machine Learning** para prever mudanças
5. **Suporte a mais companhias** (Avianca, Copa, etc)
6. **API GraphQL** como alternativa ao REST

---

## 🤝 Suporte

Para issues ou dúvidas:
- Verificar logs: `docker-compose logs -f api`
- Health check: `curl http://localhost:3012/api/health`
- Métricas: `curl http://localhost:3012/api/metrics`

---

**Status:** ✅ SISTEMA PRONTO PARA PRODUÇÃO

**Data de Implementação:** 04/11/2025

**Desenvolvido por:** Claude Code + Kleber Cavalcanti
