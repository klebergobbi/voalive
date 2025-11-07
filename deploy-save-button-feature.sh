#!/bin/bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deploy: Botão Salvar no Modal de Busca de Voos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📦 1. Criando pacote..."
tar -czf voalive-save-button.tar.gz \
  apps/web/src/components/dashboard/flight-search-modal.tsx

echo ""
echo "📤 2. Enviando para servidor..."
scp voalive-save-button.tar.gz root@159.89.80.179:/opt/voalive/

echo ""
echo "🔧 3. Extraindo e rebuilding frontend..."
ssh root@159.89.80.179 'cd /opt/voalive && \
  tar -xzf voalive-save-button.tar.gz && \
  echo "✅ Arquivos extraídos" && \
  docker-compose -f docker-compose.prod.yml stop reservasegura-web && \
  docker-compose -f docker-compose.prod.yml rm -f reservasegura-web && \
  docker-compose -f docker-compose.prod.yml up -d --no-deps --build reservasegura-web && \
  echo "✅ Frontend rebuild concluído"'

echo ""
echo "⏳ 4. Aguardando container iniciar..."
sleep 10

echo ""
echo "🔍 5. Verificando status..."
ssh root@159.89.80.179 'docker ps | grep reservasegura-web && echo "" && docker logs --tail 20 voalive-reservasegura-web-1'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deploy Finalizado!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Mudanças implementadas:"
echo "   ✓ Modal agora mantém resultados da busca visíveis"
echo "   ✓ Botão 'Salvar' aparece após busca bem-sucedida"
echo "   ✓ Salvar registra reserva para monitoramento 24/7"
echo "   ✓ Redirecionamento para /bookings após salvar"
echo ""
echo "🌐 Acesse: https://www.reservasegura.pro/dashboard"
echo ""
