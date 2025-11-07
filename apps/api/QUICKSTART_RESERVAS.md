# Quick Start - Sistema de Monitoramento de Reservas

Guia rápido para integrar o módulo de monitoramento de reservas na sua aplicação.

## 🚀 Setup em 3 Passos

### 1. Configure o Ambiente

Copie as variáveis de ambiente:

```bash
cat .env.reservas.example >> .env
```

Edite `.env` e configure:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
ENCRYPTION_KEY=mude_para_chave_unica_32_chars
```

### 2. Integre no Server Principal

No seu `src/index.ts`:

```typescript
import express from 'express';
import http from 'http';
import cors from 'cors';
import { initReservasModule } from './modules/reservas';
import { errorMiddleware } from './modules/shared/utils/errorHandler';

const app = express();
const server = http.createServer(app);

// Middlewares básicos
app.use(cors());
app.use(express.json());

// ✨ INICIALIZA MÓDULO DE RESERVAS (1 linha!)
initReservasModule(app, server);

// Error handler (sempre por último)
app.use(errorMiddleware);

server.listen(4000, () => {
  console.log('🚀 Servidor rodando na porta 4000');
});
```

### 3. Teste

```bash
# Inicie Redis
redis-server

# Inicie o servidor
npm run dev

# Teste API
curl http://localhost:4000/api/health/reservas

# Resposta esperada:
# {
#   "status": "healthy",
#   "checks": {
#     "redis": "ok",
#     "playwright": "ok",
#     "queue": "ok"
#   }
# }
```

## 📡 Teste Completo

### 1. Inicie um Monitoramento

```bash
curl -X POST http://localhost:4000/api/reservas/monitorar \
  -H "Content-Type: application/json" \
  -d '{
    "codigoReserva": "ABC123",
    "email": "teste@email.com",
    "senha": "minhasenha",
    "companhiaAerea": "LATAM"
  }'
```

### 2. Consulte Status

```bash
curl http://localhost:4000/api/reservas/ABC123/status
```

### 3. Teste WebSocket

Crie `test-socket.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Teste WebSocket</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <h1>Monitor de Reservas</h1>
  <div id="logs"></div>

  <script>
    const socket = io('http://localhost:4000');
    const logs = document.getElementById('logs');

    function log(msg) {
      logs.innerHTML += `<p>${new Date().toLocaleTimeString()}: ${msg}</p>`;
    }

    socket.on('connected', (data) => {
      log('✓ Conectado: ' + data.socketId);
      socket.emit('reserva:inscrever', { codigoReserva: 'ABC123' });
    });

    socket.on('reserva:inscrito', (data) => {
      log('✓ Inscrito: ' + data.codigoReserva);
    });

    socket.on('reserva:atualizada', (data) => {
      log('🔔 ATUALIZAÇÃO: ' + JSON.stringify(data.mudancas));
    });

    socket.on('fila:status', (stats) => {
      log('📊 Fila: ' + stats.ativos + ' ativos');
    });
  </script>
</body>
</html>
```

Abra no navegador.

## 🎯 Próximos Passos

### Personalizar Scrapers

Os scrapers atuais são templates básicos. Para personalizar:

```typescript
// apps/api/src/modules/reservas/services/scrapers/latamScraper.ts

const SELETORES = {
  // Atualize com seletores CSS reais
  inputCodigoReserva: 'input[name="bookingCode"]',
  status: '.booking-status',
  // ...
};
```

### Adicionar Autenticação

```typescript
import { asyncHandler, AuthenticationError } from './modules/shared/utils/errorHandler';

// Middleware de autenticação
const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new AuthenticationError();

  // Valide token...
  next();
});

// Proteja rotas
app.use('/api/reservas', requireAuth, reservasRoutes);
```

### Integrar com Banco de Dados

No `models/Reserva.ts`, conecte com Prisma:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReservaRepository {
  static async create(data: IReservaCreate) {
    return prisma.reserva.create({ data });
  }

  static async findByCodigoReserva(codigo: string) {
    return prisma.reserva.findUnique({
      where: { codigoReserva: codigo }
    });
  }
}
```

### Deploy em Produção

#### Docker Compose

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  api:
    build: .
    environment:
      - REDIS_HOST=redis
      - PLAYWRIGHT_HEADLESS=true
      - NODE_ENV=production
    ports:
      - "4000:4000"
    depends_on:
      - redis

volumes:
  redis-data:
```

#### Variáveis de Produção

```env
PLAYWRIGHT_HEADLESS=true
MAX_CONCURRENT_BROWSERS=3
ENCRYPTION_KEY=prod_key_32_chars_muito_segura
PROXY_PROVIDER=brightdata
```

## 📚 Documentação Completa

Veja `src/modules/reservas/README.md` para:

- Todos os endpoints da API
- Eventos WebSocket completos
- Tratamento de erros específicos
- Configuração de proxies
- Performance tuning
- Troubleshooting

## 🆘 Problemas Comuns

### "Cannot find module 'ioredis'"

```bash
npm install
```

### "Redis connection refused"

```bash
# Inicie Redis
redis-server

# Ou via Docker
docker run -d -p 6379:6379 redis:alpine
```

### "Playwright browsers not found"

```bash
npx playwright install chromium
```

## 🎉 Pronto!

Seu sistema de monitoramento está configurado. Agora você pode:

- ✅ Monitorar reservas em tempo real
- ✅ Receber notificações via WebSocket
- ✅ Detectar mudanças automaticamente
- ✅ Escalar horizontalmente com Redis

**Dúvidas?** Consulte a documentação completa ou abra uma issue.
