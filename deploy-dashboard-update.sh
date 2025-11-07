#!/bin/bash
echo "=== Deploy Dashboard Atualizado ==="
echo "1. Criando pacote..."
tar -czf voalive-dashboard-update.tar.gz \
  apps/web/src/app/dashboard/page.tsx \
  apps/web/src/components/dashboard/booking-register-modal.tsx

echo "2. Enviando para servidor..."
scp voalive-dashboard-update.tar.gz root@159.89.80.179:/opt/voalive/

echo "3. Extraindo e rebuilding..."
ssh root@159.89.80.179 'cd /opt/voalive && \
  tar -xzf voalive-dashboard-update.tar.gz && \
  echo "Arquivos extraídos" && \
  docker stop voalive-reservasegura-web-1 && \
  docker rm voalive-reservasegura-web-1 && \
  docker-compose -f docker-compose.prod.yml up -d --no-deps --build reservasegura-web && \
  echo "Build concluído"'

echo "✅ Deploy finalizado!"
