#!/bin/bash
echo "=== Deploy API Fix (Bull instead of BullMQ) ==="
echo "1. Criando pacote..."
tar -czf voalive-api-fix.tar.gz \
  apps/api/src/queues/queue-manager.ts

echo "2. Enviando para servidor..."
scp voalive-api-fix.tar.gz root@159.89.80.179:/opt/voalive/

echo "3. Extraindo e rebuilding API..."
ssh root@159.89.80.179 'cd /opt/voalive && \
  tar -xzf voalive-api-fix.tar.gz && \
  echo "✅ Arquivos extraídos" && \
  docker-compose -f docker-compose.prod.yml stop reservasegura-api && \
  docker-compose -f docker-compose.prod.yml rm -f reservasegura-api && \
  docker-compose -f docker-compose.prod.yml up -d --no-deps --build reservasegura-api && \
  echo "✅ API rebuild iniciado"'

echo "✅ Deploy finalizado!"
