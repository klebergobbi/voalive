# 🛫 Configuração das APIs de Voos em Tempo Real

Este documento explica como configurar as APIs de rastreamento de voos para obter dados reais de companhias aéreas.

## 📋 Índice

- [APIs Disponíveis](#apis-disponíveis)
- [Configuração Passo a Passo](#configuração-passo-a-passo)
- [Como Usar](#como-usar)
- [Exemplos de Uso](#exemplos-de-uso)
- [Troubleshooting](#troubleshooting)

---

## 🌐 APIs Disponíveis

O sistema suporta **duas APIs profissionais** de rastreamento de voos:

### 1. **AirLabs** (Recomendado) ⭐

**Por que usar:**
- ✅ **Free tier disponível** com requisições limitadas
- ✅ Dados em **tempo real** (30-60s de delay)
- ✅ Suporta **posição GPS** de voos em tempo real
- ✅ Cobertura global incluindo todas companhias brasileiras (GOL, LATAM, Azul)
- ✅ API simples e confiável

**Website:** https://airlabs.co/

**Características:**
- Real-time flight tracking (posição GPS)
- Flight schedules (horários programados)
- Airport data (informações de aeroportos)
- Airline information
- Flight routes

---

### 2. **Aviationstack** (Alternativa/Backup)

**Por que usar:**
- ✅ **100 requisições grátis/mês**
- ✅ Dados históricos de até 3 meses
- ✅ Boa cobertura internacional
- ✅ API REST simples

**Website:** https://aviationstack.com/

**Características:**
- Real-time flight status
- Historical flight data (3 meses)
- Flight schedules
- Airport information
- Airline routes

---

## ⚙️ Configuração Passo a Passo

### Passo 1: Obter API Keys

#### **AirLabs (Recomendado)**

1. Acesse https://airlabs.co/
2. Clique em **"Sign Up"** ou **"Get API Key"**
3. Crie sua conta (gratuita)
4. No dashboard, copie sua **API Key**
5. Guarde a chave em local seguro

#### **Aviationstack**

1. Acesse https://aviationstack.com/
2. Clique em **"Get Free API Key"**
3. Escolha o plano **Free** (100 requests/month)
4. Crie sua conta
5. No dashboard, copie sua **API Access Key**

---

### Passo 2: Configurar no Projeto

1. **Copie o arquivo de exemplo:**
   ```bash
   cp .env.example .env
   ```

2. **Edite o arquivo `.env`:**
   ```bash
   # AirLabs API (Recomendado)
   AIRLABS_API_KEY=sua_chave_airlabs_aqui

   # Aviationstack API (Opcional - Backup)
   AVIATIONSTACK_API_KEY=sua_chave_aviationstack_aqui
   ```

3. **Salve o arquivo**

⚠️ **IMPORTANTE:** Nunca commite o arquivo `.env` no git!

---

### Passo 3: Configurar no Servidor de Produção

**Via SSH:**
```bash
ssh root@SEU_SERVIDOR

# Editar arquivo .env no servidor
nano /opt/voalive/.env.production

# Adicionar as chaves:
AIRLABS_API_KEY=sua_chave_aqui
AVIATIONSTACK_API_KEY=sua_chave_aqui

# Salvar (Ctrl+O) e sair (Ctrl+X)
```

**Via GitHub Secrets (Recomendado):**
1. Vá para Settings > Secrets > Actions
2. Adicione:
   - `AIRLABS_API_KEY`
   - `AVIATIONSTACK_API_KEY`

---

## 🚀 Como Usar

O sistema usa as APIs automaticamente na seguinte **ordem de prioridade**:

```
1️⃣ AirLabs (se configurado)
   ↓ (se falhar ou não configurado)
2️⃣ Aviationstack (se configurado)
   ↓ (se falhar)
3️⃣ FlightRadar24 (fallback público, dados limitados)
```

### No Frontend (Dashboard):

1. **Buscar Voo Específico:**
   - Digite o número do voo: `LA3789`, `G31234`, `AD4567`
   - Clique em "Buscar Voo"
   - Sistema busca dados **reais e atualizados**

2. **Monitorar Aeroporto:**
   - Digite o código IATA: `GRU`, `CGH`, `BSB`
   - Clique em "Buscar Aeroporto"
   - Retorna todos voos reais (partidas/chegadas)

3. **Dados Retornados:**
   - ✅ Horários reais de partida/chegada
   - ✅ Status atual (no horário, atrasado, cancelado)
   - ✅ Portão e terminal
   - ✅ Posição GPS em tempo real (AirLabs)
   - ✅ Companhia aérea e aeronave
   - ✅ Atrasos e estimativas

---

## 📝 Exemplos de Uso

### 1. Buscar voo específico da LATAM

```
Número do voo: LA3789
Data: Hoje (automático)

Resultado:
✅ Voo encontrado no AirLabs
- Origem: GRU (São Paulo/Guarulhos)
- Destino: BSB (Brasília)
- Partida: 14:30 (no horário)
- Chegada: 16:15 (estimada)
- Status: EM VOO
- Posição: Lat -22.5, Lng -47.3
- Altitude: 35000 pés
- Velocidade: 850 km/h
```

### 2. Monitorar aeroporto de Congonhas

```
Código do aeroporto: CGH
Tipo: Partidas

Resultado:
✅ 15 voos encontrados no AirLabs
- G31045 → GRU (13:45) - No horário
- LA4532 → REC (14:20) - Atrasado 15min
- AD9876 → FOR (15:00) - Check-in
...
```

### 3. Buscar voos por rota

```
Origem: GRU
Destino: RIO

Resultado:
✅ 8 voos encontrados
- LA3421 (08:00) - GOL
- G31234 (10:30) - LATAM
- AD5678 (13:45) - Azul
...
```

---

## 🔍 Troubleshooting

### ❌ "API key não configurada"

**Solução:**
1. Verifique se adicionou a chave no arquivo `.env`
2. Reinicie o servidor: `docker-compose restart`
3. Verifique os logs: `docker logs voalive-reservasegura-api-1`

### ❌ "Voo não encontrado"

**Possíveis causas:**
1. Número do voo incorreto
2. Voo não está programado para hoje
3. Limite de requisições atingido (free tier)

**Solução:**
- Verifique o número do voo no site da companhia aérea
- Configure ambas APIs (AirLabs + Aviationstack) para redundância

### ❌ "Request limit exceeded"

**Free tier esgotado**

**Solução:**
1. Aguarde reset mensal
2. Faça upgrade do plano
3. Configure API alternativa

### ❌ "Dados desatualizados"

**Cache do navegador**

**Solução:**
- Pressione `Ctrl + Shift + R` (hard refresh)
- Ou abra em aba anônima

---

## 💡 Dicas de Uso

1. **Configure as duas APIs** para ter redundância
2. **AirLabs é melhor** para dados em tempo real
3. **Aviationstack** tem dados históricos úteis
4. **Limite o uso** para evitar estourar quota gratuita
5. **Monitore os logs** para ver qual API está sendo usada

---

## 📊 Comparação de Planos

### AirLabs
- **Free:** Limitado (verificar no site)
- **Basic ($49/mês):** 10,000 requests
- **Pro ($149/mês):** 100,000 requests

### Aviationstack
- **Free:** 100 requests/mês
- **Basic ($49.99/mês):** 10,000 requests
- **Professional ($149.99/mês):** 100,000 requests

---

## 🎯 Próximos Passos

1. ✅ Obter API keys
2. ✅ Configurar no `.env`
3. ✅ Testar busca de voos
4. ✅ Configurar em produção
5. ✅ Monitorar uso e logs

---

## 🆘 Suporte

- **AirLabs:** https://airlabs.co/docs/
- **Aviationstack:** https://aviationstack.com/documentation

**Desenvolvido com ❤️ para Reserva Segura**
