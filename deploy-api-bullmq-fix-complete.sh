#!/bin/bash
echo "=== Deploy API Fix Completo (BullMQ → Bull) ==="
echo "1. Criando pacote com TODOS os arquivos corrigidos..."
tar -czf voalive-api-bullmq-fix.tar.gz \
  apps/api/src/queues/queue-manager.ts \
  apps/api/src/queues/booking-monitor.processor.ts \
  apps/api/src/services/airline-monitoring.service.ts

echo "2. Enviando para servidor..."
scp voalive-api-bullmq-fix.tar.gz root@159.89.80.179:/opt/voalive/

echo "3. Extraindo e rebuilding API..."
ssh root@159.89.80.179 'cd /opt/voalive && \
  tar -xzf voalive-api-bullmq-fix.tar.gz && \
  echo "✅ Arquivos extraídos" && \
  docker-compose -f docker-compose.prod.yml stop reservasegura-api && \
  docker-compose -f docker-compose.prod.yml rm -f reservasegura-api && \
  docker-compose -f docker-compose.prod.yml up -d --no-deps --build reservasegura-api && \
  echo "✅ API rebuild iniciado"'

echo "✅ Deploy finalizado!"
