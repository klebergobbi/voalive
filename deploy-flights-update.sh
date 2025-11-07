#!/bin/bash
echo "=== Deploy Flights Page Atualizado (Removido Botão Manual de Monitoramento) ==="
echo "1. Criando pacote..."
tar -czf voalive-flights-update.tar.gz \
  apps/web/src/app/flights/page.tsx

echo "2. Enviando para servidor..."
scp voalive-flights-update.tar.gz root@159.89.80.179:/opt/voalive/

echo "3. Extraindo e rebuilding..."
ssh root@159.89.80.179 'cd /opt/voalive && \
  tar -xzf voalive-flights-update.tar.gz && \
  echo "Arquivos extraídos" && \
  docker stop voalive-reservasegura-web-1 && \
  docker rm voalive-reservasegura-web-1 && \
  docker-compose -f docker-compose.prod.yml up -d --no-deps --build reservasegura-web && \
  echo "Build concluído"'

echo "✅ Deploy finalizado!"
