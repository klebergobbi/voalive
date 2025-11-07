#!/bin/bash

echo "🚀 Deploy FINAL - STEALTH + RETRY INTELIGENTE + MONITOR FIX"
echo "=========================================================="
echo ""

# Criar pacote com os arquivos atualizados
echo "📦 Criando pacote..."
tar -czf voalive-stealth-final.tar.gz \
  apps/api/src/modules/reservas/services/scrapers/golScraper.ts \
  apps/api/src/modules/reservas/services/scraperService.ts \
  apps/api/src/services/simple-booking-monitor.service.ts

# Copiar para o servidor
echo "📤 Enviando para o servidor..."
scp voalive-stealth-final.tar.gz root@159.89.80.179:/tmp/

# Executar comandos no servidor
echo "🔧 Atualizando no servidor..."
ssh root@159.89.80.179 << 'ENDSSH'
cd /opt/voalive

# Extrair arquivos
echo "📂 Extraindo arquivos..."
tar -xzf /tmp/voalive-stealth-final.tar.gz
rm /tmp/voalive-stealth-final.tar.gz

# Copiar golScraper.ts para o container
echo "📋 Copiando golScraper.ts..."
docker cp apps/api/src/modules/reservas/services/scrapers/golScraper.ts \
  voalive-reservasegura-api-1:/app/apps/api/src/modules/reservas/services/scrapers/golScraper.ts

# Copiar scraperService.ts para o container
echo "📋 Copiando scraperService.ts..."
docker cp apps/api/src/modules/reservas/services/scraperService.ts \
  voalive-reservasegura-api-1:/app/apps/api/src/modules/reservas/services/scraperService.ts

# Copiar simple-booking-monitor.service.ts para o container
echo "📋 Copiando simple-booking-monitor.service.ts..."
docker cp apps/api/src/services/simple-booking-monitor.service.ts \
  voalive-reservasegura-api-1:/app/apps/api/src/services/simple-booking-monitor.service.ts

# Verificar arquivos no container
echo "✅ Verificando arquivos atualizados..."
docker exec voalive-reservasegura-api-1 \
  ls -la /app/apps/api/src/modules/reservas/services/scrapers/golScraper.ts
docker exec voalive-reservasegura-api-1 \
  ls -la /app/apps/api/src/modules/reservas/services/scraperService.ts
docker exec voalive-reservasegura-api-1 \
  ls -la /app/apps/api/src/services/simple-booking-monitor.service.ts

# Limpar cache do TSX
echo "🧹 Limpando cache do TSX..."
docker exec voalive-reservasegura-api-1 rm -rf /tmp/tsx-*

# Reiniciar API
echo "🔄 Reiniciando API..."
docker restart voalive-reservasegura-api-1

echo "⏳ Aguardando 15 segundos para a API iniciar..."
sleep 15

# Verificar logs
echo "📊 Verificando logs de startup..."
docker logs voalive-reservasegura-api-1 2>&1 | tail -20

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🎯 Sistema completo ativado:"
echo "   ✅ STEALTH MODE (17 proteções anti-detecção)"
echo "   ✅ RETRY INTELIGENTE (3 estratégias para GOL)"
echo "   ✅ Monitor com retries=3 (ativa o sistema inteligente)"
echo ""
echo "📝 Para forçar teste agora:"
echo "   docker exec voalive-reservasegura-api-1 npx tsx -e \""
echo "   import { getSimpleBookingMonitorService } from '/app/apps/api/src/services/simple-booking-monitor.service';"
echo "   (async () => {"
echo "     const service = getSimpleBookingMonitorService();"
echo "     await service.runMonitoringCycle();"
echo "   })();\""
ENDSSH

echo ""
echo "✅ Deploy finalizado!"
