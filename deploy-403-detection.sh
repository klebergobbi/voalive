#!/bin/bash

echo "🚀 Deploy - DETECÇÃO DE BLOQUEIO 403"
echo "=========================================================="
echo ""
echo "🔧 Correções aplicadas:"
echo "   ✅ Detectar página bloqueada (403) antes de preencher"
echo "   ✅ Capturar erro específico quando campo não é encontrado"
echo "   ✅ Screenshot de debug em caso de erro"
echo "   ✅ Mensagem de erro mais clara sobre bloqueio"
echo ""

# Criar pacote
echo "📦 Criando pacote..."
tar -czf voalive-403-detection.tar.gz \
  apps/api/src/modules/reservas/services/scrapers/golScraper.ts

# Copiar para servidor
echo "📤 Enviando para o servidor..."
scp voalive-403-detection.tar.gz root@159.89.80.179:/tmp/

# Executar no servidor
echo "🔧 Atualizando no servidor..."
ssh root@159.89.80.179 << 'ENDSSH'
cd /opt/voalive

# Extrair
echo "📂 Extraindo arquivos..."
tar -xzf /tmp/voalive-403-detection.tar.gz
rm /tmp/voalive-403-detection.tar.gz

# Copiar para container
echo "📋 Copiando golScraper.ts com detecção de 403..."
docker cp apps/api/src/modules/reservas/services/scrapers/golScraper.ts \
  voalive-reservasegura-api-1:/app/apps/api/src/modules/reservas/services/scrapers/golScraper.ts

# Verificar
echo "✅ Verificando arquivo..."
docker exec voalive-reservasegura-api-1 ls -lah /app/apps/api/src/modules/reservas/services/scrapers/golScraper.ts

# Verificar código
echo "🔍 Verificando detecção de 403 no código..."
docker exec voalive-reservasegura-api-1 \
  grep -c "Página bloqueada" /app/apps/api/src/modules/reservas/services/scrapers/golScraper.ts

# Limpar cache
echo "🧹 Limpando cache do TSX..."
docker exec voalive-reservasegura-api-1 rm -rf /tmp/tsx-*

# Reiniciar
echo "🔄 Reiniciando API..."
docker restart voalive-reservasegura-api-1

echo "⏳ Aguardando 15 segundos..."
sleep 15

# Ver logs
echo "📊 Logs de startup..."
docker logs voalive-reservasegura-api-1 2>&1 | tail -20

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🎯 Agora o scraper vai:"
echo "   ✅ Detectar bloqueio 403 ANTES de tentar preencher campos"
echo "   ✅ Dar timeout mais rápido (15s ao invés de 30s)"
echo "   ✅ Tirar screenshot do erro para debug"
echo "   ✅ Retornar mensagem clara sobre o tipo de erro"
echo ""
echo "📝 Monitorar logs:"
echo "   docker logs -f voalive-reservasegura-api-1 2>&1 | grep -E '(GOL Scraper|bloqueada|403)'"
ENDSSH

echo ""
echo "✅ Deploy finalizado com sucesso!"
