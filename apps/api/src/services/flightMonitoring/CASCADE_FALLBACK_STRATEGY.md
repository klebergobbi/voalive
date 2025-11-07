# 🎯 Cascade Fallback Strategy

Estratégia robusta de fallback em cascata para busca de status de voos com 3 camadas de fontes de dados.

---

## 📋 Overview

Sistema de busca inteligente que tenta múltiplas fontes de dados em ordem de prioridade, com tracking detalhado e erro estruturado.

### Fluxo de Decisão

```
┌─────────────────┐
│  Start Search   │
│  PNR + LastName │
└────────┬────────┘
         │
         ▼
   ┌──────────────────────┐
   │   LAYER 1: GDS       │
   │ (Amadeus/Sabre)      │
   ├──────────────────────┤
   │ Input: PNR + Name    │
   │ Output: Full Details │
   └────────┬─────────────┘
            │
            ├─ ✅ SUCCESS → Return with metadata
            │
            ├─ ❌ FAIL → Extract flight info (if partial data)
            │            └─ flightNumber + date + airline
            ▼
   ┌──────────────────────────────┐
   │   LAYER 2: External APIs     │
   │ (FlightStats/AviationStack)  │
   ├──────────────────────────────┤
   │ Input:                       │
   │  - Extracted: flight# + date │
   │  - Fallback: PNR + Name      │
   └────────┬─────────────────────┘
            │
            ├─ ✅ SUCCESS → Return with metadata
            │
            ├─ ❌ FAIL
            ▼
   ┌──────────────────────────┐
   │   LAYER 3: Web Scraping  │
   │ (Airline Websites)       │
   ├──────────────────────────┤
   │ Input: PNR + Name        │
   │ Method: Puppeteer        │
   └────────┬─────────────────┘
            │
            ├─ ✅ SUCCESS → Return with metadata
            │
            ├─ ❌ FAIL
            ▼
   ┌──────────────────────────┐
   │   Structured Error       │
   │ + Detailed Attempts Log  │
   │ + Retry Suggestion       │
   └──────────────────────────┘
```

---

## 🔄 Layer Details

### Layer 1: GDS (Global Distribution System)

**Prioridade:** Alta (tentado primeiro)
**Velocidade:** Rápida (< 1s)
**Confiabilidade:** Alta
**Cobertura:** Ampla (maioria das companhias)

**Fontes:**
- Amadeus
- Sabre
- Galileo

**Input:**
```typescript
{
  bookingReference: "PDCDX",
  lastName: "DINIZ"
}
```

**Output (sucesso):**
```typescript
{
  success: true,
  flight: {
    flightNumber: "G31234",
    airline: "G3",
    departure: {
      scheduledTime: "2025-01-15T10:30:00Z",
      airport: "GRU",
      gate: "12"
    },
    arrival: { ... },
    status: "SCHEDULED"
  },
  source: "GDS",
  metadata: {
    searchStrategy: "CASCADE",
    layerUsed: "GDS",
    attempts: {
      gds: { tried: true, success: true, error: null, duration: 850 },
      externalAPI: { tried: false, success: false, error: null, duration: 0 },
      scraping: { tried: false, success: false, error: null, duration: 0 }
    },
    totalDuration: 850
  }
}
```

**Quando falha:**
- PNR não encontrado no GDS
- Voo já completado (> 48h)
- Voo não sincronizado ainda (< 24h)
- Erro de conectividade

**Extração de dados parciais:**
Se GDS retornar dados parciais (ex: apenas flight number), extraímos para usar no Layer 2:
```typescript
extractedFlightInfo = {
  flightNumber: "G31234",
  date: new Date("2025-01-15T10:30:00Z"),
  airline: "G3"
}
```

---

### Layer 2: External APIs

**Prioridade:** Média (fallback do GDS)
**Velocidade:** Média (1-3s)
**Confiabilidade:** Média-Alta
**Cobertura:** Boa (voos ativos)

**Fontes:**
- FlightStats
- AviationStack
- FlightAware
- FlightRadar24

**Estratégia Inteligente:**

**Opção A - Com dados extraídos do Layer 1:**
```typescript
// Se GDS retornou dados parciais
if (extractedFlightInfo) {
  searchBy: {
    flightNumber: "G31234",
    date: "2025-01-15",
    airline: "G3"
  }
}
```

**Opção B - Sem dados extraídos:**
```typescript
// Fallback para busca por PNR
searchBy: {
  bookingReference: "PDCDX",
  lastName: "DINIZ",
  airline: "G3" // se fornecido
}
```

**Output (sucesso):**
```typescript
{
  success: true,
  flight: { ... },
  source: "API",
  metadata: {
    searchStrategy: "CASCADE",
    layerUsed: "EXTERNAL_API",
    attempts: {
      gds: { tried: true, success: false, error: "PNR not found", duration: 850 },
      externalAPI: { tried: true, success: true, error: null, duration: 1250 },
      scraping: { tried: false, success: false, error: null, duration: 0 }
    },
    totalDuration: 2100
  }
}
```

**Quando falha:**
- Voo não encontrado nas APIs
- API rate limit atingido
- API fora do ar
- Dados desatualizados

---

### Layer 3: Web Scraping

**Prioridade:** Baixa (último recurso)
**Velocidade:** Lenta (5-15s)
**Confiabilidade:** Média
**Cobertura:** Limitada (apenas sites que conseguimos scraper)

**Fontes:**
- Site GOL
- Site LATAM
- Site Azul
- Site Avianca

**Input:**
```typescript
{
  bookingReference: "PDCDX",
  lastName: "DINIZ",
  airline: "G3" // usado para escolher scraper
}
```

**Processo:**
1. Detecta airline pelo PNR ou usa fornecida
2. Seleciona scraper apropriado
3. Abre browser headless (Puppeteer)
4. Preenche formulário
5. Extrai dados da página
6. Parse e normaliza

**Output (sucesso):**
```typescript
{
  success: true,
  flight: { ... },
  source: "SCRAPING",
  metadata: {
    searchStrategy: "CASCADE",
    layerUsed: "WEB_SCRAPING",
    attempts: {
      gds: { tried: true, success: false, error: "Connection timeout", duration: 1000 },
      externalAPI: { tried: true, success: false, error: "Flight not found", duration: 2300 },
      scraping: { tried: true, success: true, error: null, duration: 12500 }
    },
    totalDuration: 15800
  }
}
```

**Quando falha:**
- Site da companhia fora do ar
- Estrutura do site mudou (seletores quebrados)
- Captcha/anti-bot bloqueou
- Timeout (> 30s)
- PNR inválido

---

## ❌ Structured Error Response

Quando **todos os layers falharem**, retorna erro estruturado com detalhes completos:

```typescript
{
  success: false,
  bookingReference: "PDCDX",
  lastName: "DINIZ",
  status: "FLIGHT_STATUS_UNAVAILABLE",
  source: "API",
  timestamp: "2025-01-15T10:30:00Z",
  error: "Não foi possível obter status do voo. Todas as fontes de dados falharam.",
  metadata: {
    searchStrategy: "CASCADE",
    layerUsed: "NONE",
    attempts: {
      gds: {
        tried: true,
        success: false,
        error: "Connection timeout after 5000ms",
        duration: 5000
      },
      externalAPI: {
        tried: true,
        success: false,
        error: "Flight not found in any API",
        duration: 2500
      },
      scraping: {
        tried: true,
        success: false,
        error: "Site returned 503 Service Unavailable",
        duration: 8000
      }
    },
    totalDuration: 15500,
    retryAfter: 300, // 5 minutos
    suggestion: "Verifique se os dados da reserva estão corretos. Se o voo for muito recente ou muito antigo, pode não estar disponível em nossas fontes."
  }
}
```

### Campos do Erro Estruturado

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `success` | `false` | Indica falha |
| `status` | `FLIGHT_STATUS_UNAVAILABLE` | Status específico |
| `error` | string | Mensagem principal |
| `metadata.attempts` | object | Log detalhado de cada tentativa |
| `metadata.attempts.*.tried` | boolean | Se layer foi tentado |
| `metadata.attempts.*.success` | boolean | Se teve sucesso |
| `metadata.attempts.*.error` | string \| null | Erro específico |
| `metadata.attempts.*.duration` | number | Tempo gasto (ms) |
| `metadata.totalDuration` | number | Tempo total (ms) |
| `metadata.retryAfter` | number | Segundos para retry |
| `metadata.suggestion` | string | Sugestão para usuário |

---

## 💡 Uso no Frontend

### Exemplo 1: React Component com Fallback UI

```typescript
import { useState } from 'react';

function FlightSearch() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function search(pnr: string, lastName: string) {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/flights/status?bookingReference=${pnr}&lastName=${lastName}`
      );
      const data = await response.json();

      setResult(data.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {loading && (
        <div className="loading">
          <Spinner />
          <p>Buscando em múltiplas fontes...</p>
        </div>
      )}

      {result && (
        <div>
          {result.success ? (
            <SuccessCard flight={result.flight} metadata={result.metadata} />
          ) : (
            <ErrorCard error={result} />
          )}
        </div>
      )}
    </div>
  );
}

function SuccessCard({ flight, metadata }) {
  return (
    <div className="success-card">
      <h2>{flight.flightNumber}</h2>
      <p>Status: {flight.status}</p>
      <p>Portão: {flight.departure.gate}</p>

      {/* Mostrar fonte de dados */}
      <div className="metadata">
        <Badge color="green">
          Fonte: {metadata.layerUsed}
        </Badge>
        <span>Encontrado em {metadata.totalDuration}ms</span>
      </div>

      {/* Mostrar tentativas */}
      {metadata.attempts && (
        <details>
          <summary>Ver tentativas</summary>
          <ul>
            {metadata.attempts.gds.tried && (
              <li>
                GDS: {metadata.attempts.gds.success ? '✅' : '❌'}
                {metadata.attempts.gds.error && ` (${metadata.attempts.gds.error})`}
                - {metadata.attempts.gds.duration}ms
              </li>
            )}
            {metadata.attempts.externalAPI.tried && (
              <li>
                API Externa: {metadata.attempts.externalAPI.success ? '✅' : '❌'}
                {metadata.attempts.externalAPI.error && ` (${metadata.attempts.externalAPI.error})`}
                - {metadata.attempts.externalAPI.duration}ms
              </li>
            )}
            {metadata.attempts.scraping.tried && (
              <li>
                Web Scraping: {metadata.attempts.scraping.success ? '✅' : '❌'}
                {metadata.attempts.scraping.error && ` (${metadata.attempts.scraping.error})`}
                - {metadata.attempts.scraping.duration}ms
              </li>
            )}
          </ul>
        </details>
      )}
    </div>
  );
}

function ErrorCard({ error }) {
  const { metadata } = error;

  return (
    <div className="error-card">
      <h3>❌ Voo não encontrado</h3>
      <p>{error.error}</p>

      {/* Sugestão */}
      {metadata?.suggestion && (
        <div className="suggestion">
          <strong>💡 Sugestão:</strong>
          <p>{metadata.suggestion}</p>
        </div>
      )}

      {/* Tentativas */}
      {metadata?.attempts && (
        <div className="attempts">
          <h4>Tentativas realizadas:</h4>
          <ul>
            {Object.entries(metadata.attempts).map(([layer, attempt]) => (
              attempt.tried && (
                <li key={layer}>
                  <strong>{layer}:</strong> {attempt.error || 'Nenhum dado retornado'}
                  <span className="duration">({attempt.duration}ms)</span>
                </li>
              )
            ))}
          </ul>
          <p>Tempo total: {metadata.totalDuration}ms</p>
        </div>
      )}

      {/* Retry */}
      {metadata?.retryAfter && (
        <button onClick={() => scheduleRetry(metadata.retryAfter)}>
          Tentar novamente em {metadata.retryAfter}s
        </button>
      )}
    </div>
  );
}
```

### Exemplo 2: Logging de Tentativas

```typescript
async function searchWithLogging(pnr: string, lastName: string) {
  console.log(`🔍 Starting cascade search for ${pnr}`);

  const response = await fetch(
    `/api/flights/status?bookingReference=${pnr}&lastName=${lastName}`
  );
  const data = await response.json();

  // Log detalhado
  if (data.success) {
    console.log(`✅ Found via ${data.data.metadata.layerUsed}`);
    console.log(`   Total time: ${data.data.metadata.totalDuration}ms`);

    // Log tentativas
    const attempts = data.data.metadata.attempts;
    console.table({
      GDS: {
        tried: attempts.gds.tried,
        success: attempts.gds.success,
        error: attempts.gds.error || 'N/A',
        duration: `${attempts.gds.duration}ms`,
      },
      'External API': {
        tried: attempts.externalAPI.tried,
        success: attempts.externalAPI.success,
        error: attempts.externalAPI.error || 'N/A',
        duration: `${attempts.externalAPI.duration}ms`,
      },
      Scraping: {
        tried: attempts.scraping.tried,
        success: attempts.scraping.success,
        error: attempts.scraping.error || 'N/A',
        duration: `${attempts.scraping.duration}ms`,
      },
    });
  } else {
    console.error(`❌ All layers failed after ${data.data.metadata.totalDuration}ms`);
    console.error('   Errors:');
    Object.entries(data.data.metadata.attempts).forEach(([layer, attempt]) => {
      if (attempt.tried) {
        console.error(`   - ${layer}: ${attempt.error}`);
      }
    });
  }

  return data.data;
}
```

---

## 📊 Performance Metrics

### Typical Timings

| Layer | Success Time | Failure Time |
|-------|--------------|--------------|
| GDS | 500-1500ms | 3000-5000ms (timeout) |
| External API | 1000-3000ms | 2000-5000ms (timeout) |
| Web Scraping | 5000-15000ms | 20000-30000ms (timeout) |

### Best Case
- **GDS encontra imediatamente**: ~800ms

### Average Case
- **GDS falha + API sucesso**: ~4s

### Worst Case
- **Todos falharem**: ~30-40s

---

## 🎯 Benefits

### 1. Resiliência
- Se uma fonte falhar, tenta outras
- Sistema sempre retorna resposta estruturada
- Nunca retorna erro genérico

### 2. Inteligência
- Usa dados extraídos do Layer 1 para otimizar Layer 2
- Tracking detalhado de cada tentativa
- Sugestões contextuais para o usuário

### 3. Transparência
- Frontend sabe exatamente o que aconteceu
- Logs estruturados para debugging
- Métricas de performance por layer

### 4. User Experience
- Feedback claro sobre o processo
- Sugestões de próximos passos
- Retry inteligente com tempo sugerido

---

## 🔧 Configuration

```typescript
// Configurar timeouts por layer
const config = {
  gds: {
    timeout: 5000,
    retries: 2,
  },
  externalAPI: {
    timeout: 10000,
    retries: 3,
  },
  scraping: {
    timeout: 30000,
    retries: 2,
  },
  retryAfterSeconds: 300, // 5 minutos
};
```

---

## 🚀 Next Steps

1. **Circuit Breaker**: Desabilitar temporariamente layers que falharem muito
2. **Smart Routing**: Escolher layer baseado em histórico de sucesso
3. **Parallel Attempts**: Tentar múltiplos layers simultaneamente
4. **Predictive Caching**: Pré-carregar voos populares

---

**Criado em:** 01/11/2025
**Versão:** 1.0.0
**Status:** ✅ Implementado
