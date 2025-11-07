#!/bin/bash

# =============================================================================
# Flight API - Test Script
# Script de testes completos para todos os endpoints da Flight API
# =============================================================================

BASE_URL="http://localhost:3012"
BOOKING_REF="PDCDX"
LAST_NAME="DINIZ"
MONITORING_ID="${BOOKING_REF}:${LAST_NAME}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}======================================================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}======================================================================${NC}"
  echo ""
}

print_test() {
  echo -e "${YELLOW}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_response() {
  echo "$1" | jq '.' 2>/dev/null || echo "$1"
}

wait_seconds() {
  echo -e "${YELLOW}⏳ Aguardando $1 segundos...${NC}"
  sleep "$1"
}

# =============================================================================
# TEST 1: GET /api/flights/status
# =============================================================================

test_get_status() {
  print_header "TEST 1: GET /api/flights/status"

  # Test 1.1: Busca básica
  print_test "1.1 - Buscar status do voo (PDCDX - DINIZ)"
  RESPONSE=$(curl -s -X GET \
    "${BASE_URL}/api/flights/status?bookingReference=${BOOKING_REF}&lastName=${LAST_NAME}")

  if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Status obtido com sucesso"
    FLIGHT_NUMBER=$(echo "$RESPONSE" | jq -r '.data.flightNumber')
    STATUS=$(echo "$RESPONSE" | jq -r '.data.status')
    GATE=$(echo "$RESPONSE" | jq -r '.data.gate')
    echo "  Flight: $FLIGHT_NUMBER"
    echo "  Status: $STATUS"
    echo "  Gate: $GATE"
  else
    print_error "Falha ao obter status"
    print_response "$RESPONSE"
  fi

  wait_seconds 2

  # Test 1.2: Busca sem cache
  print_test "1.2 - Buscar sem usar cache"
  RESPONSE=$(curl -s -X GET \
    "${BASE_URL}/api/flights/status?bookingReference=${BOOKING_REF}&lastName=${LAST_NAME}&useCache=false")

  if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Status obtido sem cache"
    SOURCE=$(echo "$RESPONSE" | jq -r '.data.source')
    echo "  Source: $SOURCE"
  else
    print_error "Falha ao obter status sem cache"
  fi

  wait_seconds 2

  # Test 1.3: Voo não encontrado
  print_test "1.3 - Testar voo inexistente"
  RESPONSE=$(curl -s -X GET \
    "${BASE_URL}/api/flights/status?bookingReference=NOTFOUND&lastName=INVALID")

  if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    print_success "Erro 404 retornado corretamente"
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    echo "  Error: $ERROR"
  else
    print_error "Deveria retornar erro 404"
  fi

  wait_seconds 2
}

# =============================================================================
# TEST 2: POST /api/flights/monitor
# =============================================================================

test_start_monitoring() {
  print_header "TEST 2: POST /api/flights/monitor"

  # Test 2.1: Iniciar monitoramento
  print_test "2.1 - Iniciar monitoramento (intervalo: 15 min)"
  RESPONSE=$(curl -s -X POST \
    "${BASE_URL}/api/flights/monitor" \
    -H "Content-Type: application/json" \
    -d "{
      \"bookingReference\": \"${BOOKING_REF}\",
      \"lastName\": \"${LAST_NAME}\",
      \"pollingIntervalMinutes\": 15,
      \"notifyOnChange\": true,
      \"notifyOnDelay\": true,
      \"notifyOnGateChange\": true,
      \"notifyChannels\": [\"email\", \"push\"]
    }")

  if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Monitoramento iniciado com sucesso"
    MONITORING_ID=$(echo "$RESPONSE" | jq -r '.data.monitoringId')
    STATUS=$(echo "$RESPONSE" | jq -r '.data.status')
    NEXT_CHECK=$(echo "$RESPONSE" | jq -r '.data.nextCheck')
    echo "  Monitoring ID: $MONITORING_ID"
    echo "  Status: $STATUS"
    echo "  Next Check: $NEXT_CHECK"
  else
    print_error "Falha ao iniciar monitoramento"
    print_response "$RESPONSE"
  fi

  wait_seconds 2

  # Test 2.2: Tentar iniciar novamente (deve dar conflito)
  print_test "2.2 - Tentar iniciar monitoramento duplicado"
  RESPONSE=$(curl -s -X POST \
    "${BASE_URL}/api/flights/monitor" \
    -H "Content-Type: application/json" \
    -d "{
      \"bookingReference\": \"${BOOKING_REF}\",
      \"lastName\": \"${LAST_NAME}\",
      \"pollingIntervalMinutes\": 15
    }")

  if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    print_success "Conflito detectado corretamente (409)"
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    echo "  Error: $ERROR"
  else
    print_error "Deveria retornar erro 409"
  fi

  wait_seconds 2
}

# =============================================================================
# TEST 3: GET /api/flights/monitor/:monitoringId
# =============================================================================

test_get_monitoring() {
  print_header "TEST 3: GET /api/flights/monitor/:monitoringId"

  # Test 3.1: Obter detalhes do monitoramento
  print_test "3.1 - Obter detalhes do monitoramento"
  RESPONSE=$(curl -s -X GET \
    "${BASE_URL}/api/flights/monitor/${MONITORING_ID}")

  if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Detalhes obtidos com sucesso"
    STATUS=$(echo "$RESPONSE" | jq -r '.data.status')
    CHECKS=$(echo "$RESPONSE" | jq -r '.data.checksPerformed')
    CHANGES=$(echo "$RESPONSE" | jq -r '.data.changesDetected')
    echo "  Status: $STATUS"
    echo "  Checks Performed: $CHECKS"
    echo "  Changes Detected: $CHANGES"
  else
    print_error "Falha ao obter detalhes"
    print_response "$RESPONSE"
  fi

  wait_seconds 2

  # Test 3.2: Obter com histórico limitado
  print_test "3.2 - Obter com histórico (limit: 5)"
  RESPONSE=$(curl -s -X GET \
    "${BASE_URL}/api/flights/monitor/${MONITORING_ID}?includeHistory=true&historyLimit=5")

  if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Histórico obtido com sucesso"
    HISTORY_COUNT=$(echo "$RESPONSE" | jq -r '.data.history | length')
    echo "  History Entries: $HISTORY_COUNT"

    if [ "$HISTORY_COUNT" -gt 0 ]; then
      echo "  Latest entry:"
      echo "$RESPONSE" | jq '.data.history[0]' | head -10
    fi
  else
    print_error "Falha ao obter histórico"
  fi

  wait_seconds 2

  # Test 3.3: Obter sem histórico
  print_test "3.3 - Obter sem histórico"
  RESPONSE=$(curl -s -X GET \
    "${BASE_URL}/api/flights/monitor/${MONITORING_ID}?includeHistory=false")

  if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Detalhes obtidos sem histórico"
    HAS_HISTORY=$(echo "$RESPONSE" | jq -e '.data.history' > /dev/null 2>&1 && echo "yes" || echo "no")
    echo "  Has History: $HAS_HISTORY"
  else
    print_error "Falha ao obter detalhes"
  fi

  wait_seconds 2
}

# =============================================================================
# TEST 4: GET /api/flights/monitor (List All)
# =============================================================================

test_list_monitoring() {
  print_header "TEST 4: GET /api/flights/monitor (List All)"

  # Test 4.1: Listar todos monitoramentos
  print_test "4.1 - Listar todos os monitoramentos"
  RESPONSE=$(curl -s -X GET \
    "${BASE_URL}/api/flights/monitor")

  if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Lista obtida com sucesso"
    TOTAL=$(echo "$RESPONSE" | jq -r '.data.stats.total')
    ACTIVE=$(echo "$RESPONSE" | jq -r '.data.stats.active')
    echo "  Total: $TOTAL"
    echo "  Active: $ACTIVE"

    if [ "$TOTAL" -gt 0 ]; then
      echo ""
      echo "  Monitors:"
      echo "$RESPONSE" | jq -r '.data.monitors[] | "    - \(.monitoringId) (\(.status))"'
    fi
  else
    print_error "Falha ao listar monitoramentos"
    print_response "$RESPONSE"
  fi

  wait_seconds 2
}

# =============================================================================
# TEST 5: Rate Limiting
# =============================================================================

test_rate_limiting() {
  print_header "TEST 5: Rate Limiting"

  print_test "5.1 - Testar rate limiting (11 requisições rápidas)"

  SUCCESS_COUNT=0
  RATE_LIMITED_COUNT=0

  for i in {1..11}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
      "${BASE_URL}/api/flights/status?bookingReference=${BOOKING_REF}&lastName=${LAST_NAME}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
      ((SUCCESS_COUNT++))
      echo "  Request $i: ✅ Success (200)"
    elif [ "$HTTP_CODE" = "429" ]; then
      ((RATE_LIMITED_COUNT++))
      echo "  Request $i: 🚫 Rate Limited (429)"
    else
      echo "  Request $i: ⚠️  Unexpected ($HTTP_CODE)"
    fi
  done

  echo ""
  print_success "Successful: $SUCCESS_COUNT"
  print_success "Rate Limited: $RATE_LIMITED_COUNT"

  if [ "$RATE_LIMITED_COUNT" -gt 0 ]; then
    print_success "Rate limiting funcionando corretamente!"
  else
    print_error "Rate limiting NÃO foi acionado"
  fi

  wait_seconds 5
}

# =============================================================================
# TEST 6: DELETE /api/flights/monitor/:monitoringId
# =============================================================================

test_stop_monitoring() {
  print_header "TEST 6: DELETE /api/flights/monitor/:monitoringId"

  # Test 6.1: Parar monitoramento
  print_test "6.1 - Parar monitoramento"
  RESPONSE=$(curl -s -X DELETE \
    "${BASE_URL}/api/flights/monitor/${MONITORING_ID}")

  if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Monitoramento parado com sucesso"
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
    echo "  Message: $MESSAGE"
  else
    print_error "Falha ao parar monitoramento"
    print_response "$RESPONSE"
  fi

  wait_seconds 2

  # Test 6.2: Tentar parar novamente (deve dar erro 404)
  print_test "6.2 - Tentar parar monitoramento já parado"
  RESPONSE=$(curl -s -X DELETE \
    "${BASE_URL}/api/flights/monitor/${MONITORING_ID}")

  if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    print_success "Erro 404 retornado corretamente"
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    echo "  Error: $ERROR"
  else
    print_error "Deveria retornar erro 404"
  fi

  wait_seconds 2
}

# =============================================================================
# TEST 7: Health Check
# =============================================================================

test_health_check() {
  print_header "TEST 7: Health Check"

  print_test "7.1 - Verificar health do serviço"
  RESPONSE=$(curl -s -X GET \
    "${BASE_URL}/api/v2/flight-monitoring/health")

  if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Serviço está saudável"
    STATUS=$(echo "$RESPONSE" | jq -r '.status')
    ACTIVE=$(echo "$RESPONSE" | jq -r '.stats.activeMonitors')
    CHECKS=$(echo "$RESPONSE" | jq -r '.stats.totalChecks')
    CHANGES=$(echo "$RESPONSE" | jq -r '.stats.totalChanges')

    echo "  Status: $STATUS"
    echo "  Active Monitors: $ACTIVE"
    echo "  Total Checks: $CHECKS"
    echo "  Total Changes: $CHANGES"
  else
    print_error "Serviço não está saudável"
    print_response "$RESPONSE"
  fi
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
  echo ""
  echo "████████████████████████████████████████████████████████████████████████"
  echo "█                                                                      █"
  echo "█  🧪 FLIGHT API - TESTE COMPLETO                                     █"
  echo "█                                                                      █"
  echo "████████████████████████████████████████████████████████████████████████"
  echo ""
  echo "Base URL: $BASE_URL"
  echo "Booking Reference: $BOOKING_REF"
  echo "Last Name: $LAST_NAME"
  echo "Monitoring ID: $MONITORING_ID"
  echo ""

  # Verificar se jq está instalado
  if ! command -v jq &> /dev/null; then
    print_error "jq não está instalado. Instale com: apt-get install jq"
    exit 1
  fi

  # Executar testes
  test_get_status
  test_start_monitoring
  test_get_monitoring
  test_list_monitoring
  test_rate_limiting
  test_stop_monitoring
  test_health_check

  # Resumo final
  print_header "RESUMO FINAL"
  echo -e "${GREEN}✅ Todos os testes foram executados!${NC}"
  echo ""
  echo "Endpoints testados:"
  echo "  1. ✅ GET /api/flights/status"
  echo "  2. ✅ POST /api/flights/monitor"
  echo "  3. ✅ GET /api/flights/monitor/:monitoringId"
  echo "  4. ✅ GET /api/flights/monitor"
  echo "  5. ✅ DELETE /api/flights/monitor/:monitoringId"
  echo "  6. ✅ Rate Limiting"
  echo "  7. ✅ Health Check"
  echo ""
  echo "████████████████████████████████████████████████████████████████████████"
  echo ""
}

# Execute
main
