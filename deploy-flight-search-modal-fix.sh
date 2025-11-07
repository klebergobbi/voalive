#!/bin/bash
echo "=== Deploy Flight Search Modal Fix (Endpoint Híbrido) ==="
echo "1. Criando pacote..."
tar -czf voalive-flight-search-fix.tar.gz \
  apps/web/src/components/dashboard/flight-search-modal.tsx

echo "2. Enviando para servidor..."
scp voalive-flight-search-fix.tar.gz root@159.89.80.179:/opt/voalive/

echo "3. Extraindo e rebuilding..."
ssh root@159.89.80.179 'cd /opt/voalive && \
  tar -xzf voalive-flight-search-fix.tar.gz && \
  echo "✅ Arquivos extraídos" && \
  docker-compose -f docker-compose.prod.yml stop reservasegura-web && \
  docker-compose -f docker-compose.prod.yml rm -f reservasegura-web && \
  docker-compose -f docker-compose.prod.yml up -d --no-deps --build reservasegura-web && \
  echo "✅ Web rebuild concluído"'

echo "✅ Deploy finalizado!"
