# Análise: Busca de Reservas GOL

## 🎯 Pergunta

**"É POSSÍVEL BUSCAR OS VÔOS DO SITE DA GOL POR DENTRO DA NOSSA APLICAÇÃO?"**

Site: https://b2c.voegol.com.br/minhas-viagens/encontrar-viagem

Campos disponíveis:
- **Localizador:** PDCDX
- **Último nome:** Diniz
- **Origem:** SLZ

## ✅ RESPOSTA: SIM, É POSSÍVEL!

### Mas com limitações importantes...

---

## 📊 Estado Atual da Implementação

### ✅ O que JÁ ESTÁ implementado:

1. **Endpoint da API:** `/api/v1/airline-booking/search-booking`
2. **Serviço completo:** `AirlineBookingService`
3. **3 métodos de tentativa:**
   - API não oficial da GOL
   - Scraping com Puppeteer/Playwright
   - Scraping direto do HTML

### ❌ O que NÃO está funcionando:

1. **Campo "origem" não é utilizado** no código atual
2. **Site da GOL mudou** - agora EXIGE o campo origem
3. **APIs não oficiais** provavelmente bloqueadas ou alteradas
4. **CAPTCHA** pode bloquear tentativas automatizadas

---

## 🧪 Teste Realizado

### Dados Fornecidos:
```json
{
  "localizador": "PDCDX",
  "sobrenome": "Diniz",
  "origem": "SLZ"
}
```

### Endpoint Testado:
```bash
POST https://www.reservasegura.pro/api/v1/airline-booking/search-booking
```

### Resultado:
```json
{
  "success": false,
  "error": "Reserva não encontrada",
  "message": "Não foi possível localizar sua reserva..."
}
```

### Por que falhou?
1. ❌ Código atual não usa o campo `origem`
2. ❌ API não oficial da GOL provavelmente mudou/bloqueada
3. ❌ Scraping precisa de ajustes para o novo site

---

## 🔧 O que Precisa Ser Atualizado

### 1. Adicionar Campo Origem ao Scraping

**Arquivo:** `apps/api/src/services/real-flight-search.service.ts`
**Método:** `searchGolBooking()`

**ANTES:**
```typescript
async searchGolBooking(localizador: string, sobrenome: string) {
  // Não usa origem
}
```

**DEPOIS:**
```typescript
async searchGolBooking(localizador: string, sobrenome: string, origem: string) {
  // Incluir origem na busca
  const response = await axios.post(apiUrl, {
    recordLocator: localizador,
    lastName: sobrenome,
    origin: origem  // ← NOVO CAMPO
  });
}
```

### 2. Atualizar Scraper Puppeteer

**Arquivo:** `apps/api/src/services/real-flight-search.service.ts`
**Método:** `scrapeGolWithPuppeteer()`

Adicionar preenchimento do campo origem:
```typescript
await page.type('#origem', origem);  // Novo campo
await page.type('#localizador', localizador);
await page.type('#sobrenome', sobrenome);
```

### 3. Atualizar URL do Site GOL

**ANTES:**
```typescript
const url = 'https://www.voegol.com.br/pt/servicos/minhas-viagens';
```

**DEPOIS:**
```typescript
const url = 'https://b2c.voegol.com.br/minhas-viagens/encontrar-viagem';
```

---

## 🚧 Desafios e Limitações

### 1. **CAPTCHA** 🤖
- GOL usa proteção anti-bot
- Pode bloquear tentativas automatizadas
- Solução: Resolver CAPTCHA manualmente ou usar serviço de terceiros

### 2. **Site Dinâmico** ⚡
- Página carrega via JavaScript (React/Angular)
- Precisa aguardar renderização completa
- Scraping mais complexo e lento

### 3. **APIs Não Oficiais** 🚫
- Não são documentadas
- Podem mudar a qualquer momento
- GOL pode bloquear/detectar uso não autorizado

### 4. **Rate Limiting** ⏱️
- Muitas tentativas podem resultar em bloqueio
- Necessário implementar delays entre requisições

### 5. **Sem Garantias** ⚠️
- Scraping viola termos de serviço
- GOL pode adicionar mais proteções
- Método pode parar de funcionar a qualquer momento

---

## 💡 Soluções Alternativas (Recomendadas)

### Opção 1: API Oficial GOL (Ideal)
✅ **Vantagens:**
- Dados confiáveis e atualizados
- Sem risco de bloqueio
- Suporte oficial

❌ **Desvantagens:**
- Requer parceria comercial
- Pode ter custos
- Processo de aprovação demorado

**Contato:** https://www.voegol.com.br/contato

### Opção 2: GDS (Amadeus, Sabre, Galileo)
✅ **Vantagens:**
- Acesso a múltiplas companhias
- Dados oficiais
- Integrações profissionais

❌ **Desvantagens:**
- Alto custo
- Requer certificação
- Complexo de integrar

### Opção 3: Cadastro Manual + Monitoramento
✅ **Vantagens:**
- Não viola termos de serviço
- Usuário tem controle total
- Funciona sempre

❌ **Desvantagens:**
- Requer trabalho manual inicial
- Usuário precisa informar dados

**Como funciona:**
1. Usuário acessa site da GOL
2. Consulta sua reserva manualmente
3. Copia dados (número voo, horários)
4. Cadastra no sistema ReservaSegura
5. Sistema monitora automaticamente o número do voo

---

## 🎯 Recomendação Final

### Para CURTO PRAZO (Solução Rápida):

**Implementar "Cadastro Manual Assistido"**

1. Criar botão no frontend: **"Cadastrar Reserva GOL"**
2. Formulário guiado com campos:
   - Localizador
   - Sobrenome
   - Origem
   - Número do voo
   - Horários
3. Link direto para site da GOL: `https://b2c.voegol.com.br/minhas-viagens/encontrar-viagem`
4. Usuário consulta e copia dados
5. Sistema valida número do voo via APIs públicas
6. Ativa monitoramento automático

✅ **Vantagens:**
- Funciona 100% do tempo
- Sem violação de termos
- Sem risco de bloqueio
- Rápido de implementar

### Para MÉDIO/LONGO PRAZO:

**Negociar API Oficial com GOL**

Entrar em contato para parceria comercial e acesso à API oficial.

---

## 📝 Status de Implementação

### Busca Automática (Scraping)

| Método | Status | Observações |
|--------|--------|-------------|
| API Não Oficial | ❌ Não funciona | Provavelmente bloqueada |
| Puppeteer/Playwright | ⚠️ Parcial | Precisa atualizar com campo origem |
| Scraping HTML | ⚠️ Parcial | Site mudou |
| Campo Origem | ❌ Não implementado | Código ignora este campo |

### Alternativa Manual

| Recurso | Status |
|---------|--------|
| Endpoint API | ✅ Funcionando |
| Frontend | ⏳ Precisa criar |
| Validação | ✅ Funcionando |
| Monitoramento | ✅ Funcionando |

---

## 🚀 Próximos Passos (Se Quiser Implementar)

### 1. Atualizar Código Existente (2-3 horas)
- [ ] Adicionar parâmetro `origem` em `searchGolBooking()`
- [ ] Atualizar URL para novo site GOL
- [ ] Ajustar seletores do Puppeteer
- [ ] Testar com dados reais

### 2. Implementar Tratamento de CAPTCHA (4-6 horas)
- [ ] Detectar presença de CAPTCHA
- [ ] Integrar serviço de resolução (2Captcha, Anti-Captcha)
- [ ] Ou: Notificar usuário para resolver manualmente

### 3. Criar Interface Manual (2-3 horas)
- [ ] Formulário de cadastro assistido
- [ ] Link para site GOL
- [ ] Validação de número de voo
- [ ] Integração com monitoramento

### 4. Testes em Produção (1-2 horas)
- [ ] Testar com várias reservas reais
- [ ] Verificar taxa de sucesso
- [ ] Ajustar conforme necessário

---

## ⚖️ Considerações Legais

### ⚠️ IMPORTANTE:

Web scraping de sites de companhias aéreas pode:
- Violar termos de serviço
- Resultar em bloqueio de IP
- Gerar problemas legais

**Recomendação legal:**
1. Usar apenas para fins pessoais e educacionais
2. Respeitar robots.txt
3. Implementar delays entre requisições
4. Priorizar APIs oficiais quando disponíveis
5. Considerar cadastro manual como alternativa

---

## 📞 Conclusão

### ✅ É POSSÍVEL? **SIM!**

### ✅ Está FUNCIONANDO? **NÃO (atualmente)**

### ✅ Vale a PENA implementar? **DEPENDE**

**Recomendação:**
- **Se precisa AGORA:** Implementar cadastro manual assistido
- **Se quer AUTOMAÇÃO:** Atualizar código de scraping + tratar CAPTCHA
- **Se quer CONFIABILIDADE:** Buscar parceria com GOL para API oficial

---

**Data da Análise:** 2025-11-07
**Localizador Testado:** PDCDX (Diniz, SLZ)
**Status Atual:** ❌ Não funcional (precisa atualização)
**Recomendação:** Implementar cadastro manual + monitoramento automático
