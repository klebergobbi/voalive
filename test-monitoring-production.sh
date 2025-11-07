#!/bin/bash

###############################################################################
# Script de Teste do Sistema de Monitoramento em Produção
# ReservaSegura Platform
###############################################################################

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 TESTANDO SISTEMA DE MONITORAMENTO EM PRODUÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SERVER="${1:-159.89.80.179:3012}"
API_URL="http://$SERVER/api"

echo "🎯 Servidor: $SERVER"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função auxiliar para testes
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📝 Teste: $description"
  echo "   Método: $method"
  echo "   Endpoint: $endpoint"
  echo ""

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" -X DELETE "$API_URL$endpoint")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✅ SUCESSO${NC} (HTTP $http_code)"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}❌ FALHOU${NC} (HTTP $http_code)"
    echo "$body"
  fi

  echo ""
}

# Teste 1: Health Check
test_endpoint "GET" "/health" "" "Health Check"

# Teste 2: Listar companhias suportadas
test_endpoint "GET" "/monitoring/airlines" "" "Listar Companhias Aéreas Suportadas"

# Teste 3: Estatísticas da fila
test_endpoint "GET" "/monitoring/queue/stats" "" "Estatísticas da Fila"

# Teste 4: Métricas do sistema
test_endpoint "GET" "/metrics" "" "Métricas do Sistema"

# Teste 5: Adicionar reserva ao monitoramento
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Teste: Adicionar Reserva ao Monitoramento"
echo ""

BOOKING_DATA='{
  "pnr": "TEST001",
  "airline": "LATAM",
  "lastName": "TESTE",
  "flightNumber": "LA3090",
  "departureDate": "2025-12-15T10:00:00Z",
  "route": "GRU-BSB",
  "checkInterval": 15
}'

test_endpoint "POST" "/monitoring/bookings" "$BOOKING_DATA" "Adicionar Reserva TEST001"

# Aguardar um pouco
echo "⏳ Aguardando 5 segundos para o sistema processar..."
sleep 5

# Teste 6: Consultar reserva adicionada
test_endpoint "GET" "/monitoring/bookings/TEST001" "" "Consultar Reserva TEST001"

# Teste 7: Forçar verificação imediata
test_endpoint "POST" "/monitoring/bookings/TEST001/check" "" "Forçar Verificação Imediata"

# Aguardar processamento
echo "⏳ Aguardando 10 segundos para verificação..."
sleep 10

# Teste 8: Consultar novamente para ver se foi verificada
test_endpoint "GET" "/monitoring/bookings/TEST001" "" "Verificar Status Após Check"

# Teste 9: Estatísticas da fila novamente
test_endpoint "GET" "/monitoring/queue/stats" "" "Estatísticas da Fila (após testes)"

# Teste 10: Remover reserva do monitoramento
test_endpoint "DELETE" "/monitoring/bookings/TEST001" "" "Remover Reserva do Monitoramento"

# Teste 11: Testar webhook (se configurado)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Teste: Webhook"
echo ""
webhook_test=$(curl -s -X POST "$API_URL/monitoring/webhook/test")
echo "$webhook_test" | jq '.' 2>/dev/null || echo "$webhook_test"
echo ""

# Resumo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO DOS TESTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   Servidor testado: $SERVER"
echo "   Data/Hora: $(date)"
echo ""
echo "✅ Testes concluídos!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Verificar logs: ssh root@159.89.80.179 'docker-compose logs -f api | grep monitoring'"
echo "   2. Adicionar reserva real para monitoramento"
echo "   3. Configurar webhook para receber notificações"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
