#!/bin/bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deploy Integração Amadeus GDS API (Solução Híbrida)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📦 1. Criando pacote com todos os arquivos..."
tar -czf voalive-amadeus-integration.tar.gz \
  apps/api/src/services/amadeus-api.service.ts \
  apps/api/src/controllers/flight-search.controller.ts \
  apps/api/package.json

if [ $? -eq 0 ]; then
  echo "   ✅ Pacote criado com sucesso"
else
  echo "   ❌ Erro ao criar pacote"
  exit 1
fi

echo ""
echo "📤 2. Enviando para servidor..."
scp voalive-amadeus-integration.tar.gz root@159.89.80.179:/opt/voalive/

if [ $? -eq 0 ]; then
  echo "   ✅ Pacote enviado com sucesso"
else
  echo "   ❌ Erro ao enviar pacote"
  exit 1
fi

echo ""
echo "🔧 3. Extraindo e instalando dependências..."
ssh root@159.89.80.179 'cd /opt/voalive && \
  echo "📂 Extraindo arquivos..." && \
  tar -xzf voalive-amadeus-integration.tar.gz && \
  echo "✅ Arquivos extraídos" && \
  echo "" && \
  echo "📋 Listando arquivos extraídos:" && \
  ls -lh apps/api/src/services/amadeus-api.service.ts && \
  ls -lh apps/api/src/controllers/flight-search.controller.ts && \
  ls -lh apps/api/package.json'

if [ $? -eq 0 ]; then
  echo "   ✅ Extração concluída"
else
  echo "   ❌ Erro ao extrair"
  exit 1
fi

echo ""
echo "🐳 4. Parando container API..."
ssh root@159.89.80.179 'cd /opt/voalive && \
  docker-compose -f docker-compose.prod.yml stop reservasegura-api && \
  docker-compose -f docker-compose.prod.yml rm -f reservasegura-api'

echo ""
echo "🔨 5. Rebuilding container API (com axios + Amadeus)..."
echo "   ⏳ Isso pode levar 2-3 minutos..."
ssh root@159.89.80.179 'cd /opt/voalive && \
  timeout 300 docker-compose -f docker-compose.prod.yml up -d --no-deps --build reservasegura-api 2>&1 | tail -30'

echo ""
echo "⏳ 6. Aguardando container inicializar..."
sleep 5

echo ""
echo "🔍 7. Verificando status do container..."
ssh root@159.89.80.179 "docker ps -a | grep reservasegura-api"

echo ""
echo "📜 8. Verificando logs da API..."
ssh root@159.89.80.179 "docker logs --tail 30 voalive-reservasegura-api-1 2>&1"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deploy da Integração Amadeus Concluído!"
echo ""
echo "📋 Arquitetura Híbrida Implementada:"
echo "   🔹 Camada 1: Amadeus GDS API (oficial)"
echo "   🔹 Camada 2: APIs Externas (AirLabs, etc)"
echo "   🔹 Camada 3: Web Scraping (fallback)"
echo ""
echo "🔑 Credenciais Amadeus configuradas:"
echo "   API Key: 2qL4u1ZMtGPqoUzvqPymPUcyZGEZ5yCS"
echo "   Environment: Test (https://test.api.amadeus.com)"
echo ""
echo "🧪 Teste com voo real:"
echo '   curl -X POST https://www.reservasegura.pro/api/v1/flight-search/search \'
echo '     -H "Content-Type: application/json" \'
echo '     -d '"'"'{"flightNumber": "LA4526"}'"'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
