# 🛫 Flight Monitoring Service

Sistema completo de monitoramento de voos com busca em 3 camadas, polling automático e notificações em tempo real.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Uso Rápido](#uso-rápido)
- [API Reference](#api-reference)
- [Exemplos](#exemplos)
- [Testes](#testes)

---

## 🎯 Visão Geral

O **Flight Monitoring Service** é um sistema avançado que:

- ✅ Busca status de voos em **3 camadas** com fallback automático
- ✅ Monitora voos **continuamente** com polling configurável
- ✅ Detecta **mudanças automaticamente** (atrasos, portões, cancelamentos)
- ✅ Envia **notificações** por múltiplos canais
- ✅ Armazena **histórico** completo no Redis
- ✅ Processa jobs em **background** com Bull Queue
- ✅ Emite **eventos** para integração com WebSocket

### Camadas de Busca

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: GDS (Amadeus/Sabre)                            │
│  ├─ Acesso direto aos sistemas de reservas globais       │
│  ├─ Dados mais precisos e atualizados                    │
│  └─ Requer credenciais comerciais                        │
└──────────────────────────────────────────────────────────┘
                         ↓ Fallback se falhar
┌──────────────────────────────────────────────────────────┐
│  Layer 2: Commercial APIs                                │
│  ├─ AviationStack (dados de voos)                        │
│  ├─ FlightAware (tracking em tempo real)                 │
│  ├─ FlightRadar24 (posição GPS)                          │
│  └─ Dados confiáveis mas podem ter delay                 │
└──────────────────────────────────────────────────────────┘
                         ↓ Fallback se falhar
┌──────────────────────────────────────────────────────────┐
│  Layer 3: Web Scraping                                   │
│  ├─ GOL, LATAM, Azul, Avianca                           │
│  ├─ Dados direto do site da companhia                   │
│  ├─ Mais lento mas sempre disponível                    │
│  └─ Requer Playwright/Puppeteer                         │
└──────────────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitetura

### Componentes Principais

```
FlightMonitoringService
├── getFlightStatusByReservation()   # Busca única
├── searchAcrossAllLayers()          # Busca com fallback em 3 camadas
├── monitorFlightContinuous()        # Monitoramento contínuo
├── stopMonitoring()                 # Parar monitoramento
├── parseReservationDetails()        # Parser de dados
├── getFlightHistory()               # Histórico de mudanças
└── listActiveMonitors()             # Listar monitores ativos
```

### Dependências

- **Redis**: Cache e armazenamento de histórico
- **Bull Queue**: Processamento de jobs em background
- **EventEmitter**: Emissão de eventos para WebSocket
- **Existing Services**: Integração com services já implementados

---

## 📦 Instalação

```bash
# Já instalado no projeto VoaLive
# Verificar dependências:
npm ls ioredis bull
```

### Configuração

```typescript
import Redis from 'ioredis';
import Bull from 'bull';
import { getFlightMonitoringService } from './services/flightMonitoring';

// Setup Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

// Setup Bull Queue
const monitoringQueue = new Bull('flight-monitoring', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
});

// Initialize service
const flightMonitoringService = getFlightMonitoringService(
  redis,
  monitoringQueue,
  {
    // Optional: inject layer services
    gdsService: null, // TODO: Implement GDS
    apiService: null, // Uses existing services
    scrapingService: null, // Uses existing scrapers
  }
);
```

---

## 🚀 Uso Rápido

### 1. Buscar Status de Voo

```typescript
const status = await flightMonitoringService.getFlightStatusByReservation(
  'PDCDX',    // Booking reference
  'DINIZ'     // Last name
);

console.log(status);
// {
//   success: true,
//   bookingReference: 'PDCDX',
//   lastName: 'DINIZ',
//   source: 'API',
//   flight: {
//     flightNumber: 'G31234',
//     airline: 'GOL',
//     status: 'SCHEDULED',
//     departure: {
//       airport: 'GRU',
//       scheduledTime: '2025-11-05T10:30:00Z',
//       gate: 'A12'
//     },
//     arrival: {
//       airport: 'GIG',
//       scheduledTime: '2025-11-05T12:00:00Z'
//     }
//   }
// }
```

### 2. Iniciar Monitoramento Contínuo

```typescript
const monitor = await flightMonitoringService.monitorFlightContinuous(
  'PDCDX',
  'DINIZ',
  {
    intervalMinutes: 15,           // Check every 15 minutes
    notifyOnChange: true,
    notifyOnDelay: true,
    notifyOnGateChange: true,
    notifyChannels: ['email', 'push'],
    autoStop: {
      afterDeparture: true,        // Stop after flight departs
      afterMinutes: 720,           // Or after 12 hours
    }
  }
);

console.log('Monitoring started:', monitor.id);
```

### 3. Escutar Eventos

```typescript
// Listen to flight changes
flightMonitoringService.on('flight:changed', (event) => {
  console.log('Flight changed:', event.changes);
  console.log('Previous:', event.previousStatus);
  console.log('Current:', event.currentStatus);

  // Send to WebSocket clients
  io.emit('flight:update', {
    bookingReference: event.job.bookingReference,
    changes: event.changes,
    status: event.currentStatus,
  });
});

// Listen to monitoring events
flightMonitoringService.on('monitoring:started', (job) => {
  console.log('Monitoring started:', job.id);
});

flightMonitoringService.on('monitoring:stopped', (data) => {
  console.log('Monitoring stopped:', data.monitorId);
});

// Listen to notification events
flightMonitoringService.on('notification:send', (data) => {
  console.log('Sending notification:', data.changes);
  // Implement actual notification sending here
});
```

### 4. Parar Monitoramento

```typescript
await flightMonitoringService.stopMonitoring('PDCDX', 'DINIZ');
```

### 5. Ver Histórico

```typescript
const history = await flightMonitoringService.getFlightHistory(
  'PDCDX',
  'DINIZ',
  50 // Last 50 checks
);

history.forEach(snapshot => {
  console.log(`${snapshot.timestamp}: ${snapshot.status} - ${snapshot.source}`);
});
```

---

## 📚 API Reference

### `getFlightStatusByReservation()`

Busca status de um voo usando referência de reserva.

```typescript
async getFlightStatusByReservation(
  bookingReference: string,
  lastName: string,
  options?: {
    airline?: string;
    useCache?: boolean;
  }
): Promise<FlightStatus>
```

**Parâmetros:**
- `bookingReference`: Código da reserva (PNR/localizador)
- `lastName`: Sobrenome do passageiro
- `options.airline`: Código da companhia (opcional, ajuda na busca)
- `options.useCache`: Usar cache (padrão: true)

**Retorna:** `FlightStatus` com todas as informações do voo

**Exemplo:**
```typescript
const status = await service.getFlightStatusByReservation('ABC123', 'SILVA', {
  airline: 'G3',
  useCache: true
});
```

---

### `searchAcrossAllLayers()`

Busca em todas as 3 camadas com fallback automático.

```typescript
async searchAcrossAllLayers(
  bookingReference: string,
  lastName: string,
  airline?: string
): Promise<FlightStatus>
```

**Ordem de tentativa:**
1. GDS (se configurado)
2. Commercial APIs
3. Web Scraping

**Exemplo:**
```typescript
const status = await service.searchAcrossAllLayers('ABC123', 'SILVA', 'G3');
```

---

### `monitorFlightContinuous()`

Inicia monitoramento contínuo de um voo.

```typescript
async monitorFlightContinuous(
  bookingReference: string,
  lastName: string,
  options: MonitoringOptions
): Promise<MonitoringJob>
```

**MonitoringOptions:**
```typescript
interface MonitoringOptions {
  intervalMinutes: number;              // Intervalo de verificação
  notifyOnChange: boolean;              // Notificar em qualquer mudança
  notifyOnDelay: boolean;               // Notificar em atrasos
  notifyOnGateChange: boolean;          // Notificar em mudança de portão
  notifyChannels?: NotificationChannel[]; // Canais de notificação
  autoStop?: {
    afterDeparture?: boolean;           // Parar após decolagem
    afterMinutes?: number;              // Parar após X minutos
  };
}
```

**Retorna:** `MonitoringJob` com informações do monitoramento

**Exemplo:**
```typescript
const job = await service.monitorFlightContinuous('ABC123', 'SILVA', {
  intervalMinutes: 10,
  notifyOnChange: true,
  notifyOnDelay: true,
  notifyOnGateChange: true,
  notifyChannels: ['email', 'push'],
  autoStop: {
    afterDeparture: true,
    afterMinutes: 1440 // 24 hours
  }
});
```

---

### `stopMonitoring()`

Para o monitoramento de um voo.

```typescript
async stopMonitoring(
  bookingReference: string,
  lastName: string
): Promise<boolean>
```

**Retorna:** `true` se parou com sucesso, `false` caso contrário

---

### `parseReservationDetails()`

Extrai informações estruturadas de dados brutos de reserva.

```typescript
parseReservationDetails(bookingData: any): ParsedReservation
```

**Exemplo:**
```typescript
const parsed = service.parseReservationDetails({
  bookingCode: 'ABC123',
  flights: [{
    flightNumber: 'G31234',
    origin: 'GRU',
    destination: 'GIG',
    departureDate: '2025-11-05T10:30:00Z'
  }],
  passengers: [{
    firstName: 'João',
    lastName: 'Silva'
  }]
});

console.log(parsed.flightNumber); // 'G31234'
console.log(parsed.airlineCode);  // 'G3'
```

---

### `getFlightHistory()`

Retorna histórico de verificações de um voo.

```typescript
async getFlightHistory(
  bookingReference: string,
  lastName: string,
  limit?: number
): Promise<FlightStatus[]>
```

**Retorna:** Array de `FlightStatus` ordenado por timestamp (mais recente primeiro)

---

### `listActiveMonitors()`

Lista todos os monitoramentos ativos.

```typescript
async listActiveMonitors(): Promise<MonitoringJob[]>
```

**Retorna:** Array de `MonitoringJob` ativos

---

## 💡 Exemplos de Uso

### Exemplo 1: Dashboard de Reservas

```typescript
import express from 'express';
import { getFlightMonitoringService } from './services/flightMonitoring';

const app = express();
const service = getFlightMonitoringService(redis, queue);

// Endpoint para buscar status
app.post('/api/flights/status', async (req, res) => {
  const { bookingReference, lastName } = req.body;

  try {
    const status = await service.getFlightStatusByReservation(
      bookingReference,
      lastName
    );

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para iniciar monitoramento
app.post('/api/flights/monitor', async (req, res) => {
  const { bookingReference, lastName, interval } = req.body;

  try {
    const job = await service.monitorFlightContinuous(
      bookingReference,
      lastName,
      {
        intervalMinutes: interval || 15,
        notifyOnChange: true,
        notifyOnDelay: true,
        notifyOnGateChange: true,
      }
    );

    res.json({ success: true, jobId: job.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Exemplo 2: WebSocket Real-time Updates

```typescript
import { Server } from 'socket.io';
import { getFlightMonitoringService } from './services/flightMonitoring';

const io = new Server(server);
const service = getFlightMonitoringService(redis, queue);

// Listen to flight changes
service.on('flight:changed', (event) => {
  // Broadcast to specific booking room
  const roomId = `booking:${event.job.bookingReference}`;

  io.to(roomId).emit('flight:update', {
    bookingReference: event.job.bookingReference,
    changes: event.changes,
    status: event.currentStatus,
    timestamp: new Date(),
  });
});

// Client joins room
io.on('connection', (socket) => {
  socket.on('subscribe:booking', (bookingReference) => {
    socket.join(`booking:${bookingReference}`);
  });
});
```

### Exemplo 3: Notificações por Email

```typescript
import nodemailer from 'nodemailer';
import { getFlightMonitoringService } from './services/flightMonitoring';

const service = getFlightMonitoringService(redis, queue);
const transporter = nodemailer.createTransport(/* config */);

// Listen to notification events
service.on('notification:send', async (data) => {
  const { job, status, changes } = data;

  // Build email
  const html = `
    <h2>Atualização de Voo - ${status.flight?.flightNumber}</h2>
    <p>Reserva: ${job.bookingReference}</p>
    <h3>Mudanças Detectadas:</h3>
    <ul>
      ${changes.map(c => `<li>${c}</li>`).join('')}
    </ul>
    <p>Status atual: ${status.flight?.status}</p>
  `;

  // Send email
  await transporter.sendMail({
    to: job.options.notifyChannels?.includes('email') ? 'user@example.com' : null,
    subject: `[VoaLive] Atualização de Voo ${status.flight?.flightNumber}`,
    html,
  });
});
```

---

## 🧪 Testes

### Teste Manual

```bash
# Criar arquivo de teste
node << 'EOF'
const { getFlightMonitoringService } = require('./dist/services/flightMonitoring');
const Redis = require('ioredis');
const Bull = require('bull');

const redis = new Redis();
const queue = new Bull('test-monitoring', { redis });
const service = getFlightMonitoringService(redis, queue);

// Teste 1: Buscar status
service.getFlightStatusByReservation('PDCDX', 'DINIZ')
  .then(status => {
    console.log('Status:', status);
  });

// Teste 2: Iniciar monitoramento
service.monitorFlightContinuous('PDCDX', 'DINIZ', {
  intervalMinutes: 5,
  notifyOnChange: true,
})
  .then(job => {
    console.log('Monitoring started:', job.id);

    // Parar após 30 segundos
    setTimeout(() => {
      service.stopMonitoring('PDCDX', 'DINIZ');
      process.exit(0);
    }, 30000);
  });
EOF
```

### Teste com Jest (TODO)

```typescript
import { getFlightMonitoringService } from './index';
import RedisMock from 'ioredis-mock';
import { Queue } from 'bull';

describe('FlightMonitoringService', () => {
  let service: FlightMonitoringService;
  let redis: any;
  let queue: Queue;

  beforeEach(() => {
    redis = new RedisMock();
    queue = new Queue('test', { redis });
    service = getFlightMonitoringService(redis, queue);
  });

  it('should search flight status', async () => {
    const status = await service.getFlightStatusByReservation('ABC123', 'SILVA');
    expect(status).toBeDefined();
  });

  it('should start monitoring', async () => {
    const job = await service.monitorFlightContinuous('ABC123', 'SILVA', {
      intervalMinutes: 10,
      notifyOnChange: true,
    });

    expect(job.status).toBe('ACTIVE');
  });
});
```

---

## 📊 Métricas e Monitoramento

### Redis Keys Structure

```
flight_monitor:{bookingRef}:{lastName}       # Cache de status (TTL: 15min)
flight_history:{bookingRef}:{lastName}       # Histórico (lista, 100 itens)
monitor:{bookingRef}:{lastName}              # Job de monitoramento
```

### Bull Queue Jobs

```
Queue: flight-monitoring
Jobs:
  - check-flight (repeat: every X minutes)
    Data: { monitorId, bookingReference, lastName }
```

---

## 🔧 Troubleshooting

### Problema: Monitoring não inicia

```typescript
// Verificar se Redis está rodando
redis.ping().then(console.log);

// Verificar se queue está conectada
monitoringQueue.isReady().then(console.log);

// Listar jobs ativos
monitoringQueue.getJobs(['active', 'waiting']).then(console.log);
```

### Problema: Cache não funciona

```typescript
// Limpar cache manualmente
const cacheKey = `flight_monitor:${bookingRef}:${lastName}`;
await redis.del(cacheKey);
```

### Problema: Muitas requisições

```typescript
// Aumentar intervalo de monitoramento
await service.stopMonitoring('ABC123', 'SILVA');
await service.monitorFlightContinuous('ABC123', 'SILVA', {
  intervalMinutes: 30, // Aumentar de 15 para 30
  notifyOnChange: true,
});
```

---

## 📝 Próximos Passos

- [ ] Implementar integração com GDS (Amadeus/Sabre)
- [ ] Adicionar suporte a voos multi-trecho
- [ ] Implementar rate limiting por source
- [ ] Adicionar métricas Prometheus
- [ ] Criar dashboard de monitoramento
- [ ] Adicionar suporte a notificações SMS
- [ ] Implementar ML para predição de atrasos

---

## 📄 Licença

Interno - VoaLive/ReservaSegura Project

**Gerado em:** 01/11/2025
**Versão:** 1.0.0
