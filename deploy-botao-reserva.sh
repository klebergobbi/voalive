#!/bin/bash
set -e

echo "=== DEPLOY BOTÃO BUSCAR RESERVA ==="
echo ""

# Enviar apenas o arquivo modificado
echo "[1/3] Enviando arquivo atualizado..."
scp apps/web/src/app/dashboard/page.tsx root@159.89.80.179:/opt/voalive/apps/web/src/app/dashboard/page.tsx

echo "[2/3] Fazendo rebuild rápido..."
ssh root@159.89.80.179 'cd /opt/voalive && \
  rm -rf apps/web/.next && \
  docker-compose -f docker-compose.prod.yml build reservasegura-web && \
  docker-compose -f docker-compose.prod.yml up -d reservasegura-web && \
  sleep 15 && \
  WEB_IP=$(docker inspect voalive-reservasegura-web-1 --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}") && \
  sed -i "s|proxy_pass http://172.18.0.[0-9]*:3003|proxy_pass http://$WEB_IP:3003|g" /etc/nginx/sites-available/reservasegura && \
  nginx -s reload'

echo "[3/3] Verificando..."
sleep 5
curl -I https://www.reservasegura.pro/dashboard 2>/dev/null | head -5

echo ""
echo "✅ DEPLOY CONCLUÍDO"
echo "🌐 Acesse: https://www.reservasegura.pro/dashboard"
