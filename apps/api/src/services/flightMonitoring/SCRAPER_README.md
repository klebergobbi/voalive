# 🕷️ Airline Web Scraper System

Sistema avançado de web scraping para companhias aéreas brasileiras com suporte a proxy rotation, retry logic e anti-detecção.

---

## 📋 Índice

- [Features](#features)
- [Companhias Suportadas](#companhias-suportadas)
- [Instalação](#instalação)
- [Uso Rápido](#uso-rápido)
- [Configuração](#configuração)
- [Proxy Setup](#proxy-setup)
- [API Reference](#api-reference)
- [Exemplos](#exemplos)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Core Features
- ✅ **4 Scrapers Prontos**: GOL, LATAM, Azul, Avianca
- ✅ **Factory Pattern**: Detecção automática de companhia pelo código
- ✅ **Headless Browser**: Puppeteer com modo headless
- ✅ **Retry Logic**: Backoff exponencial com jitter
- ✅ **Timeout Configurável**: Por scraper ou global
- ✅ **Error Handling**: Tratamento robusto de erros

### Advanced Features
- ✅ **Proxy Rotation**: Suporte a Bright Data, Oxylabs e proxies customizados
- ✅ **User-Agent Rotation**: 5+ user agents diferentes
- ✅ **Stealth Mode**: Anti-detecção (navigator.webdriver, plugins, etc)
- ✅ **Session Management**: Proxies sticky para consistência
- ✅ **Stats Tracking**: Métricas de sucesso/falha por proxy
- ✅ **Parallel Scraping**: Múltiplas reservas simultaneamente

---

## 🏢 Companhias Suportadas

| Companhia | Código IATA | Padrão PNR | Status |
|-----------|-------------|------------|--------|
| GOL       | G3          | 6 chars ou G3xxxx | ✅ Implementado |
| LATAM     | LA/JJ       | LAxxxx ou JJxxxx  | ✅ Implementado |
| Azul      | AD          | ADxxxx            | ✅ Implementado |
| Avianca   | AV          | AVxxxx            | ✅ Implementado |

### Dados Extraídos

Para cada reserva, o scraper extrai:
- ✅ Status do voo (Scheduled, Delayed, Cancelled, etc)
- ✅ Número do voo
- ✅ Portão de embarque
- ✅ Terminal
- ✅ Assento
- ✅ Horários (partida/chegada)
- ✅ Atraso (se houver)
- ✅ Origem/Destino
- ✅ Aeronave

---

## 📦 Instalação

As dependências já estão instaladas no projeto VoaLive:

```bash
# Verificar instalação
npm ls puppeteer

# Se necessário, reinstalar
npm install puppeteer@latest
```

---

## 🚀 Uso Rápido

### Exemplo 1: Scraper Específico

```typescript
import { GolScraper } from './airlineWebScraper';

const scraper = new GolScraper({
  headless: true,
  timeout: 30000,
  maxRetries: 3,
});

const result = await scraper.scrapeFlightStatus('PDCDX', 'DINIZ');

if (result.success) {
  console.log('Voo:', result.flight?.flightNumber);
  console.log('Status:', result.flight?.status);
  console.log('Portão:', result.flight?.departure.gate);
}
```

### Exemplo 2: Factory com Auto-Detect

```typescript
import AirlineScraperFactory from './airlineWebScraper';

// Detecta automaticamente a companhia pelo código
const airline = AirlineScraperFactory.detectAirline('G32067'); // 'GOL'

const scraper = AirlineScraperFactory.getScraper(airline);
const result = await scraper.scrapeFlightStatus('G32067', 'SILVA');
```

### Exemplo 3: Tentar Todas as Companhias

```typescript
import AirlineScraperFactory from './airlineWebScraper';

// Tenta todas as companhias até encontrar
const result = await AirlineScraperFactory.scrapeAny('ABC123', 'SANTOS');

if (result.success) {
  console.log('Encontrado na:', result.flight?.airline);
}
```

---

## ⚙️ Configuração

### ScraperConfig

```typescript
interface ScraperConfig {
  headless?: boolean;           // Default: true
  timeout?: number;             // Default: 30000ms (30s)
  maxRetries?: number;          // Default: 3
  useProxy?: boolean;           // Default: false
  proxyUrl?: string;            // Proxy URL
  userAgentRotation?: boolean;  // Default: true
  stealthMode?: boolean;        // Default: true
}
```

### Exemplo de Configuração Avançada

```typescript
const config: ScraperConfig = {
  headless: true,                    // Modo headless
  timeout: 45000,                    // 45 segundos
  maxRetries: 5,                     // 5 tentativas
  useProxy: true,                    // Usar proxy
  proxyUrl: 'http://user:pass@proxy.com:8080',
  userAgentRotation: true,           // Rotacionar UA
  stealthMode: true,                 // Anti-detecção
};

const scraper = new LatamScraper(config);
```

---

## 🔐 Proxy Setup

### Opção 1: Bright Data (Recomendado)

```typescript
import { ProxyManager, BrightDataProvider } from './proxyManager';

const proxyManager = new ProxyManager();

proxyManager.addProvider('brightdata', new BrightDataProvider({
  username: 'your-username',
  password: 'your-password',
  zone: 'residential', // ou 'datacenter'
}));

proxyManager.setActiveProvider('brightdata');

// Usar em scraper
const proxyUrl = proxyManager.getProxyUrl();
const scraper = new GolScraper({
  useProxy: true,
  proxyUrl,
});
```

### Opção 2: Oxylabs

```typescript
import { OxylabsProvider } from './proxyManager';

proxyManager.addProvider('oxylabs', new OxylabsProvider({
  username: 'customer-username',
  password: 'customer-password',
}));
```

### Opção 3: Proxies Customizados

```typescript
import { CustomProxyProvider } from './proxyManager';

proxyManager.addProvider('custom', new CustomProxyProvider([
  {
    host: 'proxy1.example.com',
    port: 8080,
    username: 'user1',
    password: 'pass1',
    protocol: 'http',
  },
  {
    host: 'proxy2.example.com',
    port: 8080,
    protocol: 'http',
  },
]));
```

### Opção 4: Environment Variables

```bash
# .env
PROXY_PROVIDER=brightdata
BRIGHTDATA_USERNAME=your-username
BRIGHTDATA_PASSWORD=your-password
BRIGHTDATA_ZONE=residential
```

```typescript
import { setupProxyFromEnv } from './proxyManager';

const proxyManager = setupProxyFromEnv();
const proxyUrl = proxyManager.getProxyUrl();
```

---

## 📚 API Reference

### AirlineScraper (Base Class)

```typescript
abstract class AirlineScraper {
  constructor(config?: ScraperConfig)

  // Main method
  async scrapeFlightStatus(
    bookingRef: string,
    lastName: string
  ): Promise<FlightStatus>

  // Abstract methods (implementados por cada companhia)
  protected abstract getCheckInUrl(): string
  protected abstract getSelectors(): Record<string, string>
  protected abstract fillBookingForm(page: Page, ...): Promise<void>
  protected abstract extractFlightData(page: Page): Promise<ScrapedFlightData>
}
```

### AirlineScraperFactory

```typescript
class AirlineScraperFactory {
  // Get scraper for specific airline
  static getScraper(
    airlineCode: AirlineCode,
    config?: ScraperConfig
  ): AirlineScraper

  // Detect airline from booking code
  static detectAirline(bookingCode: string): AirlineCode | null

  // Try all airlines
  static async scrapeAny(
    bookingRef: string,
    lastName: string,
    config?: ScraperConfig
  ): Promise<FlightStatus>

  // Clear cache
  static clearCache(): void
}
```

### ProxyManager

```typescript
class ProxyManager {
  // Add provider
  addProvider(name: string, provider: ProxyProvider): void

  // Set active provider
  setActiveProvider(name: string): void

  // Get proxy URL
  getProxyUrl(): string | null

  // Rotate proxy
  rotate(): void

  // Track metrics
  recordSuccess(): void
  recordFailure(): void
  getStats(): Record<string, ProxyStats>
}
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Scraping Simples

```typescript
const scraper = new GolScraper();
const result = await scraper.scrapeFlightStatus('ABC123', 'SILVA');

console.log(result);
// {
//   success: true,
//   bookingReference: 'ABC123',
//   lastName: 'SILVA',
//   source: 'SCRAPING',
//   flight: {
//     flightNumber: 'G31234',
//     status: 'SCHEDULED',
//     airline: 'GOL',
//     departure: { ... },
//     arrival: { ... }
//   }
// }
```

### Exemplo 2: Com Proxy e Retry

```typescript
const proxyManager = setupProxyFromEnv();

const scraper = new LatamScraper({
  useProxy: true,
  proxyUrl: proxyManager.getProxyUrl(),
  maxRetries: 5,
  timeout: 60000,
});

try {
  const result = await scraper.scrapeFlightStatus('LA1234', 'SANTOS');
  proxyManager.recordSuccess();
} catch (error) {
  proxyManager.recordFailure();
  proxyManager.rotate(); // Troca de proxy
}
```

### Exemplo 3: Múltiplas Reservas em Paralelo

```typescript
const bookings = [
  { code: 'ABC', name: 'SILVA', airline: 'GOL' },
  { code: 'DEF', name: 'SANTOS', airline: 'LATAM' },
  { code: 'GHI', name: 'COSTA', airline: 'AZUL' },
];

const results = await Promise.all(
  bookings.map(async (booking) => {
    const scraper = AirlineScraperFactory.getScraper(booking.airline);
    return scraper.scrapeFlightStatus(booking.code, booking.name);
  })
);

const successCount = results.filter(r => r.success).length;
console.log(`${successCount}/${bookings.length} encontrados`);
```

### Exemplo 4: Loop com Rate Limiting

```typescript
const bookings = [...]; // Lista de reservas

for (const booking of bookings) {
  const scraper = AirlineScraperFactory.getScraper(booking.airline);

  try {
    const result = await scraper.scrapeFlightStatus(
      booking.code,
      booking.lastName
    );

    if (result.success) {
      // Salvar no banco de dados
      await saveToDatabase(result);
    }
  } catch (error) {
    console.error(`Erro em ${booking.code}:`, error);
  }

  // Rate limiting: aguardar 5 segundos entre requisições
  await new Promise(resolve => setTimeout(resolve, 5000));
}
```

---

## 🐛 Troubleshooting

### Problema: "Could not find booking code input field"

**Causa:** Seletores CSS desatualizados

**Solução:**
```typescript
// Atualizar seletores na classe do scraper
protected getSelectors(): Record<string, string> {
  return {
    bookingCodeInput: 'input[name="newFieldName"]', // Atualizar aqui
    // ...
  };
}
```

### Problema: Timeout excessivo

**Causa:** Site lento ou bloqueio

**Solução:**
```typescript
const scraper = new GolScraper({
  timeout: 60000, // Aumentar timeout para 60s
  maxRetries: 5,  // Mais tentativas
  useProxy: true, // Usar proxy
});
```

### Problema: Bloqueio por anti-bot

**Solução 1:** Ativar stealth mode
```typescript
const scraper = new LatamScraper({
  stealthMode: true,
  userAgentRotation: true,
});
```

**Solução 2:** Usar proxy rotation
```typescript
const proxyManager = setupProxyFromEnv();

for (let i = 0; i < attempts; i++) {
  const scraper = new GolScraper({
    useProxy: true,
    proxyUrl: proxyManager.getProxyUrl(),
  });

  try {
    return await scraper.scrapeFlightStatus(code, name);
  } catch (error) {
    proxyManager.rotate(); // Próximo proxy
  }
}
```

### Problema: Muito lento

**Solução:** Usar scraping paralelo
```typescript
const results = await Promise.all(
  bookings.map(b => scraper.scrapeFlightStatus(b.code, b.name))
);
```

### Problema: Proxy não funciona

**Verificar:**
1. Credenciais corretas
2. Formato da URL
3. Firewall/VPN

```typescript
// Test proxy
const testUrl = 'https://api.ipify.org?format=json';
const response = await axios.get(testUrl, {
  proxy: {
    host: 'proxy.example.com',
    port: 8080,
    auth: {
      username: 'user',
      password: 'pass',
    },
  },
});
console.log('IP:', response.data.ip);
```

---

## 📊 Best Practices

### 1. Rate Limiting

```typescript
// Aguardar entre requisições
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

for (const booking of bookings) {
  await scraper.scrapeFlightStatus(booking.code, booking.name);
  await delay(5000); // 5 segundos
}
```

### 2. Error Handling

```typescript
try {
  const result = await scraper.scrapeFlightStatus(code, name);

  if (!result.success) {
    console.warn('Not found:', result.error);
    // Tentar método alternativo
  }
} catch (error) {
  console.error('Critical error:', error);
  // Enviar alerta
}
```

### 3. Caching

```typescript
const cache = new Map();
const cacheKey = `${code}:${name}`;

// Check cache
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}

// Scrape and cache
const result = await scraper.scrapeFlightStatus(code, name);
cache.set(cacheKey, result);

// Expire after 15 minutes
setTimeout(() => cache.delete(cacheKey), 15 * 60 * 1000);
```

### 4. Monitoring

```typescript
const stats = {
  total: 0,
  success: 0,
  failed: 0,
};

try {
  stats.total++;
  const result = await scraper.scrapeFlightStatus(code, name);

  if (result.success) {
    stats.success++;
  } else {
    stats.failed++;
  }
} catch {
  stats.failed++;
}

console.log(`Success rate: ${stats.success / stats.total * 100}%`);
```

---

## 🔧 Advanced Configuration

### Custom User Agents

```typescript
class CustomScraper extends AirlineScraper {
  constructor(config?: ScraperConfig) {
    super(config);

    // Override user agents
    this.userAgents = [
      'Custom User Agent 1',
      'Custom User Agent 2',
    ];
  }
}
```

### Custom Retry Logic

```typescript
class CustomScraper extends AirlineScraper {
  protected calculateBackoff(attempt: number): number {
    // Custom backoff: linear instead of exponential
    return attempt * 2000; // 2s, 4s, 6s, ...
  }
}
```

---

## 📈 Performance Tips

1. **Use Headless Mode**: 30% faster
2. **Enable Proxy Rotation**: Avoid IP bans
3. **Parallel Scraping**: 3-5x faster for multiple bookings
4. **Cache Results**: Reduce redundant requests
5. **Optimize Timeouts**: Balance speed vs reliability

---

## 🎯 Roadmap

- [ ] Copa Airlines scraper
- [ ] TAP Portugal scraper
- [ ] Playwright alternative (faster)
- [ ] Screenshot on error (debugging)
- [ ] Captcha solving integration
- [ ] WebSocket for real-time updates

---

**Criado em:** 01/11/2025
**Versão:** 1.0.0
**Projeto:** VoaLive/ReservaSegura
