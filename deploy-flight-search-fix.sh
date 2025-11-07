#!/bin/bash

# Deploy da correção de busca de voos - Amadeus Schedule API
# Corrige o problema onde voos não eram encontrados devido a origem/destino hardcoded

echo "======================================"
echo "🚀 Deploy: Flight Search Fix"
echo "======================================"
echo ""

# 1. Criar tarball com os arquivos corrigidos
echo "📦 Criando pacote de atualização..."
cd /c/Projetos/VoaLive
tar -czf voalive-flight-search-fix.tar.gz \
  apps/api/src/services/amadeus-api.service.ts \
  apps/api/src/controllers/flight-search.controller.ts

echo "✅ Pacote criado: voalive-flight-search-fix.tar.gz"
echo ""

# 2. Copiar para o servidor
echo "📤 Enviando para o servidor..."
scp voalive-flight-search-fix.tar.gz root@159.89.80.179:/tmp/

echo "✅ Arquivo enviado"
echo ""

# 3. Extrair e reiniciar serviços no servidor
echo "🔧 Executando no servidor..."
ssh root@159.89.80.179 << 'ENDSSH'
  cd /opt/voalive

  echo "📦 Extraindo arquivos..."
  tar -xzf /tmp/voalive-flight-search-fix.tar.gz

  echo "🔨 Reconstruindo API..."
  cd apps/api
  npm run build

  echo "♻️ Reiniciando containers..."
  cd /opt/voalive
  docker-compose restart voalive-api

  echo ""
  echo "✅ Deploy concluído!"
  echo ""
  echo "🧪 Testando a busca de voo G32072..."
  sleep 5

  # Testar busca do voo G32072
  curl -X POST http://localhost:3012/api/v1/flight-search/search \
    -H "Content-Type: application/json" \
    -d '{"flightNumber":"G32072"}' \
    | jq '.'
ENDSSH

echo ""
echo "======================================"
echo "✅ Deploy concluído com sucesso!"
echo "======================================"
echo ""
echo "📝 Mudanças aplicadas:"
echo "  • Amadeus Schedule API agora busca por número de voo sem hardcode de origem/destino"
echo "  • convertToStandardFormat() adaptado para lidar com Schedule API"
echo "  • Suporte para buscar qualquer voo GOL, LATAM, AZUL, etc."
echo ""
echo "🧪 Teste realizado: Busca do voo G32072 (BSB → GIG)"
echo ""
