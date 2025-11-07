#!/bin/bash

# Script de Atualização DNS - DigitalOcean
# Atualiza reservasegura.pro para apontar para 159.89.80.179

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 ATUALIZAÇÃO DNS - reservasegura.pro"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar se o token está definido
if [ -z "$DIGITALOCEAN_TOKEN" ]; then
    echo ""
    echo "❌ Token do DigitalOcean não encontrado!"
    echo ""
    echo "Por favor, defina a variável DIGITALOCEAN_TOKEN antes de executar:"
    echo "  export DIGITALOCEAN_TOKEN='seu_token_aqui'"
    echo ""
    echo "Ou execute:"
    echo "  DIGITALOCEAN_TOKEN='seu_token' bash atualizar-dns-digitalocean.sh"
    echo ""
    exit 1
fi

DOMAIN="reservasegura.pro"
NEW_IP="159.89.80.179"
OLD_IP="157.245.92.34"
API_URL="https://api.digitalocean.com/v2"

echo ""
echo "🔍 Passo 1: Listando registros DNS atuais..."
echo ""

# Listar todos os registros do domínio
RECORDS=$(curl -s -X GET \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
  "$API_URL/domains/$DOMAIN/records")

echo "$RECORDS" | python -m json.tool 2>/dev/null || echo "$RECORDS"

echo ""
echo "📋 Passo 2: Identificando registros A para atualizar..."
echo ""

# Extrair IDs dos registros A que apontam para o IP antigo
RECORD_IDS=$(echo "$RECORDS" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$RECORD_IDS" ]; then
    echo "❌ Nenhum registro encontrado para atualizar"
    exit 1
fi

echo "Registros encontrados para atualizar:"
echo "$RECORD_IDS"

echo ""
echo "🔄 Passo 3: Atualizando registros DNS..."
echo ""

# Atualizar cada registro encontrado
for RECORD_ID in $RECORD_IDS; do
    # Obter detalhes do registro
    RECORD_DETAIL=$(curl -s -X GET \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
      "$API_URL/domains/$DOMAIN/records/$RECORD_ID")

    RECORD_TYPE=$(echo "$RECORD_DETAIL" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
    RECORD_NAME=$(echo "$RECORD_DETAIL" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    RECORD_DATA=$(echo "$RECORD_DETAIL" | grep -o '"data":"[^"]*"' | cut -d'"' -f4)

    # Atualizar apenas registros A que apontam para o IP antigo
    if [ "$RECORD_TYPE" = "A" ] && [ "$RECORD_DATA" = "$OLD_IP" ]; then
        echo "  🔧 Atualizando registro A: $RECORD_NAME ($OLD_IP → $NEW_IP)"

        UPDATE_RESULT=$(curl -s -X PUT \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
          -d "{\"data\":\"$NEW_IP\"}" \
          "$API_URL/domains/$DOMAIN/records/$RECORD_ID")

        if echo "$UPDATE_RESULT" | grep -q '"domain_record"'; then
            echo "  ✅ Atualizado com sucesso!"
        else
            echo "  ❌ Erro ao atualizar"
            echo "$UPDATE_RESULT"
        fi
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ATUALIZAÇÃO DNS CONCLUÍDA!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏳ Propagação DNS:"
echo "   - Mínimo: 5-10 minutos"
echo "   - Recomendado: Aguardar 15 minutos"
echo "   - Máximo: Até 48 horas (raro)"
echo ""
echo "🧪 Para verificar:"
echo "   nslookup reservasegura.pro"
echo "   nslookup www.reservasegura.pro"
echo ""
echo "🧪 Para testar o endpoint:"
echo "   node test-cadastro-e-busca-reservas.js"
echo ""
