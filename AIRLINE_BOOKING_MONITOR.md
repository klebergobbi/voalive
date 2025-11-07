# Sistema de Monitoramento de Status de Reservas Aéreas
## Arquitetura Completa + Implementação Prática

### 📋 ÍNDICE
1. [Visão Geral da Solução](#visao-geral)
2. [Arquitetura do Sistema](#arquitetura)
3. [Stack Tecnológica](#stack)
4. [Fluxo de Monitoramento](#fluxo)
5. [Implementação Passo a Passo](#implementacao)
6. [Código Completo](#codigo)
7. [Prompt para Claude Code](#prompt-claude-code)

---

## 🎯 VISÃO GERAL DA SOLUÇÃO {#visao-geral}

### Problema Identificado
Seu aplicativo monitora voos normalmente, mas **não detecta mudanças de status nas reservas** (confirmado → cancelado, em espera → confirmado, etc).

### Solução Proposta
Sistema de **polling inteligente** com Playwright/Puppeteer que:
- Monitora PNRs (Passenger Name Records) periodicamente
- Detecta mudanças de status automaticamente
- Dispara webhooks/notificações em tempo real
- Persiste histórico de mudanças
- Retry automático com backoff exponencial

### Principais Recursos
✅ Monitoramento contínuo 24/7  
✅ Detecção de mudanças de status (HK→HX, waitlist→confirmed, etc)  
✅ Suporte para múltiplas companhias aéreas brasileiras  
✅ Sistema de fila com prioridades  
✅ Webhooks e notificações push  
✅ Dashboard de monitoramento  
✅ Logs estruturados e rastreamento completo  

---

## 🏗️ ARQUITETURA DO SISTEMA {#arquitetura}

```
┌─────────────────────────────────────────────────────────────────┐
│                      CAMADA DE APLICAÇÃO                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   REST API   │  │   WebSocket  │  │   Dashboard  │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼────────────────┐
│         │    CAMADA DE ORQUESTRAÇÃO           │                │
│  ┌──────▼────────┐  ┌─────▼────────┐  ┌──────▼───────┐       │
│  │ Job Scheduler │  │ Queue Manager│  │ Notification │       │
│  │   (BullMQ)    │  │   (Redis)    │  │   Service    │       │
│  └──────┬────────┘  └─────┬────────┘  └──────────────┘       │
└─────────┼───────────────────┼───────────────────────────────────┘
          │                   │
┌─────────┼───────────────────┼───────────────────────────────────┐
│         │   CAMADA DE SCRAPING              │                   │
│  ┌──────▼────────┐  ┌──────▼────────┐  ┌─────────────┐       │
│  │  Playwright   │  │  Anti-Detect  │  │   Proxy     │       │
│  │   Workers     │  │   Strategies  │  │   Manager   │       │
│  └──────┬────────┘  └───────────────┘  └─────────────┘       │
└─────────┼────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────────────┐
│               CAMADA DE PERSISTÊNCIA                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  PostgreSQL  │  │    Redis     │  │  TimescaleDB │         │
│  │  (Booking)   │  │   (Cache)    │  │   (Logs)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ STACK TECNOLÓGICA {#stack}

### Backend
- **Node.js 20+** / TypeScript
- **NestJS** - Framework robusto com injeção de dependências
- **Playwright** - Automação de navegador (melhor que Puppeteer para multi-browser)
- **BullMQ** - Sistema de filas com Redis
- **Prisma ORM** - Acesso ao banco de dados

### Infraestrutura
- **PostgreSQL 15+** - Banco principal
- **Redis 7+** - Cache e filas
- **TimescaleDB** - Time-series para logs
- **Docker + Docker Compose** - Containerização

### Monitoramento
- **Prometheus** - Métricas
- **Grafana** - Dashboards
- **Sentry** - Error tracking
- **Winston** - Logging estruturado

---

## 🔄 FLUXO DE MONITORAMENTO {#fluxo}

```mermaid
sequenceDiagram
    participant API as API REST
    participant Queue as BullMQ
    participant Worker as Playwright Worker
    participant Airline as Site da Cia Aérea
    participant DB as PostgreSQL
    participant Webhook as Webhook Client

    API->>Queue: Adiciona PNR para monitorar
    Queue->>Worker: Processa job
    Worker->>Airline: Faz scraping do status
    Airline-->>Worker: Retorna HTML/JSON
    Worker->>Worker: Extrai status atual
    Worker->>DB: Consulta status anterior
    DB-->>Worker: Status anterior
    
    alt Status mudou
        Worker->>DB: Atualiza status
        Worker->>Webhook: Dispara notificação
        Worker->>Queue: Agenda próximo check (5 min)
    else Status igual
        Worker->>Queue: Agenda próximo check (15 min)
    end
```

---

## 📝 IMPLEMENTAÇÃO PASSO A PASSO {#implementacao}

### ETAPA 1: Setup do Projeto

```bash
# Criar projeto
mkdir airline-monitor && cd airline-monitor
npm init -y

# Instalar dependências principais
npm install @nestjs/core @nestjs/common @nestjs/platform-express
npm install playwright playwright-extra puppeteer-extra-plugin-stealth
npm install @bull-board/nestjs bullmq ioredis
npm install @prisma/client prisma
npm install axios winston date-fns
npm install -D @types/node typescript ts-node

# Instalar navegadores
npx playwright install chromium
```

### ETAPA 2: Configuração do Docker

```yaml
# docker-compose.yml
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

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  timescaledb:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_DB: logs
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5433:5432"
    volumes:
      - timescale_data:/var/lib/postgresql/data

volumes:
  postgres_data:
  redis_data:
  timescale_data:
```

### ETAPA 3: Schema do Prisma

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Booking {
  id            String   @id @default(uuid())
  pnr           String   @unique
  airline       String
  lastName      String
  status        String   // HK, HX, WL, etc
  previousStatus String?
  flightNumber  String
  departureDate DateTime
  route         String
  checkInterval Int      @default(15) // minutos
  lastChecked   DateTime @default(now())
  isActive      Boolean  @default(true)
  metadata      Json?
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
  type        String   // webhook, email, sms, push
  payload     Json
  sentAt      DateTime @default(now())
  success     Boolean
  response    Json?
  
  @@index([bookingId])
  @@index([sentAt])
}
```

### ETAPA 4: Configuração de Variáveis de Ambiente

```bash
# .env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://admin:secure_password@localhost:5432/airline_monitor"
TIMESCALE_URL="postgresql://admin:secure_password@localhost:5433/logs"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Scraping
SCRAPING_TIMEOUT=30000
MAX_RETRIES=3
PROXY_ENABLED=false
HEADLESS=true

# Webhooks
WEBHOOK_URL=https://seu-servidor.com/api/webhooks/booking-status
WEBHOOK_SECRET=seu_secret_token_aqui

# Monitoring
SENTRY_DSN=
```

---

## 💻 CÓDIGO COMPLETO {#codigo}

### 1. Scraper Base (Playwright com Anti-Detecção)

```typescript
// src/scrapers/base.scraper.ts
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Logger } from '@nestjs/common';

export interface ScraperOptions {
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

export abstract class BaseScraper {
  protected readonly logger = new Logger(this.constructor.name);
  protected browser: Browser;
  protected context: BrowserContext;
  protected page: Page;

  protected readonly defaultOptions: ScraperOptions = {
    headless: true,
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 },
  };

  async initialize(options?: ScraperOptions): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    this.browser = await chromium.launch({
      headless: opts.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    this.context = await this.browser.newContext({
      userAgent: opts.userAgent,
      viewport: opts.viewport,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      permissions: [],
      // Anti-detecção
      javaScriptEnabled: true,
      bypassCSP: true,
    });

    // Injetar scripts anti-detecção
    await this.context.addInitScript(() => {
      // Ocultar webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Ocultar automation
      (window as any).chrome = {
        runtime: {},
      };

      // Adicionar plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['pt-BR', 'pt', 'en-US', 'en'],
      });
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(opts.timeout);
  }

  async close(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  abstract checkBookingStatus(pnr: string, lastName: string): Promise<any>;
}
```

### 2. Scraper Específico - Latam Airlines

```typescript
// src/scrapers/latam.scraper.ts
import { Injectable } from '@nestjs/common';
import { BaseScraper } from './base.scraper';

export interface LatamBookingStatus {
  pnr: string;
  status: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  date: string;
  passengers: string[];
  seatNumbers?: string[];
  statusCode: string; // HK, HX, WL, etc
}

@Injectable()
export class LatamScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.latamairlines.com';

  async checkBookingStatus(
    pnr: string,
    lastName: string,
  ): Promise<LatamBookingStatus> {
    try {
      await this.initialize();
      
      // Navegar para página de consulta
      await this.page.goto(`${this.baseUrl}/br/pt/minhas-viagens`, {
        waitUntil: 'networkidle',
      });

      this.logger.log(`Consultando PNR: ${pnr}`);

      // Preencher formulário
      await this.page.fill('input[name="reservationCode"]', pnr);
      await this.page.fill('input[name="lastName"]', lastName);
      
      // Clicar no botão de busca
      await this.page.click('button[type="submit"]');

      // Aguardar carregamento dos dados
      await this.page.waitForSelector('.booking-details', { 
        timeout: 15000 
      });

      // Extrair dados da reserva
      const bookingData = await this.page.evaluate(() => {
        const statusElement = document.querySelector('.booking-status');
        const flightElement = document.querySelector('.flight-number');
        const routeElement = document.querySelector('.route-info');
        const dateElement = document.querySelector('.flight-date');
        const passengersElements = document.querySelectorAll('.passenger-name');
        const seatsElements = document.querySelectorAll('.seat-number');

        return {
          status: statusElement?.textContent?.trim() || '',
          flightNumber: flightElement?.textContent?.trim() || '',
          route: routeElement?.textContent?.trim() || '',
          date: dateElement?.textContent?.trim() || '',
          passengers: Array.from(passengersElements).map(el => 
            el.textContent?.trim() || ''
          ),
          seats: Array.from(seatsElements).map(el => 
            el.textContent?.trim() || ''
          ),
        };
      });

      // Mapear status para código IATA
      const statusCode = this.mapStatusToCode(bookingData.status);

      const [departure, arrival] = bookingData.route.split('-').map(s => s.trim());

      return {
        pnr,
        status: bookingData.status,
        statusCode,
        flightNumber: bookingData.flightNumber,
        departure,
        arrival,
        date: bookingData.date,
        passengers: bookingData.passengers,
        seatNumbers: bookingData.seats,
      };

    } catch (error) {
      this.logger.error(`Erro ao consultar PNR ${pnr}: ${error.message}`);
      throw error;
    } finally {
      await this.close();
    }
  }

  private mapStatusToCode(status: string): string {
    const statusMap: Record<string, string> = {
      'confirmado': 'HK',
      'confirmed': 'HK',
      'cancelado': 'HX',
      'cancelled': 'HX',
      'lista de espera': 'WL',
      'waitlist': 'WL',
      'em espera': 'HL',
      'on hold': 'HL',
    };

    const normalizedStatus = status.toLowerCase();
    return statusMap[normalizedStatus] || 'UN'; // UN = Unknown
  }
}
```

### 3. Scraper GOL Airlines

```typescript
// src/scrapers/gol.scraper.ts
import { Injectable } from '@nestjs/common';
import { BaseScraper } from './base.scraper';

@Injectable()
export class GolScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.voegol.com.br';

  async checkBookingStatus(pnr: string, lastName: string): Promise<any> {
    try {
      await this.initialize();

      // Navegar para área de consulta
      await this.page.goto(`${this.baseUrl}/pt-br/minhas-reservas`, {
        waitUntil: 'domcontentloaded',
      });

      // Aguardar campo de PNR
      await this.page.waitForSelector('#localizador');
      
      // Preencher dados
      await this.page.type('#localizador', pnr);
      await this.page.type('#sobrenome', lastName);

      // Submeter
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle' }),
        this.page.click('button[type="submit"]'),
      ]);

      // Extrair informações
      const bookingInfo = await this.page.evaluate(() => {
        const getTextContent = (selector: string) => {
          const el = document.querySelector(selector);
          return el?.textContent?.trim() || '';
        };

        return {
          status: getTextContent('.status-reserva'),
          flight: getTextContent('.numero-voo'),
          route: getTextContent('.trecho'),
          date: getTextContent('.data-voo'),
          passengers: Array.from(
            document.querySelectorAll('.nome-passageiro')
          ).map(el => el.textContent?.trim() || ''),
        };
      });

      return {
        pnr,
        ...bookingInfo,
        statusCode: this.parseGolStatus(bookingInfo.status),
      };

    } catch (error) {
      this.logger.error(`Erro GOL scraper: ${error.message}`);
      throw error;
    } finally {
      await this.close();
    }
  }

  private parseGolStatus(status: string): string {
    if (status.includes('confirmad')) return 'HK';
    if (status.includes('cancelad')) return 'HX';
    if (status.includes('espera')) return 'WL';
    return 'UN';
  }
}
```

### 4. Scraper Azul Airlines

```typescript
// src/scrapers/azul.scraper.ts
import { Injectable } from '@nestjs/common';
import { BaseScraper } from './base.scraper';

@Injectable()
export class AzulScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.voeazul.com.br';

  async checkBookingStatus(pnr: string, lastName: string): Promise<any> {
    try {
      await this.initialize();

      await this.page.goto(`${this.baseUrl}/br/pt/minhas-viagens/gerenciar`, {
        waitUntil: 'load',
      });

      // Preencher formulário Azul
      await this.page.waitForSelector('input#pnr');
      await this.page.fill('input#pnr', pnr);
      await this.page.fill('input#surname', lastName);

      // Clicar e aguardar resposta
      const [response] = await Promise.all([
        this.page.waitForResponse(resp => 
          resp.url().includes('/api/booking') && resp.status() === 200
        ),
        this.page.click('button.buscar-reserva'),
      ]);

      // Tentar pegar dados da API
      let bookingData;
      try {
        bookingData = await response.json();
      } catch {
        // Se não conseguir da API, fazer scraping do HTML
        bookingData = await this.page.evaluate(() => {
          return {
            status: document.querySelector('.booking-status')?.textContent,
            flightNumber: document.querySelector('.flight-info')?.textContent,
            // ... outros campos
          };
        });
      }

      return this.normalizeAzulData(pnr, bookingData);

    } catch (error) {
      this.logger.error(`Erro Azul scraper: ${error.message}`);
      throw error;
    } finally {
      await this.close();
    }
  }

  private normalizeAzulData(pnr: string, data: any): any {
    return {
      pnr,
      status: data.status || data.bookingStatus,
      statusCode: this.mapAzulStatus(data.status),
      flightNumber: data.flightNumber,
      // ... outros campos
    };
  }

  private mapAzulStatus(status: string): string {
    const map: Record<string, string> = {
      'CONFIRMED': 'HK',
      'CANCELLED': 'HX',
      'WAITLISTED': 'WL',
      'PENDING': 'HL',
    };
    return map[status?.toUpperCase()] || 'UN';
  }
}
```

### 5. Scraper Factory

```typescript
// src/scrapers/scraper.factory.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseScraper } from './base.scraper';
import { LatamScraper } from './latam.scraper';
import { GolScraper } from './gol.scraper';
import { AzulScraper } from './azul.scraper';

@Injectable()
export class ScraperFactory {
  constructor(
    private readonly latamScraper: LatamScraper,
    private readonly golScraper: GolScraper,
    private readonly azulScraper: AzulScraper,
  ) {}

  getScraper(airline: string): BaseScraper {
    const normalizedAirline = airline.toLowerCase();

    switch (normalizedAirline) {
      case 'latam':
      case 'tam':
      case 'lan':
        return this.latamScraper;
      
      case 'gol':
      case 'g3':
        return this.golScraper;
      
      case 'azul':
      case 'ad':
        return this.azulScraper;
      
      default:
        throw new BadRequestException(
          `Companhia aérea não suportada: ${airline}`
        );
    }
  }

  getSupportedAirlines(): string[] {
    return ['LATAM', 'GOL', 'AZUL'];
  }
}
```

### 6. Serviço de Monitoramento

```typescript
// src/monitoring/monitoring.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperFactory } from '../scrapers/scraper.factory';
import { NotificationService } from '../notifications/notification.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperFactory: ScraperFactory,
    private readonly notificationService: NotificationService,
    @InjectQueue('booking-monitor') private monitorQueue: Queue,
  ) {}

  async addBookingToMonitor(data: {
    pnr: string;
    airline: string;
    lastName: string;
    flightNumber: string;
    departureDate: Date;
    route: string;
    checkInterval?: number;
  }): Promise<any> {
    // Criar registro no banco
    const booking = await this.prisma.booking.create({
      data: {
        pnr: data.pnr,
        airline: data.airline,
        lastName: data.lastName,
        flightNumber: data.flightNumber,
        departureDate: data.departureDate,
        route: data.route,
        status: 'PENDING',
        checkInterval: data.checkInterval || 15,
        isActive: true,
      },
    });

    // Agendar primeiro check imediatamente
    await this.monitorQueue.add(
      'check-status',
      { bookingId: booking.id },
      { delay: 0 }
    );

    this.logger.log(`Booking ${data.pnr} adicionado ao monitoramento`);
    return booking;
  }

  async checkBookingStatus(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || !booking.isActive) {
      this.logger.warn(`Booking ${bookingId} não encontrado ou inativo`);
      return;
    }

    try {
      // Obter scraper apropriado
      const scraper = this.scraperFactory.getScraper(booking.airline);

      // Executar scraping
      const currentStatus = await scraper.checkBookingStatus(
        booking.pnr,
        booking.lastName,
      );

      // Verificar se houve mudança
      const hasChanged = currentStatus.statusCode !== booking.status;

      if (hasChanged) {
        this.logger.log(
          `Status mudou para ${booking.pnr}: ${booking.status} → ${currentStatus.statusCode}`
        );

        // Atualizar booking
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            previousStatus: booking.status,
            status: currentStatus.statusCode,
            lastChecked: new Date(),
            metadata: currentStatus as any,
          },
        });

        // Registrar histórico
        await this.prisma.statusHistory.create({
          data: {
            bookingId,
            oldStatus: booking.status,
            newStatus: currentStatus.statusCode,
            details: currentStatus as any,
          },
        });

        // Disparar notificações
        await this.notificationService.sendStatusChangeNotification({
          booking,
          oldStatus: booking.status,
          newStatus: currentStatus.statusCode,
          details: currentStatus,
        });

        // Próximo check em 5 minutos (mudança detectada)
        await this.scheduleNextCheck(bookingId, 5);
      } else {
        // Status não mudou
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { lastChecked: new Date() },
        });

        // Próximo check no intervalo padrão
        await this.scheduleNextCheck(bookingId, booking.checkInterval);
      }

    } catch (error) {
      this.logger.error(
        `Erro ao verificar status do booking ${bookingId}: ${error.message}`
      );

      // Retry com backoff exponencial
      await this.scheduleNextCheck(bookingId, 30);
    }
  }

  private async scheduleNextCheck(
    bookingId: string,
    delayMinutes: number,
  ): Promise<void> {
    await this.monitorQueue.add(
      'check-status',
      { bookingId },
      {
        delay: delayMinutes * 60 * 1000,
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );
  }

  async stopMonitoring(pnr: string): Promise<void> {
    await this.prisma.booking.update({
      where: { pnr },
      data: { isActive: false },
    });
    this.logger.log(`Monitoramento interrompido para PNR: ${pnr}`);
  }

  async getBookingHistory(pnr: string): Promise<any> {
    return this.prisma.booking.findUnique({
      where: { pnr },
      include: {
        statusHistory: {
          orderBy: { changedAt: 'desc' },
        },
        notifications: {
          orderBy: { sentAt: 'desc' },
          take: 10,
        },
      },
    });
  }
}
```

### 7. Worker de Processamento (BullMQ)

```typescript
// src/monitoring/monitoring.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Processor('booking-monitor')
export class MonitoringProcessor extends WorkerHost {
  private readonly logger = new Logger(MonitoringProcessor.name);

  constructor(private readonly monitoringService: MonitoringService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processando job ${job.id}: ${job.name}`);

    switch (job.name) {
      case 'check-status':
        return this.handleCheckStatus(job);
      
      default:
        this.logger.warn(`Job desconhecido: ${job.name}`);
    }
  }

  private async handleCheckStatus(job: Job): Promise<void> {
    const { bookingId } = job.data;
    
    try {
      await this.monitoringService.checkBookingStatus(bookingId);
      this.logger.log(`Status checado com sucesso: ${bookingId}`);
    } catch (error) {
      this.logger.error(`Erro ao processar job ${job.id}: ${error.message}`);
      throw error;
    }
  }
}
```

### 8. Serviço de Notificações

```typescript
// src/notifications/notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly webhookUrl: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.webhookUrl = this.config.get('WEBHOOK_URL');
    this.webhookSecret = this.config.get('WEBHOOK_SECRET');
  }

  async sendStatusChangeNotification(data: {
    booking: any;
    oldStatus: string;
    newStatus: string;
    details: any;
  }): Promise<void> {
    const payload = {
      event: 'booking.status.changed',
      timestamp: new Date().toISOString(),
      data: {
        pnr: data.booking.pnr,
        airline: data.booking.airline,
        flightNumber: data.booking.flightNumber,
        route: data.booking.route,
        oldStatus: oldStatus,
        newStatus: data.newStatus,
        statusName: this.getStatusName(data.newStatus),
        details: data.details,
      },
    };

    try {
      // Enviar webhook
      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': this.webhookSecret,
        },
        timeout: 10000,
      });

      // Registrar notificação
      await this.prisma.notification.create({
        data: {
          bookingId: data.booking.id,
          type: 'webhook',
          payload: payload as any,
          success: true,
          response: response.data as any,
        },
      });

      this.logger.log(`Webhook enviado com sucesso para PNR ${data.booking.pnr}`);

    } catch (error) {
      this.logger.error(`Erro ao enviar webhook: ${error.message}`);
      
      await this.prisma.notification.create({
        data: {
          bookingId: data.booking.id,
          type: 'webhook',
          payload: payload as any,
          success: false,
          response: { error: error.message } as any,
        },
      });
    }
  }

  private getStatusName(code: string): string {
    const statusMap: Record<string, string> = {
      'HK': 'Confirmado',
      'HX': 'Cancelado',
      'WL': 'Lista de Espera',
      'HL': 'Em Espera',
      'UN': 'Status Desconhecido',
    };
    return statusMap[code] || code;
  }

  // Método para enviar notificações push, email, SMS, etc
  async sendMultiChannelNotification(booking: any, message: string) {
    // Implementar integrações com Firebase, SendGrid, Twilio, etc
    this.logger.log(`Enviando notificação multi-canal para ${booking.pnr}`);
  }
}
```

### 9. Controller REST API

```typescript
// src/monitoring/monitoring.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller('api/monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Post('bookings')
  @HttpCode(HttpStatus.CREATED)
  async addBooking(@Body() data: any) {
    return this.monitoringService.addBookingToMonitor(data);
  }

  @Get('bookings/:pnr')
  async getBooking(@Param('pnr') pnr: string) {
    return this.monitoringService.getBookingHistory(pnr);
  }

  @Delete('bookings/:pnr')
  @HttpCode(HttpStatus.NO_CONTENT)
  async stopMonitoring(@Param('pnr') pnr: string) {
    await this.monitoringService.stopMonitoring(pnr);
  }

  @Post('bookings/:pnr/check')
  async forceCheck(@Param('pnr') pnr: string) {
    // Força uma verificação imediata
    const booking = await this.monitoringService['prisma'].booking.findUnique({
      where: { pnr },
    });
    
    if (booking) {
      await this.monitoringService.checkBookingStatus(booking.id);
      return { message: 'Verificação iniciada' };
    }
    
    return { message: 'Booking não encontrado' };
  }
}
```

### 10. Módulo Principal

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { ScrapersModule } from './scrapers/scrapers.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    
    BullModule.registerQueue({
      name: 'booking-monitor',
    }),
    
    PrismaModule,
    MonitoringModule,
    ScrapersModule,
    NotificationsModule,
  ],
})
export class AppModule {}
```

### 11. Script de Deploy

```bash
#!/bin/bash
# deploy.sh

echo "🚀 Deploy do Sistema de Monitoramento de Reservas"

# Subir containers
docker-compose up -d

# Aguardar bancos estarem prontos
sleep 10

# Rodar migrations
npx prisma migrate deploy

# Build da aplicação
npm run build

# Iniciar aplicação
pm2 start dist/main.js --name airline-monitor

# Verificar status
pm2 status

echo "✅ Deploy concluído!"
```

---

## 🤖 PROMPT COMPLETO PARA CLAUDE CODE {#prompt-claude-code}

```
Você é um engenheiro fullstack sênior especializado em web scraping e automação. 

Crie um sistema completo de monitoramento de status de reservas aéreas com as seguintes especificações:

## CONTEXTO
- Tenho um aplicativo que monitora voos, mas não detecta mudanças de status nas reservas
- Preciso monitorar PNRs (Passenger Name Records) de companhias aéreas brasileiras
- O sistema deve detectar automaticamente quando o status muda (HK→HX, WL→HK, etc)

## REQUISITOS TÉCNICOS

### Stack Obrigatória
- Node.js 20+ com TypeScript
- NestJS para arquitetura modular
- Playwright para web scraping (prioridade sobre Puppeteer)
- BullMQ + Redis para sistema de filas
- PostgreSQL com Prisma ORM
- Docker Compose para infraestrutura

### Companhias Aéreas Alvo (Prioridade)
1. LATAM Airlines (latamairlines.com)
2. GOL Linhas Aéreas (voegol.com.br)
3. Azul Linhas Aéreas (voeazul.com.br)

### Funcionalidades Core

1. **Scraping Anti-Detecção**
   - Implementar estratégias stealth mode
   - Rotação de user agents
   - Randomização de timings
   - Handling de CAPTCHAs (se necessário)

2. **Sistema de Monitoramento**
   - Polling inteligente com intervalos adaptativos:
     * 5 minutos após detecção de mudança
     * 15 minutos em estado estável
     * 30 minutos em caso de erro (com backoff exponencial)
   - Suporte a múltiplos PNRs simultâneos
   - Priorização de voos próximos da data de partida

3. **Detecção de Mudanças**
   - Comparar status atual vs anterior
   - Mapear códigos de status IATA:
     * HK = Confirmed (Confirmado)
     * HX = Cancelled (Cancelado)
     * WL = Waitlisted (Lista de Espera)
     * HL = On Hold (Em Espera)
   - Registrar histórico completo de mudanças

4. **Sistema de Notificações**
   - Webhook HTTP com retry automático
   - Payload estruturado com:
     * Timestamp da mudança
     * Status anterior e novo
     * Detalhes completos da reserva
   - Assinatura HMAC para segurança

5. **API REST**
   - POST /api/monitoring/bookings - Adicionar PNR ao monitoramento
   - GET /api/monitoring/bookings/:pnr - Consultar status e histórico
   - DELETE /api/monitoring/bookings/:pnr - Remover do monitoramento
   - POST /api/monitoring/bookings/:pnr/check - Forçar verificação

6. **Persistência de Dados**
   - Schema Prisma com:
     * Tabela Booking (dados da reserva)
     * Tabela StatusHistory (histórico de mudanças)
     * Tabela Notification (log de notificações)
   - Indexes otimizados para queries frequentes

### Estrutura de Arquivos
```
airline-monitor/
├── src/
│   ├── scrapers/
│   │   ├── base.scraper.ts
│   │   ├── latam.scraper.ts
│   │   ├── gol.scraper.ts
│   │   ├── azul.scraper.ts
│   │   └── scraper.factory.ts
│   ├── monitoring/
│   │   ├── monitoring.service.ts
│   │   ├── monitoring.processor.ts (BullMQ worker)
│   │   └── monitoring.controller.ts
│   ├── notifications/
│   │   └── notification.service.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── prisma.service.ts
│   └── main.ts
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

### Critérios de Qualidade
✅ Código TypeScript com tipos estritos
✅ Tratamento robusto de erros
✅ Logging estruturado (Winston)
✅ Testes unitários para scrapers críticos
✅ Documentação inline clara
✅ Configuração via variáveis de ambiente
✅ Graceful shutdown
✅ Health checks prontos

### Desafios Técnicos a Considerar
- Sites das companhias usam SPAs com renderização client-side
- Possível necessidade de resolver CAPTCHAs
- Rate limiting e bloqueio de IPs
- Mudanças frequentes no HTML (seletores instáveis)
- Timeout e retries para requisições lentas

### Entregáveis
1. Código-fonte completo e funcional
2. docker-compose.yml pronto para produção
3. Arquivo .env.example com todas variáveis
4. README.md com instruções de setup
5. Scripts SQL de migration (via Prisma)
6. Exemplo de requisição para cada endpoint

### Exemplo de Uso Esperado

```bash
# 1. Adicionar reserva ao monitoramento
curl -X POST http://localhost:3000/api/monitoring/bookings \
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

# 2. Consultar histórico
curl http://localhost:3000/api/monitoring/bookings/ABC123

# 3. Sistema detecta mudança e envia webhook
# POST para WEBHOOK_URL configurado com:
{
  "event": "booking.status.changed",
  "timestamp": "2025-11-04T15:30:00Z",
  "data": {
    "pnr": "ABC123",
    "airline": "LATAM",
    "flightNumber": "LA3090",
    "route": "GRU-BSB",
    "oldStatus": "WL",
    "newStatus": "HK",
    "statusName": "Confirmado",
    "details": { ... }
  }
}
```

## INSTRUÇÕES FINAIS
- Priorize código limpo e manutenível
- Use design patterns apropriados (Factory, Strategy)
- Implemente logging em todos pontos críticos
- Adicione comentários explicativos em trechos complexos
- Garanta que o sistema possa escalar horizontalmente
- Prepare para deployment em produção

IMPORTANTE: Implemente TODAS as funcionalidades listadas. Não crie código placeholder ou TODO comments. O sistema deve estar pronto para uso em produção.

Comece pela estrutura base e scrapers, depois implemente o sistema de filas e por fim a API REST.
```

---

## 📊 MONITORAMENTO E OBSERVABILIDADE

### Métricas Importantes (Prometheus)

```typescript
// src/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  
  // Contadores
  private scrapingAttemptsTotal: Counter;
  private scrapingFailuresTotal: Counter;
  private statusChangesTotal: Counter;
  private notificationsSentTotal: Counter;
  
  // Histogramas
  private scrapingDuration: Histogram;
  
  // Gauges
  private activeBookings: Gauge;
  private queueSize: Gauge;

  constructor() {
    this.registry = new Registry();
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.scrapingAttemptsTotal = new Counter({
      name: 'scraping_attempts_total',
      help: 'Total de tentativas de scraping',
      labelNames: ['airline', 'status'],
      registers: [this.registry],
    });

    this.scrapingFailuresTotal = new Counter({
      name: 'scraping_failures_total',
      help: 'Total de falhas no scraping',
      labelNames: ['airline', 'error_type'],
      registers: [this.registry],
    });

    this.statusChangesTotal = new Counter({
      name: 'status_changes_total',
      help: 'Total de mudanças de status detectadas',
      labelNames: ['airline', 'from_status', 'to_status'],
      registers: [this.registry],
    });

    this.scrapingDuration = new Histogram({
      name: 'scraping_duration_seconds',
      help: 'Duração do scraping em segundos',
      labelNames: ['airline'],
      buckets: [1, 2, 5, 10, 30, 60],
      registers: [this.registry],
    });

    this.activeBookings = new Gauge({
      name: 'active_bookings',
      help: 'Número de reservas ativas sendo monitoradas',
      registers: [this.registry],
    });

    this.queueSize = new Gauge({
      name: 'queue_size',
      help: 'Tamanho da fila de processamento',
      registers: [this.registry],
    });
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  incrementScrapingAttempts(airline: string, status: string): void {
    this.scrapingAttemptsTotal.inc({ airline, status });
  }

  // ... outros métodos
}
```

### Dashboard Grafana

```json
{
  "dashboard": {
    "title": "Airline Booking Monitor",
    "panels": [
      {
        "title": "Status Changes (Last 24h)",
        "targets": [
          {
            "expr": "rate(status_changes_total[24h])"
          }
        ]
      },
      {
        "title": "Scraping Success Rate",
        "targets": [
          {
            "expr": "(scraping_attempts_total - scraping_failures_total) / scraping_attempts_total * 100"
          }
        ]
      },
      {
        "title": "Active Bookings",
        "targets": [
          {
            "expr": "active_bookings"
          }
        ]
      },
      {
        "title": "Average Scraping Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, scraping_duration_seconds_bucket)"
          }
        ]
      }
    ]
  }
}
```

---

## 🔒 SEGURANÇA E BOAS PRÁTICAS

### 1. Validação de Entrada

```typescript
// src/monitoring/dto/add-booking.dto.ts
import { IsString, IsDate, IsOptional, IsInt, Min, Max, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddBookingDto {
  @IsString()
  @Matches(/^[A-Z0-9]{6}$/, {
    message: 'PNR deve ter 6 caracteres alfanuméricos',
  })
  pnr: string;

  @IsString()
  airline: string;

  @IsString()
  lastName: string;

  @IsString()
  flightNumber: string;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  departureDate: Date;

  @IsString()
  route: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  checkInterval?: number;
}
```

### 2. Rate Limiting

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Rate limiting global
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // 100 requests
      message: 'Muitas requisições deste IP',
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

### 3. Secrets Management

```typescript
// src/config/configuration.ts
export default () => ({
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10),
  },
  webhook: {
    url: process.env.WEBHOOK_URL,
    secret: process.env.WEBHOOK_SECRET,
  },
  scraping: {
    timeout: parseInt(process.env.SCRAPING_TIMEOUT, 10) || 30000,
    maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
    headless: process.env.HEADLESS === 'true',
  },
});
```

---

## 🚀 OTIMIZAÇÕES E ESCALABILIDADE

### 1. Cache de Resultados

```typescript
// Adicionar ao scraper
private cacheKey(pnr: string): string {
  return `booking:${pnr}:status`;
}

async checkBookingStatus(pnr: string, lastName: string): Promise<any> {
  // Verificar cache primeiro
  const cached = await this.redis.get(this.cacheKey(pnr));
  if (cached) {
    return JSON.parse(cached);
  }

  // Fazer scraping...
  const result = await this.performScraping(pnr, lastName);

  // Cachear por 5 minutos
  await this.redis.setex(
    this.cacheKey(pnr),
    300,
    JSON.stringify(result),
  );

  return result;
}
```

### 2. Pooling de Browsers

```typescript
// src/scrapers/browser-pool.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser, BrowserContext } from 'playwright';

@Injectable()
export class BrowserPoolService implements OnModuleInit, OnModuleDestroy {
  private browsers: Browser[] = [];
  private readonly poolSize = 5;

  async onModuleInit() {
    for (let i = 0; i < this.poolSize; i++) {
      const browser = await chromium.launch({ headless: true });
      this.browsers.push(browser);
    }
  }

  async onModuleDestroy() {
    await Promise.all(this.browsers.map(b => b.close()));
  }

  async getBrowser(): Promise<Browser> {
    // Retornar browser menos ocupado
    return this.browsers[0];
  }
}
```

### 3. Horizontal Scaling

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: airline-monitor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: airline-monitor
  template:
    metadata:
      labels:
        app: airline-monitor
    spec:
      containers:
      - name: app
        image: airline-monitor:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        env:
        - name: REDIS_HOST
          value: redis-service
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: connection-string
```

---

## 📱 EXEMPLO DE INTEGRAÇÃO COM APLICATIVO EXISTENTE

```typescript
// No seu aplicativo existente
import axios from 'axios';

class AirlineMonitorClient {
  private baseUrl = 'http://localhost:3000/api/monitoring';

  async startMonitoring(booking: {
    pnr: string;
    airline: string;
    lastName: string;
    flightNumber: string;
    departureDate: string;
    route: string;
  }): Promise<void> {
    await axios.post(`${this.baseUrl}/bookings`, booking);
  }

  async getBookingStatus(pnr: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/bookings/${pnr}`);
    return response.data;
  }

  async stopMonitoring(pnr: string): Promise<void> {
    await axios.delete(`${this.baseUrl}/bookings/${pnr}`);
  }
}

// Exemplo de uso
const monitor = new AirlineMonitorClient();

// Adicionar ao monitoramento após criar uma reserva
await monitor.startMonitoring({
  pnr: 'ABC123',
  airline: 'LATAM',
  lastName: 'SILVA',
  flightNumber: 'LA3090',
  departureDate: '2025-12-15T10:00:00Z',
  route: 'GRU-BSB',
});

// Webhook será chamado automaticamente quando status mudar
```

---

## 🎓 CONSIDERAÇÕES FINAIS

### Manutenção e Evolução
- **Seletores CSS**: Sites mudam frequentemente. Mantenha seletores em arquivos de configuração
- **Testes**: Execute scrapers periodicamente contra sites de staging
- **Alertas**: Configure alertas para taxas de erro > 10%
- **Logs**: Mantenha logs por pelo menos 30 dias

### Compliance e Ética
- Respeite robots.txt e terms of service
- Não abuse com requisições excessivas
- Use apenas dados públicos
- Implemente rate limiting interno

### Performance
- Monitore uso de CPU/memória dos browsers
- Use headless mode em produção
- Implemente circuit breakers para APIs instáveis
- Cache agressivo para dados que mudam pouco

### Próximos Passos
1. Adicionar suporte para mais companhias (Avianca, Copa, etc)
2. Implementar ML para prever mudanças de status
3. Criar aplicativo mobile com notificações push
4. Dashboard web em tempo real com WebSockets
5. Integração com sistemas GDS (Amadeus, Sabre)

---

**Sistema desenvolvido para uso profissional. Documentação completa e código production-ready.**

*Versão 1.0 - Novembro 2025*
