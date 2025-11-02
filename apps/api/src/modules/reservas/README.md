# Sistema de Monitoramento de Reservas Aéreas em Tempo Real

Sistema completo de scraping e monitoramento automatizado de reservas de companhias aéreas com notificações em tempo real via WebSocket.

## 📋 Sumário

- [Características](#características)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [API Endpoints](#api-endpoints)
- [WebSocket Events](#websocket-events)
- [Companhias Suportadas](#companhias-suportadas)
- [Tratamento de Erros](#tratamento-de-erros)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)

## ✨ Características

- **Scraping Automatizado**: Playwright para navegação realista e extração de dados
- **Monitoramento Contínuo**: Bull Queue com Redis para verificações periódicas (a cada 10 min)
- **Detecção de Mudanças**: Sistema inteligente com hash SHA-256 para comparação rápida
- **Notificações em Tempo Real**: Socket.io para atualizações instantâneas
- **Retry Automático**: Exponential backoff (2s, 4s, 8s) com até 3 tentativas
- **Rotação de Proxies**: Suporte a BrightData, Oxylabs e proxies customizados
- **Circuit Breaker**: Pausa automática após 5 falhas consecutivas
- **Rate Limiting**: Máximo 2 req/seg por companhia aérea
- **Segurança**: Senhas criptografadas com AES-256, logs sanitizados

## 🏗️ Arquitetura

```
┌─────────────┐       ┌──────────────┐       ┌────────────┐
│   Cliente   │◄─────►│  API REST    │◄─────►│   Redis    │
│  (Socket)   │       │  + WebSocket │       │   (Cache)  │
└─────────────┘       └──────────────┘       └────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  Bull Queue  │
                      └──────────────┘
                             │
                             ▼
                      ┌──────────────┐       ┌────────────┐
                      │  Playwright  │◄─────►│   Proxy    │
                      │  (Scraper)   │       │  Rotator   │
                      └──────────────┘       └────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  Companhias  │
                      │   Aéreas     │
                      └──────────────┘
```

## 📦 Instalação

As dependências já estão no `package.json` principal:

```bash
npm install
```

### Dependências Principais

- `playwright` - Automação de browsers
- `bull` - Sistema de filas com Redis
- `ioredis` - Cliente Redis
- `socket.io` - WebSocket em tempo real
- `p-queue` - Controle de concorrência
- `dotenv` - Variáveis de ambiente

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Proxy (opcional)
PROXY_PROVIDER=brightdata  # ou oxylabs, smartproxy, none
PROXY_USERNAME=
PROXY_PASSWORD=
PROXY_ROTATION_INTERVAL=5  # Rotaciona a cada N requisições

# Playwright
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=30000
MAX_CONCURRENT_BROWSERS=5

# Segurança
ENCRYPTION_KEY=sua_chave_32_caracteres_aqui!

# Geral
NODE_ENV=production
LOG_LEVEL=info
FRONTEND_URL=http://localhost:3011
```

### Integração no Express

No arquivo principal (`src/index.ts`):

```typescript
import express from 'express';
import http from 'http';
import cors from 'cors';
import reservasRoutes from './modules/reservas/routes';
import { initializeSocketIO } from './modules/shared/middleware/socketMiddleware';
import { errorMiddleware } from './modules/shared/utils/errorHandler';

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());

// Socket.io
const io = initializeSocketIO(server);
console.log('✓ Socket.io inicializado');

// Rotas
app.use('/api/reservas', reservasRoutes);

// Error handler (deve ser o último middleware)
app.use(errorMiddleware);

server.listen(4000, () => {
  console.log('🚀 Servidor rodando na porta 4000');
});
```

## 🚀 Uso

### 1. Iniciar Monitoramento

```bash
curl -X POST http://localhost:4000/api/reservas/monitorar \
  -H "Content-Type: application/json" \
  -d '{
    "codigoReserva": "ABC123",
    "email": "usuario@email.com",
    "senha": "senha123",
    "companhiaAerea": "LATAM"
  }'
```

**Resposta:**

```json
{
  "sucesso": true,
  "mensagem": "Monitoramento iniciado com sucesso",
  "dados": {
    "jobId": "reserva:ABC123",
    "codigoReserva": "ABC123",
    "companhiaAerea": "LATAM",
    "status": "MONITORANDO",
    "proximaVerificacao": "2024-01-20T15:30:00.000Z"
  }
}
```

### 2. Consultar Status

```bash
curl http://localhost:4000/api/reservas/ABC123/status
```

**Resposta:**

```json
{
  "sucesso": true,
  "dados": {
    "codigoReserva": "ABC123",
    "reserva": {
      "status": "CONFIRMADO",
      "voo": "LA3000",
      "dataVoo": "2024-01-25",
      "origem": "GRU",
      "destino": "GIG",
      "passageiros": [
        {
          "nome": "João Silva",
          "assento": "12A",
          "status": "CHECK-IN REALIZADO"
        }
      ],
      "portao": "G15",
      "horarioDecolagem": "14:30",
      "horarioPouso": "15:45"
    },
    "ultimaAtualizacao": "2024-01-20T14:15:00.000Z",
    "mudancasRecentes": []
  }
}
```

### 3. WebSocket Client (Frontend)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

// Conectado
socket.on('connected', (data) => {
  console.log('Conectado:', data);

  // Inscrever em uma reserva
  socket.emit('reserva:inscrever', { codigoReserva: 'ABC123' });
});

// Reserva atualizada
socket.on('reserva:atualizada', (data) => {
  console.log('Mudanças detectadas:', data.mudancas);

  data.mudancas.forEach((mudanca) => {
    console.log(
      `${mudanca.severidade}: ${mudanca.descricao}`
    );
  });
});

// Erro no monitoramento
socket.on('reserva:erro', (data) => {
  console.error('Erro:', data.erro);
});

// Status da fila
socket.on('fila:status', (stats) => {
  console.log('Fila:', stats);
});
```

### 4. Parar Monitoramento

```bash
curl -X DELETE http://localhost:4000/api/reservas/ABC123/monitorar
```

## 📡 API Endpoints

### Monitoramento

#### `POST /api/reservas/monitorar`

Inicia monitoramento de uma reserva.

**Body:**

```json
{
  "codigoReserva": "ABC123",
  "email": "usuario@email.com",
  "senha": "senha123",
  "companhiaAerea": "LATAM"
}
```

#### `DELETE /api/reservas/:codigoReserva/monitorar`

Para e remove completamente o monitoramento.

#### `POST /api/reservas/:codigoReserva/parar`

Pausa temporariamente (mantém dados).

#### `POST /api/reservas/:codigoReserva/retomar`

Retoma monitoramento pausado.

**Body:**

```json
{
  "email": "usuario@email.com",
  "senha": "senha123",
  "companhiaAerea": "LATAM"
}
```

### Consultas

#### `GET /api/reservas/:codigoReserva/status`

Retorna status atual e últimas mudanças.

#### `GET /api/reservas/:codigoReserva/historico?limite=50`

Retorna histórico completo de mudanças.

#### `GET /api/reservas/estatisticas`

Estatísticas da fila de monitoramento.

#### `GET /api/reservas/companhias`

Lista companhias suportadas.

### Utilitários

#### `POST /api/reservas/testar-conexao`

Testa conectividade com companhia.

**Body:**

```json
{
  "companhiaAerea": "LATAM"
}
```

#### `POST /api/reservas/limpar`

Limpa jobs antigos (admin).

## 🔌 WebSocket Events

### Eventos do Cliente (emit)

- `reserva:inscrever` - Inscreve em notificações
- `reserva:desinscrever` - Remove inscrição
- `ping` - Keep-alive

### Eventos do Servidor (on)

- `connected` - Confirmação de conexão
- `reserva:atualizada` - Mudanças detectadas
- `reserva:erro` - Erro no monitoramento
- `reserva:falha-permanente` - Circuit breaker acionado
- `fila:status` - Status da fila (a cada 30s)
- `pong` - Resposta ao ping

## ✈️ Companhias Suportadas

| Companhia | URL                                     | Status   |
| --------- | --------------------------------------- | -------- |
| LATAM     | latam.com/pt_br/minhas-reservas         | ✓ Ativo  |
| GOL       | voegol.com.br/gerenciar-reserva         | ✓ Ativo  |
| AZUL      | voeazul.com.br/minhas-reservas          | ✓ Ativo  |
| AVIANCA   | avianca.com.br/gerenciar-reserva        | ✓ Ativo  |

## 🚨 Tratamento de Erros

### Captcha Detectado

```json
{
  "success": false,
  "error": {
    "type": "CAPTCHA_DETECTED",
    "message": "Captcha detectado durante o scraping",
    "details": {
      "companhia": "LATAM",
      "codigoReserva": "ABC123"
    }
  }
}
```

**Ação**: Notifica usuário, pausa monitoramento.

### 2FA Necessário

```json
{
  "success": false,
  "error": {
    "type": "TWO_FA_REQUIRED",
    "message": "Autenticação de dois fatores necessária"
  }
}
```

**Ação**: Notifica usuário para completar 2FA manualmente.

### Sessão Expirada

Retry automático de login até 3x. Se falhar, marca como `precisaReautenticacao`.

### Rate Limiting (429)

Aumenta intervalo exponencialmente: 10min → 20min → 30min.

## ⚡ Performance

### Métricas Esperadas

- **Tempo de scraping**: < 3s (login + extração)
- **Latência WebSocket**: < 100ms
- **Memória por browser**: < 150MB
- **Taxa de sucesso**: > 95%
- **Detecção de mudanças**: 100% acurada

### Otimizações

1. **Browser Pool**: Reutiliza browsers (máx 5 simultâneos)
2. **Hash Comparison**: Verifica mudanças em O(1)
3. **Redis Cache**: Consultas instantâneas
4. **Rate Limiting**: Evita bloqueios
5. **Exponential Backoff**: Reduz carga em falhas

## 🔧 Troubleshooting

### Redis Connection Error

```bash
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solução**: Verifique se Redis está rodando

```bash
redis-cli ping
# Resposta: PONG
```

### Playwright Install

```bash
npx playwright install chromium
```

### Proxy Errors

Verifique formato: `username:password@host:port`

```bash
curl -x http://username:password@proxy.com:8080 https://google.com
```

### Circuit Breaker Acionado

**Causa**: 5 falhas consecutivas

**Solução**:

1. Verifique credenciais
2. Teste conexão: `POST /api/reservas/testar-conexao`
3. Retome: `POST /api/reservas/:codigo/retomar`

## 📊 Monitoring

### Health Check

```bash
# Redis
curl http://localhost:4000/api/health/redis

# Playwright
curl http://localhost:4000/api/health/playwright

# Fila
curl http://localhost:4000/api/reservas/estatisticas
```

### Logs

```bash
# Nível de log
LOG_LEVEL=debug npm run dev

# Grepable
cat logs/reservas.log | grep CRÍTICA
```

## 🛡️ Segurança

- ✅ Senhas AES-256 criptografadas
- ✅ Logs sanitizados (sem dados sensíveis)
- ✅ Rate limiting: 100 req/hora por usuário
- ✅ Validação de input (Zod)
- ✅ Headers realistas (anti-bot)
- ✅ Proxy rotation

## 📝 Exemplos Completos

### Exemplo Node.js

```javascript
const axios = require('axios');

async function monitorarReserva() {
  // 1. Iniciar monitoramento
  const response = await axios.post(
    'http://localhost:4000/api/reservas/monitorar',
    {
      codigoReserva: 'XYZ789',
      email: 'teste@email.com',
      senha: 'minhasenha',
      companhiaAerea: 'GOL',
    }
  );

  console.log('Monitoramento iniciado:', response.data);

  // 2. Consultar status após 1 minuto
  setTimeout(async () => {
    const status = await axios.get(
      'http://localhost:4000/api/reservas/XYZ789/status'
    );
    console.log('Status:', status.data);
  }, 60000);
}

monitorarReserva();
```

### Exemplo React

```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function ReservaMonitor({ codigoReserva }) {
  const [mudancas, setMudancas] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:4000');

    newSocket.on('connected', () => {
      newSocket.emit('reserva:inscrever', { codigoReserva });
    });

    newSocket.on('reserva:atualizada', (data) => {
      setMudancas((prev) => [...data.mudancas, ...prev]);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [codigoReserva]);

  return (
    <div>
      <h2>Monitorando: {codigoReserva}</h2>
      {mudancas.map((m, i) => (
        <div key={i} className={m.severidade}>
          {m.descricao}
        </div>
      ))}
    </div>
  );
}
```

## 📄 Licença

Este módulo faz parte do projeto VoaLive/ReservaSegura.

## 🤝 Suporte

Para issues ou dúvidas, consulte a documentação principal do projeto.

---

**Desenvolvido com ❤️ para monitoramento de reservas aéreas em tempo real**
