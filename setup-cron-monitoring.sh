#!/bin/bash

# Script para configurar Cron Job de monitoramento 24/7
# Este script configura um cron job que chama o endpoint de monitoramento a cada 5 minutos

echo "=== Configurando Cron Job de Monitoramento 24/7 ==="

# Criar script de monitoramento
cat > /opt/voalive/monitoring-cron.sh << 'SCRIPTEOF'
#!/bin/bash
# Trigger de monitoramento via curl
curl -X POST http://localhost:3012/api/monitoring/check-all-flights \
  -H "Content-Type: application/json" \
  -s >> /opt/voalive/logs/monitoring-cron.log 2>&1

echo "$(date '+%Y-%m-%d %H:%M:%S') - Monitoramento executado" >> /opt/voalive/logs/monitoring-cron.log
SCRIPTEOF

# Dar permissão de execução
chmod +x /opt/voalive/monitoring-cron.sh

# Adicionar ao crontab (a cada 5 minutos)
(crontab -l 2>/dev/null | grep -v "monitoring-cron.sh"; echo "*/5 * * * * /opt/voalive/monitoring-cron.sh") | crontab -

echo "✅ Cron job configurado com sucesso!"
echo "📊 O monitoramento será executado a cada 5 minutos"
echo "📝 Logs em: /opt/voalive/logs/monitoring-cron.log"

# Verificar crontab
echo ""
echo "=== Crontab atual ==="
crontab -l

