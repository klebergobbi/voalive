#!/bin/bash

echo "🔧 Atualizando IPs dos containers no nginx..."

# Obter IPs dos containers
WEB_IP=$(docker inspect voalive-reservasegura-web-1 --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
API_IP=$(docker inspect voalive-reservasegura-api-1 --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

echo "📊 IPs encontrados:"
echo "  Web: $WEB_IP"
echo "  API: $API_IP"

# Atualizar configuração do nginx
echo "📝 Atualizando /etc/nginx/sites-available/reservasegura..."

# Backup da configuração atual
cp /etc/nginx/sites-available/reservasegura /etc/nginx/sites-available/reservasegura.backup.$(date +%Y%m%d_%H%M%S)

# Atualizar IPs usando sed
sed -i "s|proxy_pass http://[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+:3003|proxy_pass http://$WEB_IP:3003|g" /etc/nginx/sites-available/reservasegura
sed -i "s|proxy_pass http://[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+:4000|proxy_pass http://$API_IP:4000|g" /etc/nginx/sites-available/reservasegura

# Testar configuração
echo "🧪 Testando configuração do nginx..."
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Configuração válida!"

    # Recarregar nginx
    echo "🔄 Recarregando nginx..."
    nginx -s reload

    echo ""
    echo "✅ Nginx atualizado com sucesso!"
    echo ""
    echo "🌐 Testando acesso:"
    curl -I https://www.reservasegura.pro/ 2>&1 | grep -E "HTTP|server"
else
    echo "❌ Erro na configuração do nginx!"
    echo "⚠️  Restaurando backup..."
    cp /etc/nginx/sites-available/reservasegura.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/reservasegura
    exit 1
fi
