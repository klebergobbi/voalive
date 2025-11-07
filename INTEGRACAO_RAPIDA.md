# 🚀 Integração Rápida - Sistema de Monitoramento

## Passo 1: Adicionar as Importações no `apps/api/src/index.ts`

Adicione estas linhas APÓS as outras importações (por volta da linha 27):

```typescript
// Sistema de Monitoramento de Reservas Aéreas
import airlineMonitoringRoutes from './routes/airline-monitoring.routes';
import { initializeMonitoringSystem, shutdownMonitoringSystem } from './initialize-monitoring';
```

## Passo 2: Registrar as Rotas

Adicione APÓS as outras rotas (por volta da linha 130):

```typescript
// Sistema de Monitoramento de Reservas Aéreas
app.use('/api/monitoring', airlineMonitoringRoutes);
console.log('✅ Sistema de Monitoramento de Reservas Aéreas carregado');
```

## Passo 3: Inicializar o Sistema

Adicione NO FINAL do arquivo, ANTES do `server.listen()`:

```typescript
// Inicializar Sistema de Monitoramento
(async () => {
  try {
    await initializeMonitoringSystem();
  } catch (error) {
    console.error('Erro ao inicializar sistema de monitoramento:', error);
    // Não bloqueia a inicialização do servidor
  }
})();
```

## Passo 4: Graceful Shutdown

Adicione NO FINAL do arquivo:

```typescript
// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido. Encerrando aplicação...');
  await shutdownMonitoringSystem();
  server.close(() => {
    console.log('Servidor fechado');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT recebido. Encerrando aplicação...');
  await shutdownMonitoringSystem();
  server.close(() => {
    console.log('Servidor fechado');
    process.exit(0);
  });
});
```

## Passo 5: Instalar Dependências

```bash
cd /c/Projetos/VoaLive
npm install bullmq axios
npx playwright install chromium --with-deps
```

## Passo 6: Configurar Variáveis de Ambiente

Adicione no arquivo `.env`:

```env
# Sistema de Monitoramento
REDIS_HOST=localhost
REDIS_PORT=6379
WEBHOOK_URL=https://seu-servidor.com/api/webhooks/booking-status
WEBHOOK_SECRET=meu_secret_super_seguro_123
SCRAPING_TIMEOUT=30000
MAX_RETRIES=3
HEADLESS=true
```

## Passo 7: Testar Localmente

```bash
# Compilar
npm run build

# Executar
npm run dev
```

Verificar se aparece:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Inicializando Sistema de Monitoramento de Reservas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Verificando configurações...
   Redis: localhost:6379
   Webhook: https://seu-servidor.com/api/webhooks/booking-status
📦 Inicializando sistema de filas BullMQ...
✅ Sistema de filas inicializado
✅ Sistema de Monitoramento PRONTO
```

## Passo 8: Testar Endpoints

```bash
# Health check
curl http://localhost:4000/api/health

# Listar companhias suportadas
curl http://localhost:4000/api/monitoring/airlines

# Adicionar reserva
curl -X POST http://localhost:4000/api/monitoring/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "pnr": "TEST123",
    "airline": "LATAM",
    "lastName": "TESTE",
    "flightNumber": "LA3090",
    "departureDate": "2025-12-15T10:00:00Z",
    "route": "GRU-BSB"
  }'

# Verificar estatísticas da fila
curl http://localhost:4000/api/monitoring/queue/stats
```

## Passo 9: Deploy para Produção

```bash
chmod +x deploy-airline-monitoring.sh
./deploy-airline-monitoring.sh
```

## Passo 10: Validar em Produção

```bash
# SSH no servidor
ssh root@159.89.80.179

# Ver logs
cd /opt/voalive
docker-compose logs -f api | grep -i "monitoring"

# Testar endpoints
curl http://localhost:3012/api/health
curl http://localhost:3012/api/monitoring/airlines
```

---

## ✅ Checklist de Integração

- [ ] Importações adicionadas no index.ts
- [ ] Rotas registradas
- [ ] Sistema inicializado
- [ ] Graceful shutdown configurado
- [ ] Dependências instaladas (bullmq, axios)
- [ ] Playwright browsers instalados
- [ ] Variáveis de ambiente configuradas
- [ ] Testes locais passando
- [ ] Deploy em produção executado
- [ ] Validação em produção concluída

---

## 🆘 Troubleshooting

### Erro: "Cannot find module 'bullmq'"

```bash
npm install bullmq
```

### Erro: "ECONNREFUSED" do Redis

Verifique se Redis está rodando:

```bash
docker ps | grep redis
# ou
redis-cli ping
```

### Erro: "Playwright browsers not found"

```bash
npx playwright install chromium --with-deps
```

### Logs não aparecem

Verifique se NODE_ENV está definido:

```bash
export NODE_ENV=development
```

---

## 📞 Contato

Se tiver problemas, verificar:
1. Logs do servidor: `docker-compose logs -f api`
2. Health check: `curl http://localhost:3012/api/health`
3. Métricas: `curl http://localhost:3012/api/metrics`
