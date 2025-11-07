#!/bin/bash

echo "🚀 Deploy - FIX TIMEOUT com waitForSelector"
echo "=========================================================="
echo ""
echo "🔧 Correções aplicadas:"
echo "   ✅ Adicionar waitForSelector antes de preencher campos"
echo "   ✅ Aumentar timeout de 10s para 30s"
echo "   ✅ Aguardar campos estarem visíveis antes de interagir"
echo ""

# Criar pacote com o arquivo atualizado
echo "📦 Criando pacote..."
tar -czf voalive-waitfor-fix.tar.gz \
  apps/api/src/modules/reservas/services/scrapers/golScraper.ts

# Copiar para o servidor
echo "📤 Enviando para o servidor..."
scp voalive-waitfor-fix.tar.gz root@159.89.80.179:/tmp/

# Executar comandos no servidor
echo "🔧 Atualizando no servidor..."
ssh root@159.89.80.179 << 'ENDSSH'
cd /opt/voalive

# Extrair arquivos
echo "📂 Extraindo arquivos..."
tar -xzf /tmp/voalive-waitfor-fix.tar.gz
rm /tmp/voalive-waitfor-fix.tar.gz

# Copiar golScraper.ts para o container
echo "📋 Copiando golScraper.ts atualizado..."
docker cp apps/api/src/modules/reservas/services/scrapers/golScraper.ts \
  voalive-reservasegura-api-1:/app/apps/api/src/modules/reservas/services/scrapers/golScraper.ts

# Verificar arquivo no container
echo "✅ Verificando arquivo atualizado..."
docker exec voalive-reservasegura-api-1 \
  ls -lah /app/apps/api/src/modules/reservas/services/scrapers/golScraper.ts

# Verificar se contém as correções
echo "🔍 Verificando presença de 'waitForSelector' no código..."
docker exec voalive-reservasegura-api-1 \
  grep -c "waitForSelector" /app/apps/api/src/modules/reservas/services/scrapers/golScraper.ts

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
docker logs voalive-reservasegura-api-1 2>&1 | tail -25

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🎯 Melhorias aplicadas:"
echo "   ✅ waitForSelector com timeout 30s (antes de preencher)"
echo "   ✅ waitForSelector no botão buscar"
echo "   ✅ Logs mais detalhados (Aguardando campo...)"
echo ""
echo "📝 Próximo ciclo de monitoramento em ~15 minutos"
echo ""
echo "🧪 Para testar manualmente agora:"
echo "   ssh root@159.89.80.179"
echo "   docker exec voalive-reservasegura-api-1 npx tsx /tmp/test-scraper.ts"
ENDSSH

echo ""
echo "✅ Deploy finalizado!"
echo ""
echo "📊 Logs em tempo real:"
echo "   ssh root@159.89.80.179 'docker logs -f voalive-reservasegura-api-1 2>&1 | grep -E \"(GOL Scraper|Aguardando|waitFor)\"'"
