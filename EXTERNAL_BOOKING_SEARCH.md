# 📋 Busca de Reservas Externas - Documentação Técnica

## 🎯 Objetivo

Este documento explica como funciona a busca de reservas (localizadores) de companhias aéreas externas no sistema Reserva Segura.

---

## ⚠️ Limitações Importantes

### APIs Públicas NÃO Existem

As principais companhias aéreas brasileiras **NÃO oferecem APIs públicas** para consulta de reservas:

#### **GOL Linhas Aéreas**
- ❌ Sem API pública
- ✅ Sistema baseado em **Sabre** (desde setembro 2021)
- 🔐 Acesso via API requer **parceria comercial** com Sabre
- 📞 Requer credenciamento IATA

#### **LATAM Airlines**
- ❌ Sem API pública
- ✅ Opera via **GDS** (Global Distribution Systems)
- 🔐 Acesso via API requer **contato direto** com LATAM
- 📞 Integração apenas para agências credenciadas

#### **AZUL Linhas Aéreas**
- ❌ **Absolutamente sem API pública**
- 🔐 Acesso apenas via **contato comercial**
- 📧 Email: **suporte.azulws@voeazul.com.br**
- 📞 Sem opções para desenvolvedores individuais

---

## 🔄 Como o Sistema Funciona

### Fluxo de Busca de Reservas

Quando um usuário busca uma reserva pelo localizador e sobrenome, o sistema segue este fluxo:

```
1. 🗄️  BANCO DE DADOS LOCAL
   └─ Busca reservas criadas internamente
   └─ Se encontrar → Enriquece com dados de voo em tempo real
   └─ Se NÃO encontrar → Continua para passo 2

2. 🛫 GOL Linhas Aéreas
   └─ [1/3] Tenta endpoint não oficial (API)
   └─ [2/3] Tenta Puppeteer scraping (navegador headless)
   └─ [3/3] Tenta scraping direto do HTML
   └─ Se encontrar → Retorna dados
   └─ Se NÃO encontrar → Continua para passo 3

3. 🛫 LATAM Airlines
   └─ [1/2] Tenta endpoint não oficial (API)
   └─ [2/2] Tenta scraping direto do HTML
   └─ Se encontrar → Retorna dados
   └─ Se NÃO encontrar → Continua para passo 4

4. 🛫 AZUL Linhas Aéreas
   └─ [1/2] Tenta endpoint não oficial (API)
   └─ [2/2] Tenta scraping direto do HTML
   └─ Se encontrar → Retorna dados
   └─ Se NÃO encontrar → Retorna NULL

5. ❌ Reserva não encontrada
```

---

## 🛠️ Métodos Implementados

### 1. **Tentativa de API Não Oficial**

O sistema tenta endpoints que podem existir mas não são documentados:

```typescript
// GOL
POST https://www.voegol.com.br/api/booking/search
{
  "recordLocator": "ABC123",
  "lastName": "SILVA"
}

// LATAM
POST https://www.latam.com/ws-booking/booking/search
{
  "bookingCode": "XYZ789",
  "lastName": "SANTOS",
  "language": "PT",
  "country": "BR"
}

// AZUL
POST https://www.voeazul.com.br/api/reservations/search
{
  "pnr": "DEF456",
  "lastName": "OLIVEIRA"
}
```

**⚠️ Nota**: Estes endpoints podem:
- Não funcionar (retornar 404, 403, 401)
- Exigir autenticação adicional
- Ser alterados ou removidos sem aviso
- Funcionar esporadicamente

---

### 2. **Puppeteer Scraping** (apenas GOL)

Usa um navegador headless para preencher o formulário de busca:

**Vantagens:**
- ✅ Simula comportamento humano
- ✅ Executa JavaScript da página
- ✅ Mais confiável que scraping direto

**Desvantagens:**
- ❌ Lento (5-15 segundos)
- ❌ Alto consumo de recursos (RAM/CPU)
- ❌ Quebra se o layout da página mudar
- ❌ Não funciona se houver CAPTCHA

---

### 3. **Scraping Direto com Cheerio**

Faz requisição HTTP e analisa o HTML:

**Vantagens:**
- ✅ Rápido (1-3 segundos)
- ✅ Leve (baixo consumo de recursos)

**Desvantagens:**
- ❌ Não executa JavaScript
- ❌ Muito frágil (quebra com mudanças no HTML)
- ❌ Não funciona se dados vierem de API interna

---

## 📊 Taxa de Sucesso Esperada

| Método | GOL | LATAM | AZUL | Observações |
|--------|-----|-------|------|-------------|
| **Banco Local** | 100% | 100% | 100% | Reservas criadas no sistema |
| **API Não Oficial** | ~5% | ~5% | ~0% | Endpoints provavelmente não funcionam |
| **Puppeteer** | ~30% | N/A | N/A | Depende de layout e CAPTCHA |
| **Scraping Direto** | ~10% | ~10% | ~10% | Muito frágil |

**Taxa geral para reservas externas:** ~15-20% de sucesso

---

## 🎯 Recomendações

### Para Desenvolvedores

1. **Não confie na busca externa** para dados críticos
2. **Sempre tenha fallbacks** para quando a busca falhar
3. **Monitore os logs** para ver taxas de sucesso reais
4. **Considere integração oficial** se o negócio crescer

### Para o Negócio

Se a busca de reservas externas é **crítica** para o negócio:

#### Opção 1: Parcerias Oficiais (Recomendado)
- 🏢 **GOL**: Parceria com Sabre (https://www.sabre.com)
- 🏢 **LATAM**: Contato direto via GDS
- 🏢 **AZUL**: Email suporte.azulws@voeazul.com.br

#### Opção 2: Serviços de Terceiros
- ✈️ **AirLabs**: https://airlabs.co (flight tracking)
- ✈️ **Aviationstack**: https://aviationstack.com (flight status)
- ✈️ **Duffel**: https://duffel.com (booking APIs)
- ✈️ **Travelport**: https://www.travelport.com (GDS)

#### Opção 3: Focar em Reservas Internas
- 📊 Criar reservas no próprio sistema
- 🎫 Vender passagens através do próprio sistema
- 💳 Processar pagamentos internamente

---

## 🔍 Logs Detalhados

O sistema agora gera logs extremamente detalhados:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 GOL - Iniciando busca de reserva
   Localizador: ABC123
   Sobrenome: SILVA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 [1/3] Tentando endpoint não oficial da GOL...
   📊 Status HTTP: 404
   ⚠️ API não retornou dados válidos (Status: 404)
🌐 [2/3] Tentando scraping com Puppeteer...
   ⚠️ Puppeteer não encontrou dados
📄 [3/3] Tentando scraping direto do HTML...
   ❌ Scraping direto não encontrou dados
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ GOL - Reserva não encontrada após 3 tentativas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Esses logs permitem:
- ✅ Entender exatamente onde a busca falhou
- ✅ Identificar padrões de falha
- ✅ Melhorar os métodos que têm mais sucesso
- ✅ Tomar decisões baseadas em dados reais

---

## 💡 Mensagens ao Usuário

Ao exibir resultado de busca ao usuário, seja claro:

### ✅ Quando encontrar:
```
"Reserva encontrada!
Dados obtidos de: [Banco de Dados / GOL / LATAM / AZUL]"
```

### ❌ Quando NÃO encontrar:
```
"Reserva não encontrada.

Isso pode acontecer se:
- O localizador ou sobrenome estão incorretos
- A reserva foi feita diretamente com a companhia aérea
- A reserva é muito antiga ou foi cancelada

Para reservas feitas fora do Reserva Segura,
recomendamos consultar diretamente no site da companhia."
```

---

## 🔐 Segurança e Privacidade

### Dados Sensíveis

⚠️ **NUNCA** grave logs com:
- Números de CPF completos
- Números de cartão de crédito
- Senhas ou tokens de autenticação
- Emails completos (use: u***@exemplo.com)

### Rate Limiting

Implemente rate limiting para evitar:
- Bloqueio por IP das companhias
- Sobrecarga do próprio sistema
- Detecção como bot

**Sugestão**: Máximo 5 buscas por minuto por companhia

---

## 📈 Métricas Importantes

Monitore estas métricas:

```typescript
{
  "total_searches": 1000,
  "found_in_database": 700,      // 70%
  "found_in_gol": 50,             // 5%
  "found_in_latam": 30,           // 3%
  "found_in_azul": 20,            // 2%
  "not_found": 200,               // 20%

  "average_search_time": {
    "database": "100ms",
    "gol_api": "2s",
    "gol_puppeteer": "12s",
    "gol_scraping": "3s",
    "latam": "2.5s",
    "azul": "2.5s"
  }
}
```

---

## 🚀 Roadmap de Melhorias

### Curto Prazo
- [ ] Adicionar cache de resultados (15 minutos)
- [ ] Implementar retry automático com backoff
- [ ] Melhorar seletores CSS para scraping
- [ ] Adicionar testes automatizados

### Médio Prazo
- [ ] Investigar endpoints de check-in (mais estáveis)
- [ ] Implementar fila de processamento assíncrono
- [ ] Adicionar dashboard de métricas
- [ ] Sistema de notificação de falhas

### Longo Prazo
- [ ] Parceria oficial com pelo menos uma companhia
- [ ] Integração com GDS (Amadeus/Sabre/Travelport)
- [ ] Migrar para serviços de terceiros (Duffel/AirLabs)

---

## 📞 Suporte

Para questões técnicas sobre a implementação:
- 📁 Arquivo: `apps/api/src/services/real-flight-search.service.ts`
- 📁 Arquivo: `apps/api/src/services/airline-booking.service.ts`

Para parcerias com companhias:
- ✈️ **GOL Sabre**: https://www.sabre.com/contact
- ✈️ **LATAM**: Contato comercial via GDS
- ✈️ **AZUL**: suporte.azulws@voeazul.com.br

---

**Documentação gerada em:** 2025-01-22
**Versão do Sistema:** 1.0.0
**Última atualização:** Implementação de logs detalhados e melhorias no tratamento de erros

🤖 Generated with [Claude Code](https://claude.com/claude-code)
