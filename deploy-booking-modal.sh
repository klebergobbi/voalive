#!/bin/bash

echo "🚀 Deploy: Modal Buscar Reserva Atualizado"
echo "=========================================="

cd /opt/voalive || exit 1

echo "📦 Criando backup..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p backups/$TIMESTAMP

# Backup do modal atual
if [ -f apps/web/src/components/dashboard/booking-search-modal.tsx ]; then
    cp apps/web/src/components/dashboard/booking-search-modal.tsx \
       backups/$TIMESTAMP/booking-search-modal.tsx.backup
    echo "✅ Backup criado em backups/$TIMESTAMP"
fi

echo ""
echo "📂 Extraindo novos arquivos..."
tar -xzf /tmp/voalive-booking-complete.tar.gz

if [ $? -eq 0 ]; then
    echo "✅ Arquivos extraídos com sucesso"
else
    echo "❌ Erro ao extrair arquivos"
    exit 1
fi

echo ""
echo "🔄 Reiniciando container web..."
docker-compose -f docker-compose.prod.yml up -d reservasegura-web

sleep 15

echo ""
echo "🌐 Atualizando Nginx..."
WEB_IP=$(docker inspect voalive-reservasegura-web-1 --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}")
echo "Web Container IP: $WEB_IP"

sed -i "s|proxy_pass http://172.18.0.[0-9]*:3003|proxy_pass http://$WEB_IP:3003|g" /etc/nginx/sites-available/reservasegura

nginx -s reload

if [ $? -eq 0 ]; then
    echo "✅ Nginx recarregado"
else
    echo "❌ Erro ao recarregar Nginx"
fi

echo ""
echo "📊 Status dos containers:"
docker ps | grep reservasegura

echo ""
echo "✅ Deploy concluído com sucesso!"
echo "🔗 Teste em: https://www.reservasegura.pro/dashboard"
