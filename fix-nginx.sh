#!/bin/bash

cd /opt/voalive

echo "Obtendo IPs dos containers..."
API_IP=$(docker inspect voalive-reservasegura-api-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)
WEB_IP=$(docker inspect voalive-reservasegura-web-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)

echo "API IP: $API_IP"
echo "WEB IP: $WEB_IP"
echo ""

if [ -z "$API_IP" ] || [ -z "$WEB_IP" ]; then
    echo "ERRO: Não foi possível obter IPs dos containers"
    docker-compose ps
    exit 1
fi

echo "Atualizando configuração do Nginx..."
sed -i "s|proxy_pass http://172\.18\.0\.[0-9]*:4000|proxy_pass http://$API_IP:4000|g" /etc/nginx/sites-available/reservasegura
sed -i "s|proxy_pass http://172\.18\.0\.[0-9]*:3003|proxy_pass http://$WEB_IP:3003|g" /etc/nginx/sites-available/reservasegura

echo "Testando configuração..."
nginx -t

if [ $? -eq 0 ]; then
    echo "Recarregando Nginx..."
    nginx -s reload
    echo "✅ Nginx recarregado com sucesso!"
else
    echo "❌ Erro na configuração do Nginx"
    exit 1
fi
