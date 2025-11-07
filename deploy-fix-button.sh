#!/bin/bash
# Script para corrigir o botão "Buscar Vôo" em produção
# Execute no servidor: bash deploy-fix-button.sh

cd /opt/voalive

echo "=== 1. Parando container web ==="
docker-compose -f docker-compose.prod.yml stop reservasegura-web

echo ""
echo "=== 2. Atualizando arquivo page.tsx ==="
# O arquivo já existe no servidor, então vamos reconstruir a imagem
echo "Arquivo page.tsx já está atualizado no diretório"

echo ""
echo "=== 3. Reconstruindo image do web (sem cache) ==="
docker-compose -f docker-compose.prod.yml build --no-cache reservasegura-web

echo ""
echo "=== 4. Iniciando container web ==="
docker-compose -f docker-compose.prod.yml up -d reservasegura-web

echo ""
echo "=== 5. Aguardando container iniciar (15 segundos) ==="
sleep 15

echo ""
echo "=== 6. Verificando logs ==="
docker logs voalive-reservasegura-web-1 --tail 20

echo ""
echo "=== 7. Atualizando nginx com novo IP do container ==="
WEB_IP=$(docker inspect voalive-reservasegura-web-1 --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}")
echo "Novo IP do Web: $WEB_IP"

# Atualizar todos os possíveis IPs antigos no nginx
sed -i "s|proxy_pass http://172.18.0.[0-9]*:3003|proxy_pass http://$WEB_IP:3003|g" /etc/nginx/sites-available/reservasegura

echo ""
echo "=== 8. Recarregando nginx ==="
nginx -t && nginx -s reload

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "Acesse: https://www.reservasegura.pro/dashboard"
echo "O botão agora deve mostrar: 'Buscar Vôo'"
