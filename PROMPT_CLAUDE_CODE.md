# PROMPT COMPLETO PARA CLAUDE CODE
## Sistema de Monitoramento de Status de Reservas Aéreas

---

## 🎯 CONTEXTO DO PROJETO

Sou um engenheiro de infraestrutura com 20+ anos de experiência e preciso implementar um sistema robusto de monitoramento de reservas aéreas. Já possuo um aplicativo que monitora voos, mas ele **não detecta mudanças de status nas reservas** (ex: confirmado → cancelado, lista de espera → confirmado).

### Objetivo
Criar um sistema de web scraping profissional que:
- Monitore PNRs de companhias aéreas brasileiras 24/7
- Detecte automaticamente mudanças de status
- Dispare notificações em tempo real via webhooks
- Seja escalável, resiliente e pronto para produção

---

## 🏗️ ESPECIFICAÇÕES TÉCNICAS

### Stack Obrigatória
```
Backend Framework: NestJS (TypeScript estrito)
Web Scraping: Playwright (com anti-detecção)
Queue System: BullMQ + Redis
Database: PostgreSQL 15+ com Prisma ORM
Containerization: Docker + Docker Compose
Logging: Winston com formato estruturado
Monitoring: Prometheus métricas + Health checks
```

### Companhias Aéreas Target (Ordem de Prioridade)
1. **LATAM Airlines** (latamairlines.com/br/pt)
2. **GOL Linhas Aéreas** (voegol.com.br)
3. **Azul Linhas Aéreas** (voeazul.com.br)

---

## 📋 REQUISITOS FUNCIONAIS

### 1. Sistema de Scraping Anti-Detecção

**Requisitos:**
- Implementar classe base abstrata para scrapers
- Criar scraper específico para cada companhia aérea
- Factory pattern para instanciar scrapers apropriados
- Técnicas anti-detecção:
  * Remover `navigator.webdriver`
  * Injetar `window.chrome` object
  * Randomizar user agents
  * Viewport sizes variados
  * Delays humanos entre ações (300-1500ms)
  * Locale e timezone brasileiros

**Código Esperado:**
```typescript
export abstract class BaseScraper {
  protected browser: Browser;
  protected page: Page;
  
  async initialize(): Promise<void> {
    // Configurar Playwright com anti-detecção
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });
    
    // Injetar scripts anti-detecção
    await this.context.addInitScript(() => {
      delete Object.getPrototypeOf(navigator).webdriver;
    });
  }
  
  abstract checkBookingStatus(pnr: string, lastName: string): Promise<BookingStatus>;
}
```

### 2. Scrapers Específicos por Companhia

**LATAM Scraper:**
- URL: https://www.latamairlines.com/br/pt/minhas-viagens
- Fluxo:
  1. Navegar para página de consulta
  2. Preencher PNR e sobrenome
  3. Aguardar carregamento (waitForSelector)
  4. Extrair dados da reserva
  5. Mapear status para código IATA

**GOL Scraper:**
- URL: https://www.voegol.com.br/pt-br/minhas-reservas
- Diferencial: Pode ter CAPTCHA, implementar fallback

**Azul Scraper:**
- URL: https://www.voeazul.com.br/br/pt/minhas-viagens
- Diferencial: Tem API REST em alguns casos, tentar intercept primeiro

**Mapeamento de Status IATA:**
```typescript
const STATUS_MAP = {
  'confirmado': 'HK',      // Confirmed
  'confirmed': 'HK',
  'cancelado': 'HX',       // Cancelled
  'cancelled': 'HX',
  'lista de espera': 'WL', // Waitlisted
  'waitlist': 'WL',
  'em espera': 'HL',       // On Hold
  'on hold': 'HL',
};
```

### 3. Sistema de Filas e Agendamento (BullMQ)

**Requisitos:**
- Queue name: `booking-monitor`
- Job types:
  * `check-status`: Verificar status de um PNR
- Estratégia de agendamento:
  * **Após mudança detectada:** próximo check em 5 minutos
  * **Status estável:** próximo check em 15 minutos
  * **Erro de scraping:** retry em 30 minutos (backoff exponencial)
- Configuração de retry:
  * Tentativas: 3
  * Backoff: exponencial starting 5s

**Código Esperado:**
```typescript
@Processor('booking-monitor')
export class MonitoringProcessor extends WorkerHost {
  async process(job: Job) {
    switch (job.name) {
      case 'check-status':
        return this.handleCheckStatus(job);
    }
  }
  
  private async handleCheckStatus(job: Job) {
    const { bookingId } = job.data;
    await this.monitoringService.checkBookingStatus(bookingId);
  }
}
```

### 4. Serviço de Monitoramento

**Fluxo Principal:**
```
1. Receber PNR para monitorar (via API)
2. Salvar no banco com status inicial "PENDING"
3. Agendar job imediato para primeiro check
4. Worker processa job:
   a. Buscar dados do booking no DB
   b. Executar scraper apropriado
   c. Comparar status atual vs anterior
   d. Se mudou:
      - Atualizar banco
      - Registrar em StatusHistory
      - Disparar webhook
      - Agendar próximo check em 5min
   e. Se não mudou:
      - Atualizar lastChecked
      - Agendar próximo check em 15min
```

**Interface Esperada:**
```typescript
interface BookingStatus {
  pnr: string;
  status: string;          // "Confirmado", "Cancelado", etc
  statusCode: string;      // HK, HX, WL, HL
  flightNumber: string;
  departure: string;       // Código IATA (ex: GRU)
  arrival: string;         // Código IATA (ex: BSB)
  date: string;           // ISO 8601
  passengers: string[];
  seatNumbers?: string[];
}
```

### 5. Sistema de Notificações (Webhooks)

**Requisitos:**
- Enviar POST para URL configurada em WEBHOOK_URL
- Headers:
  * `Content-Type: application/json`
  * `X-Webhook-Secret: {WEBHOOK_SECRET}`
- Timeout: 10 segundos
- Retry: até 3 tentativas com backoff
- Registrar todas notificações na tabela Notification

**Payload do Webhook:**
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
    "passengers": ["SILVA/JOAO MR"],
    "details": {
      "seatNumbers": ["12A"],
      "checkedAt": "2025-11-04T15:30:00.000Z"
    }
  }
}
```

### 6. API REST

**Endpoints Obrigatórios:**

```
POST   /api/monitoring/bookings
GET    /api/monitoring/bookings/:pnr
DELETE /api/monitoring/bookings/:pnr
POST   /api/monitoring/bookings/:pnr/check
GET    /api/health
GET    /api/metrics
```

**Exemplo de Request (POST /bookings):**
```json
{
  "pnr": "ABC123",
  "airline": "LATAM",
  "lastName": "SILVA",
  "flightNumber": "LA3090",
  "departureDate": "2025-12-15T10:00:00Z",
  "route": "GRU-BSB",
  "checkInterval": 15
}
```

**Exemplo de Response (GET /bookings/:pnr):**
```json
{
  "id": "uuid",
  "pnr": "ABC123",
  "airline": "LATAM",
  "status": "HK",
  "previousStatus": "WL",
  "flightNumber": "LA3090",
  "route": "GRU-BSB",
  "departureDate": "2025-12-15T10:00:00Z",
  "lastChecked": "2025-11-04T15:30:00Z",
  "isActive": true,
  "statusHistory": [
    {
      "oldStatus": "WL",
      "newStatus": "HK",
      "changedAt": "2025-11-04T15:30:00Z"
    }
  ],
  "notifications": [
    {
      "type": "webhook",
      "sentAt": "2025-11-04T15:30:05Z",
      "success": true
    }
  ]
}
```

### 7. Schema do Banco de Dados (Prisma)

**Tabelas Obrigatórias:**

```prisma
model Booking {
  id            String   @id @default(uuid())
  pnr           String   @unique
  airline       String   // "LATAM", "GOL", "AZUL"
  lastName      String
  status        String   // Código IATA atual: HK, HX, WL, HL
  previousStatus String?
  flightNumber  String
  departureDate DateTime
  route         String   // Ex: "GRU-BSB"
  checkInterval Int      @default(15) // Minutos
  lastChecked   DateTime @default(now())
  isActive      Boolean  @default(true)
  metadata      Json?    // Dados completos do último scraping
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  statusHistory StatusHistory[]
  notifications Notification[]
  
  @@index([pnr])
  @@index([airline])
  @@index([isActive])
  @@index([lastChecked])
}

model StatusHistory {
  id          String   @id @default(uuid())
  bookingId   String
  booking     Booking  @relation(fields: [bookingId], references: [id])
  oldStatus   String?
  newStatus   String
  changedAt   DateTime @default(now())
  details     Json?
  
  @@index([bookingId])
  @@index([changedAt])
}

model Notification {
  id          String   @id @default(uuid())
  bookingId   String
  booking     Booking  @relation(fields: [bookingId], references: [id])
  type        String   // "webhook", "email", "sms"
  payload     Json
  sentAt      DateTime @default(now())
  success     Boolean
  response    Json?
  
  @@index([bookingId])
  @@index([sentAt])
}
```

---

## 🐳 INFRAESTRUTURA E CONFIGURAÇÃO

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: airline_monitor
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### .env.example
```bash
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://admin:secure_password@localhost:5432/airline_monitor"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Scraping Configuration
SCRAPING_TIMEOUT=30000
MAX_RETRIES=3
HEADLESS=true

# Webhooks
WEBHOOK_URL=https://your-server.com/api/webhooks/booking-status
WEBHOOK_SECRET=your_webhook_secret_here

# Monitoring
SENTRY_DSN=
```

---

## 📁 ESTRUTURA DE ARQUIVOS ESPERADA

```
airline-monitor/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── config/
│   │   └── configuration.ts
│   │
│   ├── scrapers/
│   │   ├── base.scraper.ts
│   │   ├── latam.scraper.ts
│   │   ├── gol.scraper.ts
│   │   ├── azul.scraper.ts
│   │   ├── scraper.factory.ts
│   │   └── scrapers.module.ts
│   │
│   ├── monitoring/
│   │   ├── monitoring.service.ts
│   │   ├── monitoring.processor.ts
│   │   ├── monitoring.controller.ts
│   │   ├── dto/
│   │   │   └── add-booking.dto.ts
│   │   └── monitoring.module.ts
│   │
│   ├── notifications/
│   │   ├── notification.service.ts
│   │   └── notifications.module.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   │
│   └── common/
│       ├── interfaces/
│       │   └── booking-status.interface.ts
│       └── utils/
│           └── logger.util.ts
│
├── prisma/
│   └── migrations/
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

---

## 🎯 CRITÉRIOS DE QUALIDADE

### Código
✅ TypeScript com tipos estritos (no `any` desnecessário)
✅ Classes e métodos documentados com JSDoc
✅ Tratamento de erros robusto com try/catch
✅ Logging estruturado em todos pontos críticos
✅ Validação de entrada com class-validator
✅ Constants em arquivos separados (magic numbers proibidos)

### Arquitetura
✅ Separação clara de responsabilidades
✅ Dependency Injection (NestJS)
✅ Design Patterns: Factory, Strategy, Repository
✅ Modularização adequada
✅ Interfaces para contratos

### Performance
✅ Índices de banco otimizados
✅ Queries eficientes (evitar N+1)
✅ Cache com Redis quando aplicável
✅ Conexões pooling
✅ Timeouts configurados

### Confiabilidade
✅ Graceful shutdown implementado
✅ Health checks funcionais
✅ Retries com backoff exponencial
✅ Circuit breaker para APIs externas
✅ Dead letter queue para jobs falhos

### Observabilidade
✅ Logs estruturados (JSON)
✅ Métricas Prometheus exportadas
✅ Traces de erros com stack completo
✅ Request IDs para rastreamento

---

## 🚨 DESAFIOS TÉCNICOS A RESOLVER

### 1. CAPTCHAs
- Implementar detecção de CAPTCHA
- Logging quando encontrado
- Fallback para retry após delay maior
- (Opcional) Integração com serviço de resolução

### 2. Rate Limiting
- Respeitar limites dos sites
- Implementar delays entre requests
- Detectar bloqueio de IP
- Rotação de proxies (opcional)

### 3. Mudanças no HTML
- Usar múltiplos seletores (fallback)
- Logging detalhado quando seletores falham
- Sistema de alertas para devs

### 4. Timeouts
- Configurar timeouts adequados
- Retry automático
- Não deixar browsers orphans

### 5. Memória e CPU
- Fechar browsers após uso
- Limitar workers concorrentes
- Monitorar uso de recursos

---

## 📝 TAREFAS DE IMPLEMENTAÇÃO

### Fase 1: Setup Base (30 min)
1. Inicializar projeto NestJS
2. Configurar TypeScript estrito
3. Instalar dependências:
   - `playwright`
   - `@nestjs/bullmq`
   - `bullmq`
   - `ioredis`
   - `@prisma/client`
   - `class-validator`
   - `class-transformer`
   - `winston`
4. Criar docker-compose.yml
5. Setup Prisma schema

### Fase 2: Scrapers (60 min)
1. Criar BaseScraper abstrato
2. Implementar LatamScraper
3. Implementar GolScraper
4. Implementar AzulScraper
5. Criar ScraperFactory
6. Testes manuais de cada scraper

### Fase 3: Sistema de Filas (45 min)
1. Configurar BullMQ
2. Criar MonitoringProcessor
3. Implementar job handlers
4. Configurar retry strategies
5. Dead letter queue

### Fase 4: Serviço de Monitoramento (60 min)
1. Criar MonitoringService
2. Implementar lógica de detecção de mudanças
3. Integrar com scrapers
4. Integrar com filas
5. Implementar agendamento inteligente

### Fase 5: Notificações (30 min)
1. Criar NotificationService
2. Implementar envio de webhooks
3. Retry logic
4. Logging de notificações

### Fase 6: API REST (30 min)
1. Criar MonitoringController
2. Implementar endpoints
3. DTOs e validação
4. Documentação Swagger (opcional)

### Fase 7: Testes e Refinamento (30 min)
1. Testar fluxo completo end-to-end
2. Verificar logs
3. Testar retry scenarios
4. Health checks
5. Métricas

---

## 🧪 TESTES ESPERADOS

### Cenários de Teste Obrigatórios

**1. Adicionar PNR ao Monitoramento**
```bash
curl -X POST http://localhost:3000/api/monitoring/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "pnr": "TEST01",
    "airline": "LATAM",
    "lastName": "TESTE",
    "flightNumber": "LA3090",
    "departureDate": "2025-12-15T10:00:00Z",
    "route": "GRU-BSB",
    "checkInterval": 5
  }'

# Esperado: HTTP 201 Created com dados da reserva
```

**2. Consultar Status**
```bash
curl http://localhost:3000/api/monitoring/bookings/TEST01

# Esperado: Dados completos incluindo histórico
```

**3. Forçar Verificação Imediata**
```bash
curl -X POST http://localhost:3000/api/monitoring/bookings/TEST01/check

# Esperado: Job agendado imediatamente
```

**4. Parar Monitoramento**
```bash
curl -X DELETE http://localhost:3000/api/monitoring/bookings/TEST01

# Esperado: HTTP 204 No Content
```

**5. Health Check**
```bash
curl http://localhost:3000/api/health

# Esperado:
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "queue": "healthy"
}
```

---

## 📊 EXEMPLO DE LOGS ESPERADOS

```json
{
  "timestamp": "2025-11-04T15:30:00.000Z",
  "level": "info",
  "context": "MonitoringService",
  "message": "Status mudou para PNR ABC123: WL → HK",
  "pnr": "ABC123",
  "airline": "LATAM",
  "oldStatus": "WL",
  "newStatus": "HK"
}

{
  "timestamp": "2025-11-04T15:30:05.000Z",
  "level": "info",
  "context": "NotificationService",
  "message": "Webhook enviado com sucesso",
  "pnr": "ABC123",
  "responseTime": 234,
  "statusCode": 200
}

{
  "timestamp": "2025-11-04T15:30:10.000Z",
  "level": "error",
  "context": "LatamScraper",
  "message": "Timeout ao consultar PNR",
  "pnr": "XYZ789",
  "error": "Navigation timeout exceeded",
  "stack": "..."
}
```

---

## ⚡ COMANDOS DE EXECUÇÃO

```bash
# 1. Setup inicial
docker-compose up -d
npx prisma migrate dev --name init
npm run build

# 2. Desenvolvimento
npm run start:dev

# 3. Produção
npm run build
npm run start:prod

# 4. Testes
npm run test

# 5. Logs
docker-compose logs -f

# 6. Acessar banco
docker-compose exec postgres psql -U admin -d airline_monitor

# 7. Verificar fila Redis
docker-compose exec redis redis-cli
> KEYS booking-monitor:*
```

---

## 🎁 ENTREGÁVEIS FINAIS

Ao final da implementação, você deve entregar:

1. ✅ Código-fonte completo e funcional
2. ✅ docker-compose.yml configurado
3. ✅ .env.example com todas variáveis
4. ✅ README.md com instruções claras
5. ✅ Migrations Prisma aplicadas
6. ✅ Todos endpoints testados e funcionando
7. ✅ Logs estruturados implementados
8. ✅ Health checks funcionais
9. ✅ Tratamento de erros robusto
10. ✅ Sistema pronto para deploy em produção

---

## 🚀 INSTRUÇÕES FINAIS PARA CLAUDE CODE

**IMPORTANTE:**

1. **NÃO CRIE CÓDIGO PLACEHOLDER**
   - Todo código deve estar completo e funcional
   - Sem comentários `// TODO:` ou `// Implementar depois`
   - Sistema deve rodar imediatamente após setup

2. **PRIORIZE QUALIDADE**
   - Código limpo e bem documentado
   - Tratamento de erros em todos os pontos críticos
   - Logs em todas operações importantes

3. **SEJA ESPECÍFICO**
   - Use os nomes exatos de arquivos e pastas especificados
   - Siga a estrutura de diretórios proposta
   - Implemente todos os métodos mencionados

4. **TESTE MENTALMENTE**
   - Pense em edge cases
   - Implemente validações
   - Considere cenários de falha

5. **DOCUMENTAÇÃO**
   - JSDoc em classes e métodos públicos
   - README com instruções step-by-step
   - Comentários explicativos em lógica complexa

---

## 🎯 ORDEM DE EXECUÇÃO SUGERIDA

1. Criar estrutura de pastas
2. Setup package.json e dependências
3. Configurar docker-compose.yml
4. Criar Prisma schema
5. Implementar BaseScraper
6. Implementar scrapers específicos (LATAM primeiro)
7. Criar ScraperFactory
8. Implementar MonitoringService
9. Configurar BullMQ e processor
10. Implementar NotificationService
11. Criar API REST (controller + DTOs)
12. Configurar módulos NestJS
13. Criar main.ts
14. Testes finais

---

**PROMPT PRONTO PARA USO NO CLAUDE CODE**

Copie este documento completo e cole no Claude Code. O sistema será gerado com todas as especificações técnicas, código completo, configurações e documentação necessária para produção.

**Tempo estimado de implementação:** 4-5 horas
**Nível de complexidade:** Alto
**Resultado esperado:** Sistema production-ready

---

*Criado por Kleber Cavalcanti - Novembro 2025*
*Para uso profissional com Claude Code*
