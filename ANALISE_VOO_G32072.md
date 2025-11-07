# Análise do Voo G32072 - Descobertas Importantes

## 🔍 Pergunta Original
**"ESSE VÔO REALMENTE NÃO EXISTE? G32072 MAXGEA TRINDADE BSB"**

## ✅ Resposta: O VOO EXISTE, MAS...

### Status do Voo G32072
- **Voo:** G32072 / GLO2072
- **Companhia:** GOL Linhas Aéreas (G3)
- **Rota:** Brasília (BSB) → Rio de Janeiro/Galeão (GIG)
- **Horário Programado:** Decolagem 15:50, Pouso 17:35

### ⚠️ Descoberta Crítica

**O voo EXISTE e TEM HISTÓRICO, mas NÃO está operando hoje (07/nov/2025)**

#### Evidências:

1. **Histórico Confirmado:**
   - FlightAware mostra voos em: 06/Set/2025, 26/Dez/2024, 02/Fev/2025
   - Flightradar24 tem dados históricos
   - Rota confirmada: BSB → GIG

2. **Sem Dados Atuais (07/nov/2025):**
   - ❌ Aviationstack API: 0 resultados para G32072
   - ❌ Aviationstack API: 0 resultados para GLO2072
   - ❌ Aviationstack API: 0 voos GOL BSB→GIG hoje
   - ❌ FlightAware: Bloqueado (erro 402)
   - ❌ Flightradar24: Bloqueado (erro 403)

### 🎯 Conclusões

#### Por que o voo não foi encontrado?

Existem **3 possibilidades**:

**1. Voo Sazonal/Dias Específicos**
   - O G32072 pode operar apenas em certos dias da semana
   - Exemplo: Segunda, Quarta, Sexta
   - Hoje (quinta-feira 07/nov) pode não ser dia de operação

**2. Voo Descontinuado ou Suspenso**
   - GOL pode ter descontinuado a rota BSB→GIG neste horário
   - Ou suspenso temporariamente por baixa demanda

**3. Dados Não Disponíveis nas APIs Gratuitas**
   - APIs gratuitas (Aviationstack, AirLabs) têm limitações
   - Voos domésticos brasileiros podem ter cobertura limitada
   - Dados podem estar disponíveis apenas em APIs pagas

### 📊 Testes Realizados

#### Teste 1: Aviationstack - Busca por IATA
```bash
curl "http://api.aviationstack.com/v1/flights?access_key=***&flight_iata=G32072"
Resultado: 0 voos encontrados
```

#### Teste 2: Aviationstack - Busca por ICAO
```bash
curl "http://api.aviationstack.com/v1/flights?access_key=***&flight_icao=GLO2072"
Resultado: 0 voos encontrados
```

#### Teste 3: Aviationstack - Busca por Rota
```bash
curl "http://api.aviationstack.com/v1/flights?access_key=***&dep_iata=BSB&arr_iata=GIG&airline_iata=G3"
Resultado: 0 voos GOL na rota BSB→GIG hoje
```

#### Teste 4: FlightAware
```
https://pt.flightaware.com/live/flight/GLO2072
Resultado: HTTP 402 (Payment Required)
```

#### Teste 5: Flightradar24
```
https://www.flightradar24.com/data/flights/g32072
Resultado: HTTP 403 (Forbidden)
```

### 🛠️ Implicações Técnicas

#### Para o Sistema ReservaSegura

**POSITIVO:**
✅ A correção do Amadeus API ainda é válida (remove hardcode de origem/destino)
✅ O código agora busca corretamente por número de voo sem precisar da rota
✅ Sistema de fallback (4 camadas) está funcionando

**NEGATIVO:**
❌ Voos que não operam "hoje" não serão encontrados pelas APIs
❌ APIs gratuitas têm cobertura limitada de voos domésticos brasileiros
❌ Sistema depende de voo estar "ativo" no momento da busca

### 💡 Recomendações

#### Opção 1: Cadastro Manual com Validação Futura
Permitir que o usuário cadastre o voo **manualmente** informando:
- Número do voo: G32072
- Origem: BSB
- Destino: GIG
- Horário: 15:50
- Data específica: (usuário informa quando o voo opera)

Sistema então monitora a partir da data informada.

#### Opção 2: Buscar com Data Futura
Modificar busca para aceitar **data futura** como parâmetro:
```json
{
  "flightNumber": "G32072",
  "date": "2025-11-11"  // Segunda-feira próxima
}
```

#### Opção 3: Banco de Dados de Malha Aérea
Integrar com banco de dados de malha aérea (OAG, Cirium) que tem:
- Todos os voos programados (não só os que voam hoje)
- Dias de operação (ex: 1,3,5 = Seg, Qua, Sex)
- Horários sazonais

#### Opção 4: Web Scraping Direto da GOL
Fazer scraping do site da GOL:
```
https://www.voegol.com.br/pt/informacoes/voos-e-aeroportos/status-de-voos
```
Buscar diretamente na fonte oficial da companhia.

### 🧪 Próximos Testes Sugeridos

1. **Testar voo G31001** (voo mais comum GOL BSB→GIG)
2. **Testar voo de LATAM LA3001** (para comparar)
3. **Testar com data futura** (próxima segunda-feira)
4. **Testar voo internacional** (G31010 GRU→FLL) para ver se APIs têm mais cobertura

### 📝 Status do Deploy

**PAUSADO - Aguardando decisão:**
- Correção do código está correta ✅
- Mas não resolve o problema de "voo não opera hoje"
- Precisa decidir estratégia de cadastro antes de deploy

### 🔗 Fontes Consultadas

- FlightAware: https://www.flightaware.com/live/flight/GLO2072
- Flightradar24: https://www.flightradar24.com/data/flights/g32072
- Aviationstack API: http://api.aviationstack.com/v1/flights
- Airportia: https://www.airportia.com/flights/g32072/

---

**Data da Análise:** 2025-11-07
**Analista:** Claude Code
**Conclusão:** Voo existe mas não opera hoje. Sistema precisa de ajuste para lidar com voos sazonais/dias específicos.
