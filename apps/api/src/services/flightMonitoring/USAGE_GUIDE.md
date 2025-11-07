# 🚀 FlightMonitoringService - Guia de Uso Completo

**Versão:** 2.0
**Data:** 01/11/2025
**Status:** ✅ Produção

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Inicialização](#inicialização)
3. [Método 1: getFlightStatusByReservation](#método-1-getflightstatusbyreservation)
4. [Método 2: searchAcrossAllLayers](#método-2-searchacrossalllayers)
5. [Método 3: monitorFlightContinuous](#método-3-monitorflightcontinuous)
6. [Método 4: parseReservationDetails](#método-4-parsereservationdetails)
7. [Casos de Uso Avançados](#casos-de-uso-avançados)
8. [Tratamento de Erros](#tratamento-de-erros)
9. [Testes](#testes)

---

## 🎯 Visão Geral

O **FlightMonitoringService** é um sistema completo de monitoramento de voos com **3 camadas de fallback automático**:

### Arquitetura de 3 Camadas

```
┌─────────────────────────────────────────────────┐
│          FlightMonitoringService                │
│                                                 │
│  Layer 1: GDS (Amadeus/Sabre)        [Fastest] │
│       ↓ fallback                                │
│  Layer 2: APIs Comerciais            [Reliable]│
│       ↓ fallback                                │
│  Layer 3: Web Scraping               [Complete]│
└─────────────────────────────────────────────────┘
```

### Recursos Principais

- ✅ **Busca em cascata** com fallback automático
- ✅ **Cache distribuído** com Redis (15 min TTL)
- ✅ **Rate limiting** por IP e usuário
- ✅ **Distributed locks** (evita buscas duplicadas)
- ✅ **Monitoramento contínuo** com Bull queues
- ✅ **Notificações em tempo real** via WebSocket
- ✅ **Histórico de mudanças** persistido
- ✅ **Detecção automática** de alterações

---

## 🔧 Inicialização

### Configuração Básica

```typescript
import { FlightMonitoringService } from './services/flightMonitoring';
import Redis from 'ioredis';
import Queue from 'bull';

// 1. Configurar Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
});

// 2. Configurar Bull Queue
const monitoringQueue = new Queue('flight-monitoring', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
});

// 3. Inicializar serviço
const flightMonitor = new FlightMonitoringService(
  redis,
  monitoringQueue,
  {
    // Opcional: Injetar serviços de camadas
    gdsService: amadeusSabreService,        // Layer 1
    apiService: aviationStackService,       // Layer 2
    scrapingService: airlineScraperService, // Layer 3

    cacheConfig: {
      defaultTTL: 900, // 15 minutos
    }
  }
);

console.log('✅ FlightMonitoringService inicializado');
```

### Configuração Completa

```typescript
import { FlightMonitoringService } from './services/flightMonitoring';
import { AviationStackService } from './services/aviationstack.service';
import { FlightRadar24Service } from './services/flightradar24.service';
import { AirlineScraperService } from './modules/reservas/services/scraperService';

const flightMonitor = new FlightMonitoringService(
  redis,
  monitoringQueue,
  {
    // Layer 2: APIs Comerciais
    apiService: {
      aviationStack: new AviationStackService(),
      flightRadar24: new FlightRadar24Service(),
      flightAware: new FlightAwareService(),
    },

    // Layer 3: Web Scraping
    scrapingService: new AirlineScraperService(),

    // Cache config
    cacheConfig: {
      defaultTTL: 900,
      maxEntries: 10000,
      compressionEnabled: true,
    }
  }
);

// Eventos
flightMonitor.on('monitoring:started', (job) => {
  console.log(`🚀 Monitoring started: ${job.id}`);
});

flightMonitor.on('flight:change:detected', (change) => {
  console.log(`🔔 Change detected:`, change);
});
```

---

## 📖 Método 1: getFlightStatusByReservation

### Descrição
Busca o status de um voo usando **código de reserva + sobrenome do passageiro**.

### Assinatura
```typescript
async getFlightStatusByReservation(
  bookingReference: string,
  lastName: string,
  options?: {
    airline?: string;
    useCache?: boolean;
    ip?: string;
    userId?: string;
  }
): Promise<FlightStatus>
```

### Parâmetros

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `bookingReference` | string | ✅ | Código da reserva (PNR/Localizador) |
| `lastName` | string | ✅ | Sobrenome do passageiro |
| `options.airline` | string | ❌ | Código IATA da companhia (ex: 'G3', 'LA') |
| `options.useCache` | boolean | ❌ | Usar cache (padrão: true) |
| `options.ip` | string | ❌ | IP do cliente (para rate limiting) |
| `options.userId` | string | ❌ | ID do usuário (para rate limiting) |

### Retorno: FlightStatus
```typescript
interface FlightStatus {
  success: boolean;
  bookingReference: string;
  lastName: string;

  flight?: {
    flightNumber: string;           // Ex: "G31234"
    airline: string;                // Ex: "GOL"
    airlineName: string;            // Ex: "GOL Linhas Aéreas"
    aircraft: string;               // Ex: "Boeing 737-800"
    status: FlightStatusCode;       // SCHEDULED, DELAYED, etc.

    departure: {
      airport: string;              // IATA: "GRU"
      airportName: string;          // "Guarulhos International"
      scheduledTime: Date;
      estimatedTime?: Date;
      actualTime?: Date;
      terminal?: string;
      gate?: string;
    };

    arrival: {
      airport: string;              // IATA: "GIG"
      airportName: string;          // "Galeão International"
      scheduledTime: Date;
      estimatedTime?: Date;
      actualTime?: Date;
      terminal?: string;
      gate?: string;
    };

    delay?: {
      minutes: number;              // Atraso em minutos
      reason?: string;              // Motivo do atraso
    };

    passengers?: Array<{
      firstName: string;
      lastName: string;
      seat?: string;
      ticketNumber?: string;
    }>;

    bookingStatus?: BookingStatusCode; // CONFIRMED, PENDING, etc.
    lastUpdated: Date;
    rawData?: any;
  };

  status: string;                   // STATUS_OK, ERROR, RATE_LIMITED
  source: 'GDS' | 'API' | 'SCRAPING' | 'CACHE';
  timestamp: Date;
  error?: string;

  metadata?: {
    searchStrategy: 'CASCADE' | 'DIRECT';
    layerUsed: 'GDS' | 'EXTERNAL_API' | 'WEB_SCRAPING' | 'CACHE';
    attempts: {
      gds: { tried: boolean; success: boolean; error: string | null; duration: number };
      externalAPI: { tried: boolean; success: boolean; error: string | null; duration: number };
      scraping: { tried: boolean; success: boolean; error: string | null; duration: number };
    };
    totalDuration: number;
    retryAfter?: number;
    suggestion?: string;
  };
}
```

### Exemplos de Uso

#### Exemplo 1: Busca Simples
```typescript
// Busca com cache habilitado (padrão)
const result = await flightMonitor.getFlightStatusByReservation(
  'PDCDX',  // Código da reserva
  'Silva'   // Sobrenome
);

if (result.success && result.flight) {
  console.log(`✅ Voo encontrado: ${result.flight.flightNumber}`);
  console.log(`   Origem: ${result.flight.departure.airport}`);
  console.log(`   Destino: ${result.flight.arrival.airport}`);
  console.log(`   Status: ${result.flight.status}`);
  console.log(`   Fonte: ${result.source}`);

  if (result.flight.delay) {
    console.log(`   ⚠️ Atraso: ${result.flight.delay.minutes} minutos`);
  }
} else {
  console.error(`❌ Erro: ${result.error}`);
}
```

**Output:**
```
✅ Voo encontrado: G31234
   Origem: GRU
   Destino: GIG
   Status: SCHEDULED
   Fonte: CACHE
```

#### Exemplo 2: Busca com Companhia Específica
```typescript
const result = await flightMonitor.getFlightStatusByReservation(
  'SDWZVF',
  'Santos',
  {
    airline: 'LA',    // LATAM
    useCache: false,  // Forçar busca nova
  }
);

console.log(`Fonte dos dados: ${result.source}`);
console.log(`Camada usada: ${result.metadata?.layerUsed}`);
console.log(`Tempo total: ${result.metadata?.totalDuration}ms`);
```

#### Exemplo 3: Com Rate Limiting
```typescript
// Em um endpoint Express
app.post('/api/flight-status', async (req, res) => {
  const { bookingReference, lastName } = req.body;
  const clientIP = req.ip;
  const userId = req.user?.id;

  const result = await flightMonitor.getFlightStatusByReservation(
    bookingReference,
    lastName,
    {
      ip: clientIP,
      userId: userId,
    }
  );

  if (result.status === 'RATE_LIMITED') {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: result.error,
      retryAfter: result.metadata?.retryAfter,
    });
  }

  res.json(result);
});
```

#### Exemplo 4: Tratamento Completo
```typescript
try {
  const result = await flightMonitor.getFlightStatusByReservation(
    bookingRef,
    lastName,
    { useCache: true }
  );

  // Verificar sucesso
  if (!result.success) {
    console.error(`❌ Falha na busca: ${result.error}`);

    // Analisar tentativas
    if (result.metadata?.attempts) {
      const { gds, externalAPI, scraping } = result.metadata.attempts;

      if (gds.tried && !gds.success) {
        console.log(`   GDS falhou: ${gds.error}`);
      }
      if (externalAPI.tried && !externalAPI.success) {
        console.log(`   API Externa falhou: ${externalAPI.error}`);
      }
      if (scraping.tried && !scraping.success) {
        console.log(`   Scraping falhou: ${scraping.error}`);
      }
    }

    return;
  }

  // Processar dados do voo
  const flight = result.flight!;

  // Calcular tempo até partida
  const now = new Date();
  const departure = flight.departure.scheduledTime;
  const hoursUntilDeparture = (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

  console.log(`Voo ${flight.flightNumber} parte em ${hoursUntilDeparture.toFixed(1)}h`);

  // Verificar status
  switch (flight.status) {
    case 'SCHEDULED':
      console.log('✅ Voo no horário');
      break;
    case 'DELAYED':
      console.log(`⚠️ Atrasado ${flight.delay?.minutes || 0} minutos`);
      break;
    case 'CANCELLED':
      console.log('❌ Voo cancelado');
      break;
    case 'DEPARTED':
      console.log('🛫 Voo partiu');
      break;
    case 'ARRIVED':
      console.log('🛬 Voo chegou');
      break;
  }

  // Informações de gate
  if (flight.departure.gate) {
    console.log(`Portão de embarque: ${flight.departure.gate}`);
  }

  // Performance metrics
  console.log(`\n📊 Métricas:`);
  console.log(`   Fonte: ${result.source}`);
  console.log(`   Camada: ${result.metadata?.layerUsed}`);
  console.log(`   Duração: ${result.metadata?.totalDuration}ms`);

} catch (error) {
  console.error('Erro na busca:', error);
}
```

---

## 🔄 Método 2: searchAcrossAllLayers

### Descrição
Executa busca em **cascata** através das 3 camadas com **fallback automático**. Este método é chamado internamente por `getFlightStatusByReservation`, mas pode ser usado diretamente para ter mais controle.

### Assinatura
```typescript
async searchAcrossAllLayers(
  bookingReference: string,
  lastName: string,
  airline?: string
): Promise<FlightStatus>
```

### Estratégia de Fallback

```
1. Layer 1: GDS (Amadeus/Sabre)
   ✅ Sucesso? → Retorna resultado
   ❌ Falha? → Continua para Layer 2

2. Layer 2: APIs Comerciais
   ✅ Sucesso? → Retorna resultado
   ❌ Falha? → Continua para Layer 3

3. Layer 3: Web Scraping
   ✅ Sucesso? → Retorna resultado
   ❌ Falha? → Retorna erro detalhado
```

### Exemplo de Uso Direto

```typescript
const result = await flightMonitor.searchAcrossAllLayers(
  'PDCDX',
  'Silva',
  'G3' // GOL
);

// Analisar camada usada
console.log(`Camada que respondeu: ${result.metadata?.layerUsed}`);

// Ver todas as tentativas
if (result.metadata?.attempts) {
  const { gds, externalAPI, scraping } = result.metadata.attempts;

  console.log('\n🔍 Tentativas:');
  console.log(`   GDS: ${gds.tried ? (gds.success ? '✅' : '❌') : '⏭️'} (${gds.duration}ms)`);
  console.log(`   API: ${externalAPI.tried ? (externalAPI.success ? '✅' : '❌') : '⏭️'} (${externalAPI.duration}ms)`);
  console.log(`   Scraping: ${scraping.tried ? (scraping.success ? '✅' : '❌') : '⏭️'} (${scraping.duration}ms)`);
}
```

### Cenários de Fallback

#### Cenário 1: GDS Responde (Mais Rápido)
```
📡 Layer 1: GDS → ✅ Sucesso em 120ms
⏭️ Layer 2: Não executado
⏭️ Layer 3: Não executado
─────────────────────────
Total: 120ms
Fonte: GDS
```

#### Cenário 2: GDS Falha, API Responde
```
📡 Layer 1: GDS → ❌ Timeout após 5000ms
🌐 Layer 2: API → ✅ Sucesso em 850ms
⏭️ Layer 3: Não executado
─────────────────────────
Total: 5850ms
Fonte: EXTERNAL_API
```

#### Cenário 3: Apenas Scraping Funciona
```
📡 Layer 1: GDS → ❌ Booking not found
🌐 Layer 2: API → ❌ No data available
🕷️ Layer 3: Scraping → ✅ Sucesso em 12500ms
─────────────────────────
Total: 18350ms
Fonte: WEB_SCRAPING
```

#### Cenário 4: Todas as Camadas Falharam
```
📡 Layer 1: GDS → ❌ Connection timeout
🌐 Layer 2: API → ❌ Rate limit exceeded
🕷️ Layer 3: Scraping → ❌ Captcha detected
─────────────────────────
Total: 25000ms
Erro: All layers failed
```

---

## ⏰ Método 3: monitorFlightContinuous

### Descrição
Inicia **monitoramento contínuo** de um voo com **polling automático** a cada X minutos.

### Assinatura
```typescript
async monitorFlightContinuous(
  bookingReference: string,
  lastName: string,
  options: MonitoringOptions
): Promise<MonitoringJob>

interface MonitoringOptions {
  intervalMinutes: number;
  notifyOnChange: boolean;
  notifyOnDelay: boolean;
  notifyOnGateChange: boolean;
  notifyChannels?: ('email' | 'sms' | 'push' | 'webhook')[];
  autoStop?: {
    afterDeparture?: boolean;
    afterMinutes?: number;
  };
}
```

### Parâmetros

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `intervalMinutes` | number | ✅ | Intervalo de checagem (mín: 5, recom: 15) |
| `notifyOnChange` | boolean | ✅ | Notificar em qualquer mudança |
| `notifyOnDelay` | boolean | ✅ | Notificar em atrasos |
| `notifyOnGateChange` | boolean | ✅ | Notificar mudança de portão |
| `notifyChannels` | string[] | ❌ | Canais de notificação |
| `autoStop.afterDeparture` | boolean | ❌ | Parar após partida do voo |
| `autoStop.afterMinutes` | number | ❌ | Parar após X minutos |

### Retorno: MonitoringJob
```typescript
interface MonitoringJob {
  id: string;                           // "PDCDX:Silva"
  bookingReference: string;
  lastName: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';
  intervalMinutes: number;
  startedAt: Date;
  lastCheckAt?: Date;
  nextCheckAt?: Date;
  checksPerformed: number;
  changesDetected: number;
  currentFlightStatus?: FlightStatus;
  options: MonitoringOptions;
}
```

### Exemplos de Uso

#### Exemplo 1: Monitoramento Básico
```typescript
const monitoringJob = await flightMonitor.monitorFlightContinuous(
  'PDCDX',
  'Silva',
  {
    intervalMinutes: 15,     // Checar a cada 15 minutos
    notifyOnChange: true,    // Notificar qualquer mudança
    notifyOnDelay: true,     // Notificar atrasos
    notifyOnGateChange: true // Notificar mudança de portão
  }
);

console.log(`✅ Monitoramento iniciado: ${monitoringJob.id}`);
console.log(`   Status inicial: ${monitoringJob.currentFlightStatus?.flight?.status}`);
console.log(`   Próxima checagem: ${monitoringJob.nextCheckAt}`);
```

#### Exemplo 2: Com Auto-Stop
```typescript
const job = await flightMonitor.monitorFlightContinuous(
  'SDWZVF',
  'Santos',
  {
    intervalMinutes: 10,
    notifyOnChange: true,
    notifyOnDelay: true,
    notifyOnGateChange: true,

    // Parar automaticamente após partida
    autoStop: {
      afterDeparture: true,
      afterMinutes: 30  // Ou 30 min após partida
    }
  }
);

console.log(`Monitoramento ativo até partida + 30 min`);
```

#### Exemplo 3: Com Múltiplos Canais de Notificação
```typescript
const job = await flightMonitor.monitorFlightContinuous(
  'ABC123',
  'Costa',
  {
    intervalMinutes: 15,
    notifyOnChange: true,
    notifyOnDelay: true,
    notifyOnGateChange: true,

    // Notificar via email, SMS e push
    notifyChannels: ['email', 'sms', 'push']
  }
);
```

#### Exemplo 4: Escutar Eventos de Mudança
```typescript
// Iniciar monitoramento
const job = await flightMonitor.monitorFlightContinuous(
  'PDCDX',
  'Silva',
  {
    intervalMinutes: 15,
    notifyOnChange: true,
    notifyOnDelay: true,
    notifyOnGateChange: true
  }
);

// Escutar eventos
flightMonitor.on('flight:change:detected', (change) => {
  console.log(`\n🔔 Mudança detectada!`);
  console.log(`   Tipo: ${change.type}`);
  console.log(`   Campo: ${change.field}`);
  console.log(`   Valor anterior: ${change.oldValue}`);
  console.log(`   Novo valor: ${change.newValue}`);
  console.log(`   Severidade: ${change.severity}`);

  // Enviar notificação personalizada
  if (change.type === 'DELAY' && change.severity === 'HIGH') {
    sendEmailNotification({
      to: 'passenger@email.com',
      subject: `⚠️ Voo ${job.bookingReference} atrasado`,
      body: `Seu voo foi atrasado em ${change.newValue} minutos.`
    });
  }
});
```

#### Exemplo 5: Parar Monitoramento
```typescript
// Parar monitoramento específico
const stopped = await flightMonitor.stopMonitoring('PDCDX', 'Silva');

if (stopped) {
  console.log('✅ Monitoramento parado');
} else {
  console.log('❌ Falha ao parar monitoramento');
}
```

#### Exemplo 6: Ver Status do Monitoramento
```typescript
// Buscar job ativo
const job = await flightMonitor.getMonitoringStatus('PDCDX', 'Silva');

if (job) {
  console.log(`📊 Status do Monitoramento:`);
  console.log(`   Status: ${job.status}`);
  console.log(`   Iniciado: ${job.startedAt}`);
  console.log(`   Última checagem: ${job.lastCheckAt}`);
  console.log(`   Próxima checagem: ${job.nextCheckAt}`);
  console.log(`   Checagens realizadas: ${job.checksPerformed}`);
  console.log(`   Mudanças detectadas: ${job.changesDetected}`);

  if (job.currentFlightStatus?.flight) {
    console.log(`\n✈️ Status Atual do Voo:`);
    console.log(`   Voo: ${job.currentFlightStatus.flight.flightNumber}`);
    console.log(`   Status: ${job.currentFlightStatus.flight.status}`);
    console.log(`   Portão: ${job.currentFlightStatus.flight.departure.gate || 'N/A'}`);
  }
} else {
  console.log('❌ Monitoramento não encontrado');
}
```

#### Exemplo 7: Listar Todos os Monitoramentos
```typescript
const allJobs = await flightMonitor.listAllMonitoring();

console.log(`📋 Total de monitoramentos ativos: ${allJobs.length}\n`);

allJobs.forEach((job, index) => {
  console.log(`${index + 1}. ${job.bookingReference} (${job.lastName})`);
  console.log(`   Status: ${job.status}`);
  console.log(`   Intervalo: ${job.intervalMinutes} min`);
  console.log(`   Checagens: ${job.checksPerformed}`);
  console.log(`   Mudanças: ${job.changesDetected}`);
  console.log('');
});
```

---

## 📝 Método 4: parseReservationDetails

### Descrição
Extrai informações estruturadas de dados brutos de reserva (JSON, XML, ou objetos).

### Assinatura
```typescript
parseReservationDetails(bookingData: any): ParsedReservation

interface ParsedReservation {
  flightNumber: string;
  departureDate: Date;
  airline: string;
  airlineCode: string;
  routes: Array<{
    origin: string;
    destination: string;
    flightNumber: string;
    date: Date;
  }>;
  passengers: Array<{
    firstName: string;
    lastName: string;
    type: 'ADULT' | 'CHILD' | 'INFANT';
  }>;
  bookingClass: string;
  pnr: string;
  totalAmount?: number;
}
```

### Exemplos de Uso

#### Exemplo 1: Parsing de Reserva Simples
```typescript
const rawBooking = {
  bookingCode: 'PDCDX',
  flights: [
    {
      flightNumber: 'G31234',
      origin: 'GRU',
      destination: 'GIG',
      departureDate: '2025-11-15T10:30:00Z',
      airline: 'GOL Linhas Aéreas'
    }
  ],
  passengers: [
    {
      firstName: 'João',
      lastName: 'Silva',
      type: 'ADULT'
    }
  ],
  bookingClass: 'ECONOMY',
  totalAmount: 450.00
};

const parsed = flightMonitor.parseReservationDetails(rawBooking);

console.log(`✅ Reserva parseada:`);
console.log(`   PNR: ${parsed.pnr}`);
console.log(`   Voo: ${parsed.flightNumber}`);
console.log(`   Data: ${parsed.departureDate}`);
console.log(`   Companhia: ${parsed.airline} (${parsed.airlineCode})`);
console.log(`   Passageiros: ${parsed.passengers.length}`);
console.log(`   Rotas: ${parsed.routes.length}`);
```

**Output:**
```
✅ Reserva parseada:
   PNR: PDCDX
   Voo: G31234
   Data: 2025-11-15T10:30:00.000Z
   Companhia: GOL Linhas Aéreas (G3)
   Passageiros: 1
   Rotas: 1
```

#### Exemplo 2: Múltiplos Voos (Conexões)
```typescript
const multiFlightBooking = {
  pnr: 'XYZ789',
  flights: [
    {
      flightNumber: 'LA3456',
      origin: 'GRU',
      destination: 'GIG',
      date: '2025-11-20T08:00:00Z',
      airline: 'LATAM'
    },
    {
      flightNumber: 'LA7890',
      origin: 'GIG',
      destination: 'MAO',
      date: '2025-11-20T14:30:00Z',
      airline: 'LATAM'
    }
  ],
  passengers: [
    {
      firstName: 'Maria',
      lastName: 'Santos',
      type: 'ADULT'
    },
    {
      firstName: 'Pedro',
      lastName: 'Santos',
      type: 'CHILD'
    }
  ],
  class: 'BUSINESS',
  amount: 2500.00
};

const parsed = flightMonitor.parseReservationDetails(multiFlightBooking);

console.log(`Jornada com ${parsed.routes.length} voos:`);
parsed.routes.forEach((route, i) => {
  console.log(`  ${i + 1}. ${route.flightNumber}: ${route.origin} → ${route.destination}`);
});
```

**Output:**
```
Jornada com 2 voos:
  1. LA3456: GRU → GIG
  2. LA7890: GIG → MAO
```

#### Exemplo 3: Integração com Busca
```typescript
// 1. Parser dados de reserva
const bookingData = await fetchBookingFromAPI('PDCDX');
const parsed = flightMonitor.parseReservationDetails(bookingData);

// 2. Buscar status usando dados parseados
const status = await flightMonitor.getFlightStatusByReservation(
  parsed.pnr,
  parsed.passengers[0].lastName,
  {
    airline: parsed.airlineCode
  }
);

console.log(`Voo ${parsed.flightNumber} → Status: ${status.flight?.status}`);
```

#### Exemplo 4: Validação de Dados Parseados
```typescript
function validateParsedReservation(parsed: ParsedReservation): boolean {
  const validations = [
    { check: parsed.pnr.length >= 5, msg: 'PNR inválido' },
    { check: parsed.flightNumber.length > 0, msg: 'Número de voo ausente' },
    { check: parsed.routes.length > 0, msg: 'Nenhuma rota encontrada' },
    { check: parsed.passengers.length > 0, msg: 'Nenhum passageiro' },
    { check: parsed.airlineCode.length >= 2, msg: 'Código de companhia inválido' }
  ];

  for (const validation of validations) {
    if (!validation.check) {
      console.error(`❌ ${validation.msg}`);
      return false;
    }
  }

  console.log('✅ Reserva válida');
  return true;
}

const parsed = flightMonitor.parseReservationDetails(rawData);
if (validateParsedReservation(parsed)) {
  // Processar reserva
}
```

---

## 🚀 Casos de Uso Avançados

### Caso 1: Dashboard de Monitoramento

```typescript
import express from 'express';
import { Server } from 'socket.io';

const app = express();
const server = require('http').createServer(app);
const io = new Server(server);

// Endpoint para iniciar monitoramento
app.post('/api/monitoring/start', async (req, res) => {
  const { bookingReference, lastName, intervalMinutes } = req.body;

  try {
    const job = await flightMonitor.monitorFlightContinuous(
      bookingReference,
      lastName,
      {
        intervalMinutes,
        notifyOnChange: true,
        notifyOnDelay: true,
        notifyOnGateChange: true
      }
    );

    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// WebSocket: Enviar atualizações em tempo real
flightMonitor.on('flight:change:detected', (change) => {
  io.emit('flight-update', change);
});

// Dashboard frontend
io.on('connection', (socket) => {
  console.log('Cliente conectado');

  socket.on('request-status', async (bookingRef, lastName) => {
    const job = await flightMonitor.getMonitoringStatus(bookingRef, lastName);
    socket.emit('monitoring-status', job);
  });
});

server.listen(3000);
```

### Caso 2: Notificações Multi-Canal

```typescript
import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Configurar transports
const emailTransporter = nodemailer.createTransporter({...});
const twilioClient = twilio(accountSid, authToken);

// Escutar mudanças
flightMonitor.on('flight:change:detected', async (change) => {
  const { bookingReference, lastName, type, severity } = change;

  // Buscar dados do passageiro
  const passenger = await getPassengerInfo(bookingReference, lastName);

  // Email
  if (passenger.email) {
    await emailTransporter.sendMail({
      to: passenger.email,
      subject: `✈️ Atualização do voo ${bookingReference}`,
      html: generateEmailHTML(change)
    });
  }

  // SMS (apenas mudanças críticas)
  if (passenger.phone && severity === 'CRITICAL') {
    await twilioClient.messages.create({
      to: passenger.phone,
      from: twilioNumber,
      body: `🚨 URGENTE: ${change.description}`
    });
  }

  // Push notification
  if (passenger.deviceToken) {
    await sendPushNotification(passenger.deviceToken, change);
  }

  // Webhook
  if (passenger.webhookUrl) {
    await axios.post(passenger.webhookUrl, change);
  }
});
```

### Caso 3: Analytics e Métricas

```typescript
// Coletar estatísticas de uso
class FlightMonitoringAnalytics {
  private metrics = {
    totalSearches: 0,
    cacheHits: 0,
    cacheMisses: 0,
    layerUsage: {
      gds: 0,
      api: 0,
      scraping: 0
    },
    averageResponseTime: 0,
    errorRate: 0
  };

  async trackSearch(result: FlightStatus) {
    this.metrics.totalSearches++;

    // Cache hit/miss
    if (result.source === 'CACHE') {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    // Layer usage
    if (result.metadata?.layerUsed) {
      const layer = result.metadata.layerUsed.toLowerCase();
      this.metrics.layerUsage[layer]++;
    }

    // Response time
    if (result.metadata?.totalDuration) {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime + result.metadata.totalDuration) / 2;
    }

    // Error rate
    if (!result.success) {
      this.metrics.errorRate =
        (this.metrics.errorRate * (this.metrics.totalSearches - 1) + 1) /
        this.metrics.totalSearches;
    }

    // Save to database
    await this.saveMetrics();
  }

  getReport() {
    const cacheHitRate = (this.metrics.cacheHits / this.metrics.totalSearches) * 100;

    return {
      totalSearches: this.metrics.totalSearches,
      cacheHitRate: `${cacheHitRate.toFixed(2)}%`,
      layerDistribution: this.metrics.layerUsage,
      avgResponseTime: `${this.metrics.averageResponseTime.toFixed(0)}ms`,
      errorRate: `${(this.metrics.errorRate * 100).toFixed(2)}%`
    };
  }
}

// Usar analytics
const analytics = new FlightMonitoringAnalytics();

flightMonitor.on('search:completed', (result) => {
  analytics.trackSearch(result);
});

// Endpoint de métricas
app.get('/api/analytics', (req, res) => {
  res.json(analytics.getReport());
});
```

---

## 🛠️ Tratamento de Erros

### Erros Comuns

```typescript
try {
  const result = await flightMonitor.getFlightStatusByReservation(
    bookingRef,
    lastName
  );

} catch (error) {
  if (error.message.includes('RATE_LIMITED')) {
    // Rate limit excedido
    console.log('Aguarde antes de tentar novamente');

  } else if (error.message.includes('TIMEOUT')) {
    // Timeout na busca
    console.log('Busca demorou muito, tente novamente');

  } else if (error.message.includes('BOOKING_NOT_FOUND')) {
    // Reserva não encontrada
    console.log('Código de reserva inválido');

  } else if (error.message.includes('ALL_LAYERS_FAILED')) {
    // Todas as camadas falharam
    console.log('Serviço temporariamente indisponível');

  } else {
    // Erro desconhecido
    console.error('Erro inesperado:', error);
  }
}
```

### Retry Logic

```typescript
async function searchWithRetry(
  bookingRef: string,
  lastName: string,
  maxRetries: number = 3
): Promise<FlightStatus> {

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Tentativa ${attempt}/${maxRetries}...`);

      const result = await flightMonitor.getFlightStatusByReservation(
        bookingRef,
        lastName,
        { useCache: attempt === 1 } // Cache apenas na 1ª tentativa
      );

      if (result.success) {
        return result;
      }

      // Aguardar antes de retry
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Aguardando ${delay}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw new Error('Todas as tentativas falharam');
}
```

---

## ✅ Testes

### Teste Unitário

```typescript
describe('FlightMonitoringService', () => {
  let service: FlightMonitoringService;
  let redis: Redis;
  let queue: Queue;

  beforeEach(() => {
    redis = new Redis();
    queue = new Queue('test');
    service = new FlightMonitoringService(redis, queue);
  });

  afterEach(async () => {
    await redis.flushdb();
    await queue.close();
  });

  describe('getFlightStatusByReservation', () => {
    it('deve retornar status do voo com sucesso', async () => {
      const result = await service.getFlightStatusByReservation(
        'TEST123',
        'Silva'
      );

      expect(result.success).toBe(true);
      expect(result.bookingReference).toBe('TEST123');
      expect(result.source).toBeDefined();
    });

    it('deve usar cache na segunda busca', async () => {
      // Primeira busca
      const result1 = await service.getFlightStatusByReservation(
        'TEST123',
        'Silva'
      );
      expect(result1.source).not.toBe('CACHE');

      // Segunda busca (deve vir do cache)
      const result2 = await service.getFlightStatusByReservation(
        'TEST123',
        'Silva'
      );
      expect(result2.source).toBe('CACHE');
    });
  });

  describe('parseReservationDetails', () => {
    it('deve parsear reserva corretamente', () => {
      const rawData = {
        bookingCode: 'ABC123',
        flights: [{ flightNumber: 'G31234', /* ... */ }],
        passengers: [{ firstName: 'João', lastName: 'Silva' }]
      };

      const parsed = service.parseReservationDetails(rawData);

      expect(parsed.pnr).toBe('ABC123');
      expect(parsed.flightNumber).toBe('G31234');
      expect(parsed.passengers).toHaveLength(1);
    });
  });
});
```

### Teste de Integração

```typescript
describe('Integration Tests', () => {
  it('deve monitorar voo e detectar mudanças', async (done) => {
    // Iniciar monitoramento
    const job = await flightMonitor.monitorFlightContinuous(
      'TEST123',
      'Silva',
      {
        intervalMinutes: 1, // 1 minuto para teste
        notifyOnChange: true,
        notifyOnDelay: true,
        notifyOnGateChange: true
      }
    );

    // Escutar mudanças
    flightMonitor.once('flight:change:detected', (change) => {
      expect(change.type).toBeDefined();
      expect(change.oldValue).toBeDefined();
      expect(change.newValue).toBeDefined();

      // Parar monitoramento
      flightMonitor.stopMonitoring('TEST123', 'Silva');
      done();
    });

    // Simular mudança após 30s
    setTimeout(async () => {
      // Alterar dados do voo no mock
      await updateMockFlightData('TEST123', { gate: 'A10' });
    }, 30000);
  }, 120000); // Timeout de 2 minutos
});
```

---

## 📚 Conclusão

O **FlightMonitoringService** oferece uma solução completa para monitoramento de voos com:

✅ **3 camadas de fallback** automático
✅ **Cache distribuído** com Redis
✅ **Rate limiting** inteligente
✅ **Monitoramento contínuo** com Bull queues
✅ **Notificações em tempo real** via WebSocket
✅ **Parsing robusto** de dados de reserva
✅ **Métricas e analytics** integrados

Para mais informações, consulte:
- [README.md](./README.md) - Documentação técnica
- [CASCADE_FALLBACK_STRATEGY.md](./CASCADE_FALLBACK_STRATEGY.md) - Estratégia de fallback
- [CACHE_INTEGRATION.md](./CACHE_INTEGRATION.md) - Sistema de cache
- [examples.ts](./examples.ts) - Mais exemplos de código

---

**Última atualização:** 01/11/2025
**Versão:** 2.0
**Suporte:** claude@reservasegura.pro
