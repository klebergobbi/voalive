#!/bin/bash

# Setup AirLabs API Key
# Este script facilita a configuração da API key do AirLabs no projeto

echo "================================================================"
echo "   ✈️ Setup AirLabs API Key - VoaLive/ReservaSegura"
echo "================================================================"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Verificar se o arquivo .env existe
ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado!${NC}"
    echo -e "${YELLOW}📋 Copiando .env.example para .env...${NC}"

    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Arquivo .env criado!${NC}"
    else
        echo -e "${RED}❌ Erro: .env.example não encontrado!${NC}"
        exit 1
    fi
fi

echo ""
echo "================================================================"
echo "   📚 Por que usar o AirLabs?"
echo "================================================================"
echo ""
echo "O AirLabs é a API PRIORITÁRIA do sistema porque oferece:"
echo -e "${GREEN}  📍 GPS em tempo real (lat, long, altitude, velocidade)${NC}"
echo -e "${GREEN}  🚪 Portões e terminais atualizados${NC}"
echo -e "${GREEN}  ✈️ Informações completas de aeronaves${NC}"
echo -e "${GREEN}  ⏰ Horários reais e estimados precisos${NC}"
echo -e "${GREEN}  🌍 Cobertura global de voos${NC}"
echo -e "${GREEN}  🆓 Free tier: 100+ requests/dia GRÁTIS!${NC}"
echo ""
echo -e "${YELLOW}Atualmente você está usando apenas Aviationstack (limitado)${NC}"
echo ""

# Verificar se já existe uma key
if grep -q "AIRLABS_API_KEY=" .env; then
    CURRENT_KEY=$(grep "AIRLABS_API_KEY=" .env | cut -d '=' -f2)
    if [ ! -z "$CURRENT_KEY" ] && [ "$CURRENT_KEY" != "your_airlabs_api_key_here" ]; then
        echo -e "${GREEN}✅ AirLabs API Key já configurada: $CURRENT_KEY${NC}"
        echo ""
        read -p "Deseja substituir? (S/N): " REPLACE
        if [ "$REPLACE" != "S" ] && [ "$REPLACE" != "s" ]; then
            echo -e "${GREEN}✅ Mantendo configuração atual.${NC}"
            exit 0
        fi
    fi
fi

echo "================================================================"
echo "   🔑 Obter API Key do AirLabs (GRÁTIS)"
echo "================================================================"
echo ""
echo "Siga os passos abaixo:"
echo ""
echo -e "${YELLOW}1. Abra o navegador em: https://airlabs.co/${NC}"
echo -e "${YELLOW}2. Clique em 'Get API Key' ou 'Sign Up'${NC}"
echo -e "${YELLOW}3. Crie sua conta gratuita${NC}"
echo -e "${YELLOW}4. Acesse o Dashboard e copie sua API Key${NC}"
echo ""

# Perguntar se quer abrir o site
read -p "Deseja abrir o site do AirLabs agora? (S/N): " OPEN_BROWSER
if [ "$OPEN_BROWSER" = "S" ] || [ "$OPEN_BROWSER" = "s" ]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open "https://airlabs.co/"
    elif command -v open &> /dev/null; then
        open "https://airlabs.co/"
    else
        echo -e "${YELLOW}⚠️  Não foi possível abrir o navegador automaticamente.${NC}"
        echo "Abra manualmente: https://airlabs.co/"
    fi
    echo -e "${GREEN}🌐 Abrindo navegador...${NC}"
    echo ""
fi

echo "================================================================"
echo ""

# Solicitar a API key
read -p "Cole sua API Key do AirLabs aqui: " API_KEY

if [ -z "$API_KEY" ]; then
    echo -e "${RED}❌ API Key vazia. Abortando.${NC}"
    exit 1
fi

# Validar formato básico
if [ ${#API_KEY} -lt 10 ]; then
    echo -e "${YELLOW}⚠️  Atenção: API Key parece muito curta. Tem certeza?${NC}"
    read -p "Continuar mesmo assim? (S/N): " CONFIRM
    if [ "$CONFIRM" != "S" ] && [ "$CONFIRM" != "s" ]; then
        echo -e "${RED}❌ Abortado.${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}💾 Salvando no arquivo .env...${NC}"

# Atualizar o .env
if grep -q "AIRLABS_API_KEY=" .env; then
    # Substituir linha existente (compatível com Mac e Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/AIRLABS_API_KEY=.*/AIRLABS_API_KEY=$API_KEY/" .env
    else
        sed -i "s/AIRLABS_API_KEY=.*/AIRLABS_API_KEY=$API_KEY/" .env
    fi
else
    # Adicionar nova linha
    echo "AIRLABS_API_KEY=$API_KEY" >> .env
fi

echo -e "${GREEN}✅ API Key salva com sucesso!${NC}"
echo ""

# Testar a API key
echo "================================================================"
echo "   🧪 Testando API Key..."
echo "================================================================"
echo ""

TEST_URL="https://airlabs.co/api/v9/flights?api_key=$API_KEY&limit=1"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$TEST_URL")

if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ API Key VÁLIDA e funcionando!${NC}"
    echo -e "${GREEN}🎉 Configuração concluída com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao testar API Key (HTTP $RESPONSE)${NC}"
    echo -e "${YELLOW}⚠️  Verifique se a key está correta em: https://airlabs.co/dashboard${NC}"
fi

echo ""
echo "================================================================"
echo "   ✅ Próximos Passos"
echo "================================================================"
echo ""
echo -e "${YELLOW}1. Inicie a API:${NC}"
echo "   cd apps/api"
echo "   npm run dev"
echo ""
echo -e "${YELLOW}2. Inicie o Frontend:${NC}"
echo "   cd apps/web"
echo "   npm run dev"
echo ""
echo -e "${YELLOW}3. Acesse: http://localhost:3011/dashboard${NC}"
echo ""
echo -e "${YELLOW}4. Clique em '✈️ Buscar Vôo'${NC}"
echo ""
echo -e "${YELLOW}5. Digite um número de vôo (ex: LA3789, G31234)${NC}"
echo ""
echo "================================================================"
echo -e "${GREEN}   🚀 Agora você terá dados GPS em tempo real!${NC}"
echo "================================================================"
echo ""

# Perguntar se quer iniciar a API agora
read -p "Deseja iniciar a API agora? (S/N): " START_API
if [ "$START_API" = "S" ] || [ "$START_API" = "s" ]; then
    echo ""
    echo -e "${CYAN}🚀 Iniciando API...${NC}"
    cd apps/api
    npm run dev
fi
