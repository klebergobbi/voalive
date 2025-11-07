#!/bin/bash

echo "🚀 Iniciando deploy do GOL Scraper melhorado..."

# Criar pacote
echo "📦 Criando pacote..."
tar -czf voalive-gol-scraper-improved.tar.gz \
  apps/api/src/modules/reservas/services/scrapers/golScraper.ts

# Copiar para o servidor
echo "📤 Enviando para o servidor..."
scp voalive-gol-scraper-improved.tar.gz root@159.89.80.179:/tmp/

# Executar comandos no servidor
echo "🔧 Atualizando no servidor..."
ssh root@159.89.80.179 << 'ENDSSH'
cd /opt/voalive

# Extrair arquivos
echo "📂 Extraindo arquivos..."
tar -xzf /tmp/voalive-gol-scraper-improved.tar.gz
rm /tmp/voalive-gol-scraper-improved.tar.gz

# Copiar para o container
echo "📋 Copiando para o container..."
docker cp apps/api/src/modules/reservas/services/scrapers/golScraper.ts \
  voalive-reservasegura-api-1:/app/apps/api/src/modules/reservas/services/scrapers/golScraper.ts

# Verificar arquivo no container
echo "✅ Verificando arquivo atualizado..."
docker exec voalive-reservasegura-api-1 \
  ls -la /app/apps/api/src/modules/reservas/services/scrapers/golScraper.ts

# Limpar cache do TSX
echo "🧹 Limpando cache do TSX..."
docker exec voalive-reservasegura-api-1 rm -rf /tmp/tsx-*

# Reiniciar API
echo "🔄 Reiniciando API..."
docker restart voalive-reservasegura-api-1

echo "⏳ Aguardando 12 segundos para a API iniciar..."
sleep 12

# Verificar logs
echo "📊 Verificando logs de startup..."
docker logs voalive-reservasegura-api-1 2>&1 | grep -E '(VoaLive API is running|Simple Booking|GOL Scraper)' | tail -10

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🎯 Melhorias implementadas:"
echo "   ✅ Anti-detecção (User-Agent, headers, navegador)"
echo "   ✅ Delays aleatórios (1-5 segundos)"
echo "   ✅ Movimentos de mouse simulados"
echo "   ✅ Detecção avançada de cancelamento"
echo "   ✅ Múltiplos seletores para maior robustez"
echo ""
echo "📝 Para testar com uma reserva cancelada:"
echo "   Aguarde o próximo ciclo de monitoramento (15 minutos)"
echo "   Ou force um ciclo manualmente no dashboard"
ENDSSH

echo ""
echo "✅ Deploy finalizado!"
echo ""
echo "🔍 Para monitorar em tempo real:"
echo "   ssh root@159.89.80.179 'docker logs -f voalive-reservasegura-api-1 2>&1 | grep GOL'"
