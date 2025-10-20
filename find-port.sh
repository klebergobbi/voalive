#!/bin/bash

echo "🔍 Procurando porta disponível..."

# Lista de portas para testar
PORTS=(8080 8000 3005 3010 3020 5000 5001 7000 9000)

for port in "${PORTS[@]}"; do
    if ! netstat -an 2>/dev/null | grep ":$port " > /dev/null; then
        echo "✅ Porta $port está disponível!"

        # Atualiza o arquivo .env.local
        sed -i "s/PORT=.*/PORT=$port/" apps/web/.env.local
        sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://localhost:$port|" apps/web/.env.local

        echo "📝 Arquivo .env.local atualizado com a porta $port"
        echo "🚀 Execute: npm run dev"
        echo "🌐 Acesse: http://localhost:$port/dashboard"
        exit 0
    else
        echo "❌ Porta $port em uso"
    fi
done

echo "⚠️  Todas as portas testadas estão em uso. Tente manualmente com:"
echo "cd apps/web && npm run dev -- -p PORTA_ESCOLHIDA"