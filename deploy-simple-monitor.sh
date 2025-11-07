#!/bin/bash

echo "🚀 Iniciando deploy do Simple Booking Monitor..."

# Criar pacote com os arquivos necessários
echo "📦 Criando pacote..."
tar -czf voalive-simple-monitor-fix.tar.gz \
  apps/api/src/index.ts \
  apps/api/src/services/simple-booking-monitor.service.ts

# Copiar para o servidor
echo "📤 Enviando para o servidor..."
scp voalive-simple-monitor-fix.tar.gz root@159.89.80.179:/tmp/

# Executar comandos no servidor
echo "🔧 Atualizando no servidor..."
ssh root@159.89.80.179 << 'ENDSSH'
cd /opt/voalive

# Extrair arquivos
echo "📂 Extraindo arquivos..."
tar -xzf /tmp/voalive-simple-monitor-fix.tar.gz
rm /tmp/voalive-simple-monitor-fix.tar.gz

# Reiniciar container
echo "🔄 Reiniciando API..."
docker-compose restart voalive-reservasegura-api-1

echo "⏳ Aguardando 10 segundos para a API iniciar..."
sleep 10

# Verificar logs
echo "📊 Verificando logs de startup..."
docker logs voalive-reservasegura-api-1 2>&1 | grep -E '(Simple|Booking|Monitor|VoaLive API is running)' | tail -20

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "Para verificar se o monitor está rodando:"
echo "  docker logs voalive-reservasegura-api-1 2>&1 | grep 'Simple Booking Monitor'"
ENDSSH

echo ""
echo "✅ Deploy finalizado!"
