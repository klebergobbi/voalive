# 🛫 Como Usar a Busca de Voos com Dados Reais

## ✅ O QUE JÁ ESTÁ IMPLEMENTADO

O sistema **JÁ TEM TODOS OS CAMPOS** implementados e funcionais:

- ✅ Status do voo em tempo real
- ✅ Horários reais de partida/chegada
- ✅ Portões e terminais
- ✅ Posição GPS do avião (lat, long, altitude, velocidade, direção)
- ✅ Atrasos detectados automaticamente
- ✅ Informações da aeronave (modelo, registro)

## 🚀 COMO FAZER FUNCIONAR

### 1. Iniciar a API

```bash
cd C:\Projetos\VoaLive\apps\api
npm run dev
```

A API deve iniciar em `http://localhost:4000`

### 2. Iniciar o Frontend

```bash
cd C:\Projetos\VoaLive\apps\web
npm run dev
```

O frontend deve iniciar em `http://localhost:3011`

### 3. Acessar o Dashboard

1. Abra o navegador em `http://localhost:3011/dashboard`
2. Clique no botão **"✈️ Buscar Vôo"**
3. Digite um número de vôo (ex: `LA3789`, `G31234`, `AD4567`)
4. Aguarde a busca nas APIs

### 4. Resultados Esperados

**Se o vôo estiver NO AR agora:**
- ✅ Todos os campos serão preenchidos
- ✅ GPS com posição em tempo real
- ✅ Horários reais
- ✅ Status atualizado

**Se o vôo estiver PROGRAMADO (ainda não decolou):**
- ✅ Horários estimados
- ⚠️ GPS não disponível (vôo não está no ar)
- ⚠️ Portões podem não estar disponíveis (depende da API)

## 🔑 CONFIGURAR API KEYS PARA DADOS COMPLETOS

Atualmente você tem:
- ✅ **Aviationstack**: Configurado (50e337585fbf093ffbee426c270e82e3)
- ❌ **AirLabs**: NÃO configurado (RECOMENDADO!)

### Por que usar o AirLabs?

O **AirLabs é a API PRIORITÁRIA** porque oferece:
- 📍 GPS em tempo real (30-60s de atualização)
- 🚪 Portões e terminais atualizados
- ✈️ Dados de aeronaves completos
- ⏰ Horários precisos
- 🆓 **Free tier generoso** (100+ requests/dia)

### Como obter API Key do AirLabs:

1. Acesse https://airlabs.co/
2. Clique em **"Get API Key"** ou **"Sign Up"**
3. Crie sua conta (gratuita)
4. Copie sua API key do dashboard
5. Cole no arquivo `.env`:

```bash
# No arquivo: C:\Projetos\VoaLive\.env
AIRLABS_API_KEY=sua_key_aqui_cole_aqui
```

6. Reinicie a API:

```bash
cd C:\Projetos\VoaLive\apps\api
# Pressione Ctrl+C para parar
npm run dev
```

## 📊 DIFERENÇA ENTRE AS APIS

### AirLabs (Prioridade 1 - RECOMENDADO)
- ✅ Dados em tempo real (30-60s delay)
- ✅ GPS completo com altitude, velocidade, direção
- ✅ Portões e terminais
- ✅ 100+ requests/dia grátis
- ✅ Cobertura global

### Aviationstack (Prioridade 2 - BACKUP)
- ✅ Horários e status
- ⚠️ GPS limitado (só voos em tempo real)
- ⚠️ Portões nem sempre disponíveis
- ⚠️ 100 requests/mês grátis
- ✅ Dados históricos

### FlightRadar24 (Prioridade 3 - FALLBACK)
- ⚠️ Scraping (pode falhar)
- ⚠️ Sem API oficial
- ❌ Não recomendado

## 🧪 TESTAR SE ESTÁ FUNCIONANDO

### Teste 1: API está rodando?

```bash
curl http://localhost:4000/api/v1/health
```

Deve retornar: `{"status": "ok"}`

### Teste 2: Buscar vôo em tempo real

No navegador, console do DevTools (F12):

```javascript
fetch('http://localhost:4000/api/v1/flight-search/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ flightNumber: 'LA3789' })
})
  .then(r => r.json())
  .then(data => console.log(data));
```

## ❓ TROUBLESHOOTING

### Campos não aparecem?

**Motivo 1: API não está rodando**
```bash
cd C:\Projetos\VoaLive\apps\api && npm run dev
```

**Motivo 2: Vôo não está no ar**
- Portões/GPS só aparecem para vôos EM VOO
- Tente buscar vôos que estão voando AGORA
- Use https://www.flightradar24.com/ para encontrar vôos ativos

**Motivo 3: API Keys não configuradas**
- Verifique o arquivo `.env`
- Configure o AirLabs (RECOMENDADO!)

### API retorna "Vôo não encontrado"?

**Causas comuns:**
1. Vôo não opera hoje (alguns vôos são específicos de dias da semana)
2. Número do vôo incorreto
3. Vôo muito antigo ou muito futuro
4. Companhia aérea não coberta pelas APIs

**Solução:**
- Use vôos de hoje
- Verifique o número no site da companhia
- Teste com vôos internacionais grandes (mais cobertura)

## 📝 VOOS RECOMENDADOS PARA TESTE

Vôos que normalmente têm boa cobertura:

```
Internacionais (quase sempre tem dados GPS):
- LA8001 (LATAM Brasil-Chile)
- G31234 (GOL doméstico)
- AD4567 (Azul doméstico)
- AA100 (American Airlines)
- BA247 (British Airways)

Horário comercial (8h-22h):
- Maior chance de vôos ativos
- Mais dados disponíveis
```

## 🎯 RESULTADOS ESPERADOS

### Vôo EM VOO (Active):
```
✅ Status: EM VOO
✅ Horário Partida Real: 10:30
✅ Horário Chegada Estimado: 12:45
✅ Portão: 15
✅ Terminal: 2
✅ Posição GPS:
   - Latitude: -23.4567°
   - Longitude: -46.1234°
   - Altitude: 35,000 pés
   - Velocidade: 850 km/h
   - Direção: 180°
✅ Aeronave: Boeing 737-800
```

### Vôo PROGRAMADO (Scheduled):
```
✅ Status: AGENDADO
✅ Horário Partida Programado: 14:00
✅ Horário Partida Estimado: 14:15 (se houver atraso)
✅ Origem: GRU → Destino: SDU
⚠️ GPS: Não disponível (vôo não decolou)
⚠️ Portão: Pode não estar disponível
```

## 💡 DICAS

1. **Melhor horário para testar**: 8h às 22h (horário comercial)
2. **Melhores vôos**: Internacionais e grandes companhias
3. **Configure o AirLabs**: Dados MUITO melhores
4. **Free tier suficiente**: Para desenvolvimento
5. **Produção**: Considere planos pagos para mais requests

## 🔗 RECURSOS

- [AirLabs Docs](https://airlabs.co/docs/)
- [Aviationstack Docs](https://aviationstack.com/documentation)
- [FlightRadar24](https://www.flightradar24.com/) - Para encontrar vôos ativos
- [FlightAware](https://flightaware.com/) - Alternativa para buscar vôos

## ⚙️ ARQUIVOS IMPORTANTES

```
apps/api/src/services/airlabs.service.ts          → Serviço AirLabs
apps/api/src/services/aviationstack.service.ts     → Serviço Aviationstack
apps/api/src/services/real-flight-search.service.ts → Orquestrador
apps/api/src/controllers/flight-search.controller.ts → Controller da API
apps/web/src/components/dashboard/flight-search-modal.tsx → Modal de busca
apps/web/src/components/dashboard/auto-fill-flight-form.tsx → Formulário
```

---

**✨ RESUMO:**

Tudo já está implementado e funcionando! Você só precisa:

1. ✅ Iniciar a API (`cd apps/api && npm run dev`)
2. ✅ Iniciar o Frontend (`cd apps/web && npm run dev`)
3. 🔑 **(OPCIONAL mas RECOMENDADO)** Configurar AirLabs API key
4. 🧪 Testar com vôos ativos (use FlightRadar24 para encontrar)

**Com AirLabs configurado, você terá dados GPS em tempo real, portões, terminais e tudo mais!** 🚀
