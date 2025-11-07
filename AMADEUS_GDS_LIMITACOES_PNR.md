# Amadeus GDS: Limitações para Busca de PNRs Externos

## 🎯 Pergunta

**"Podemos usar o Amadeus GDS (que já temos configurado) para buscar reservas da GOL usando Localizador + Sobrenome + Origem?"**

Exemplo: `PDCDX` + `Diniz` + `SLZ`

## ⚠️ RESPOSTA: NÃO É POSSÍVEL (com limitações)

### Por que não funciona?

---

## 📊 Amadeus: Self-Service vs Enterprise

Temos acesso ao **Amadeus Self-Service API** (credenciais já configuradas).

### Self-Service API (O que temos)

**Limitações:**
- ❌ **NÃO recupera PNRs de outras agências/companhias**
- ❌ Só acessa PNRs criados pela própria conta Amadeus
- ❌ Requer parceria com consolidador para emissão de tickets
- ❌ Operações pós-reserva devem ser feitas offline

**O que conseguimos fazer:**
- ✅ Criar novas reservas
- ✅ Buscar voos disponíveis
- ✅ Consultar horários e disponibilidade
- ✅ Criar PNRs no sistema Amadeus
- ✅ Recuperar apenas PNRs criados por nós

### Enterprise API (O que precisaríamos)

**Vantagens:**
- ✅ Acesso completo ao GDS Amadeus
- ✅ Gerenciamento total de PNRs
- ✅ Emissão de e-tickets
- ✅ **Possibilidade** de acessar PNRs externos (depende de permissões)

**Desvantagens:**
- ❌ Requer acreditação de agência de viagens
- ❌ Custo muito mais alto
- ❌ Processo de aprovação complexo
- ❌ Mesmo assim, pode não ter acesso a PNRs de outras agências

---

## 🔍 Por que não conseguimos acessar PNR `PDCDX`?

### Origem do PNR

O PNR `PDCDX` foi criado:
- ✅ Diretamente no site da **GOL** (b2c.voegol.com.br)
- ✅ No sistema interno da GOL
- ✅ Usando a conta/agência da GOL

**Não foi criado:**
- ❌ Através da nossa conta Amadeus
- ❌ Por nossa agência
- ❌ No nosso Office ID do Amadeus

### Como funciona PNR no GDS

```
PNR PDCDX
├── Criado por: GOL (Office ID da GOL)
├── Sistema: GDS da GOL (pode ser Amadeus, Sabre, ou sistema próprio)
└── Acesso: Apenas GOL e agentes autorizados
```

**Nossa conta Amadeus:**
```
Nossa Conta Amadeus (Self-Service)
├── Office ID: Nosso código único
├── Acesso: Apenas PNRs criados por nós
└── Limitação: Não vê PNRs de outras agências
```

---

## 🌐 Estrutura do Sistema GDS

### Como Companhias Aéreas Usam GDS

```
GOL
├── Usa GDS (Amadeus/Sabre/outro)
├── Tem seu próprio Office ID
├── Cria PNRs no sistema
└── PNRs isolados por segurança

Nossa Conta
├── Usa Amadeus GDS (Self-Service)
├── Tem nosso Office ID
├── Cria nossos PNRs
└── Não vê PNRs da GOL
```

**Analogia:** É como dois usuários diferentes do Gmail. Mesmo usando o mesmo servidor (Gmail), um não consegue acessar os emails do outro.

---

## ✅ O que o Amadeus Self-Service PERMITE

### 1. Buscar Voos Disponíveis

```bash
GET /v2/shopping/flight-offers
Params:
  origin: SLZ
  destination: GRU
  departureDate: 2025-11-10
```

**Resposta:**
- ✅ Voos disponíveis da GOL, LATAM, Azul
- ✅ Preços, horários, assentos
- ✅ Informações em tempo real

### 2. Criar Nova Reserva

```bash
POST /v1/booking/flight-orders
Body:
  flightOffer: {...}
  travelers: [{name, document}]
```

**Resposta:**
- ✅ Cria PNR no sistema Amadeus
- ✅ Nosso Office ID
- ✅ Podemos recuperar depois

### 3. Consultar Status de Voo

```bash
GET /v2/schedule/flights
Params:
  carrierCode: G3 (GOL)
  flightNumber: 1413
  scheduledDepartureDate: 2025-11-07
```

**Resposta:**
- ✅ Horários, portões, status
- ✅ Atrasos, cancelamentos
- ✅ Dados em tempo real

### 4. Recuperar Nossos PNRs

```bash
GET /v1/booking/flight-orders/{orderId}
```

**Resposta:**
- ✅ Apenas PNRs criados por nós
- ❌ Não recupera PNRs da GOL

---

## ❌ O que NÃO conseguimos fazer

### Buscar Reserva Externa por PNR

```bash
# ❌ NÃO FUNCIONA
GET /v1/booking/flight-orders?recordLocator=PDCDX&lastName=Diniz
```

**Por que não funciona:**
- PNR `PDCDX` não foi criado por nossa conta
- Não está no nosso Office ID
- Sistema não permite acesso cruzado

### Acessar PNRs de Outras Agências

```bash
# ❌ NÃO FUNCIONA
Buscar qualquer PNR criado por:
- Site da GOL
- Site da LATAM
- Outras agências de viagem
- Consolidadores
```

---

## 🔐 Segurança e Isolamento

### Por que o GDS bloqueia isso?

**Motivos de segurança:**
- 🔒 Privacidade de dados de passageiros
- 🔒 Proteção de informações comerciais
- 🔒 Compliance com LGPD/GDPR
- 🔒 Prevenir fraudes e acessos não autorizados

**Cada agência só vê:**
- Seus próprios PNRs
- Reservas criadas por seu Office ID
- Dados de seus clientes

---

## 💡 Soluções Alternativas

### Opção 1: Upgrade para Amadeus Enterprise (Complexo)

**Requisitos:**
- Acreditação como agência de viagens (IATA)
- Contrato Enterprise com Amadeus
- Investimento significativo (R$ 10.000+ mensais)
- Processo de 3-6 meses

**Mesmo assim:**
- ⚠️ Não garante acesso a PNRs externos
- ⚠️ Precisaria de acordo com cada companhia aérea
- ⚠️ GOL precisaria autorizar acesso aos seus PNRs

**Conclusão:** ❌ Não recomendado para nosso caso de uso

### Opção 2: API Oficial da GOL (Ideal, mas difícil)

**Vantagens:**
- ✅ Acesso direto aos PNRs da GOL
- ✅ Busca por localizador + sobrenome
- ✅ Dados em tempo real
- ✅ Suporte oficial

**Desvantagens:**
- ❌ Requer parceria comercial
- ❌ GOL precisa aprovar
- ❌ Pode ter custos
- ❌ Processo demorado

**Como proceder:**
1. Contatar GOL Corporativo
2. Explicar caso de uso
3. Negociar acesso à API B2B
4. Assinar contrato

**Contato:** https://www.voegol.com.br/pt/informacoes/fale-com-a-gol

### Opção 3: Cadastro Manual + Monitoramento Amadeus (Recomendado)

**Como funciona:**

1. **Usuário acessa site da GOL**
   - URL: https://b2c.voegol.com.br/minhas-viagens/encontrar-viagem
   - Insere: Localizador (PDCDX) + Sobrenome (Diniz) + Origem (SLZ)
   - Visualiza dados da reserva

2. **Usuário cadastra no ReservaSegura**
   - Formulário inteligente
   - Campos: Número do voo, horários, localizador (referência)
   - Sistema valida número do voo via Amadeus

3. **Sistema monitora automaticamente**
   - Usa Amadeus Schedule API para monitorar voo
   - Detecta mudanças: atrasos, cancelamentos, portões
   - Envia notificações ao usuário

**Fluxo completo:**
```
Usuário
  ↓ Consulta manualmente no site GOL
GOL Website (PDCDX, Diniz, SLZ)
  ↓ Visualiza dados
Usuário copia dados
  ↓ Cadastra no ReservaSegura
ReservaSegura
  ↓ Valida número do voo G31413 via Amadeus
Amadeus GDS
  ↓ Confirma voo existe
ReservaSegura
  ↓ Ativa monitoramento automático
Sistema monitora G31413 continuamente
  ↓ Detecta mudanças
Notifica usuário via email/push
```

**Vantagens:**
- ✅ Funciona 100% do tempo
- ✅ Não viola termos de serviço
- ✅ Usa Amadeus para monitoramento (nosso GDS)
- ✅ Sem risco de bloqueio
- ✅ Implementação rápida (1-2 dias)
- ✅ Melhor UX (usuário tem controle)

**Implementação:**

**Frontend:**
```tsx
<BookingRegisterModal>
  <HelpText>
    Consulte sua reserva em:
    <Link href="https://b2c.voegol.com.br/minhas-viagens/encontrar-viagem">
      Site da GOL
    </Link>
  </HelpText>

  <Form>
    <Input label="Localizador/PNR" placeholder="PDCDX" />
    <Input label="Número do Voo" placeholder="G31413" required />
    <Input label="Origem" placeholder="SLZ" required />
    <Input label="Destino" placeholder="CGH" required />
    <DatePicker label="Data do Voo" required />
    <TimePicker label="Horário Partida" required />
    <TimePicker label="Horário Chegada" required />
    <Button>Cadastrar e Monitorar</Button>
  </Form>
</BookingRegisterModal>
```

**Backend:**
```typescript
async registerBookingForMonitoring(data: {
  pnr: string;           // PDCDX (apenas referência)
  flightNumber: string;  // G31413
  origin: string;        // SLZ
  destination: string;   // CGH
  date: string;
  departureTime: string;
  arrivalTime: string;
  userId: string;
}) {
  // 1. Validar voo via Amadeus
  const flightExists = await amadeusService.searchFlightByNumber(
    data.flightNumber,
    data.date
  );

  if (!flightExists) {
    throw new Error('Voo não encontrado');
  }

  // 2. Criar registro no banco
  const booking = await prisma.bookingMonitor.create({
    data: {
      pnr: data.pnr,
      flightNumber: data.flightNumber,
      origin: data.origin,
      destination: data.destination,
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      userId: data.userId,
      monitoringEnabled: true,
    }
  });

  // 3. Ativar monitoramento automático
  await monitoringService.startMonitoring(booking.id);

  return booking;
}
```

**Monitoramento (já implementado):**
```typescript
// Worker roda a cada 5 minutos
setInterval(async () => {
  const activeBookings = await prisma.bookingMonitor.findMany({
    where: { monitoringEnabled: true }
  });

  for (const booking of activeBookings) {
    // Buscar status atual via Amadeus
    const currentStatus = await amadeusService.getFlightStatus(
      booking.flightNumber.substring(0, 2),
      booking.flightNumber.substring(2),
      booking.date
    );

    // Comparar com dados anteriores
    const changes = detectChanges(booking, currentStatus);

    if (changes.length > 0) {
      // Notificar usuário
      await notificationService.send(booking.userId, {
        title: `Mudança no voo ${booking.flightNumber}`,
        body: changes.join('\n')
      });

      // Atualizar banco
      await prisma.bookingMonitor.update({
        where: { id: booking.id },
        data: { lastStatus: currentStatus }
      });
    }
  }
}, 5 * 60 * 1000); // 5 minutos
```

---

## 📋 Comparação de Soluções

| Solução | Custo | Tempo | Viabilidade | Recomendação |
|---------|-------|-------|-------------|--------------|
| **Amadeus Enterprise** | R$ 10k+/mês | 3-6 meses | ⚠️ Baixa | ❌ Não |
| **API Oficial GOL** | Variável | 2-4 meses | ⚠️ Média | ⏳ Futuro |
| **Cadastro Manual + Monitoramento** | R$ 0 | 1-2 dias | ✅ Alta | ✅ **SIM** |
| **Web Scraping GOL** | R$ 0 | 2-3 dias | ⚠️ Média | ❌ Não (riscos) |

---

## 🎯 Recomendação Final

### ✅ Implementar: Cadastro Manual Assistido + Monitoramento via Amadeus

**Por quê:**
1. **Usa o Amadeus que já temos** - para monitoramento de voos
2. **Funciona com qualquer companhia** - não depende de API específica
3. **Rápido de implementar** - 1-2 dias de desenvolvimento
4. **Melhor UX** - usuário tem controle total
5. **Sem custos adicionais** - usa infraestrutura existente
6. **Escalável** - funciona para GOL, LATAM, Azul, etc.

**Fluxo do usuário:**
1. Acessa site da companhia (GOL, LATAM, etc.)
2. Consulta sua reserva manualmente
3. Volta ao ReservaSegura
4. Cadastra dados do voo
5. Sistema valida via Amadeus
6. Monitoramento automático ativado
7. Recebe notificações de mudanças

**O que o Amadeus faz:**
- ✅ Valida que o voo existe
- ✅ Monitora status em tempo real
- ✅ Detecta atrasos, cancelamentos, mudanças
- ✅ Fornece dados atualizados

**O que o Amadeus NÃO faz:**
- ❌ Buscar o PNR original da companhia
- ❌ Acessar dados da reserva inicial

**Mas não precisamos!** O usuário fornece os dados uma vez, e monitoramos tudo a partir daí.

---

## 📝 Status Atual

### Amadeus API (Já configurado)

| Recurso | Status | Observação |
|---------|--------|------------|
| Credenciais | ✅ Configuradas | API Key + Secret em produção |
| Busca de Voos | ✅ Funcionando | `/v2/shopping/flight-offers` |
| Status de Voo | ✅ Funcionando | `/v2/schedule/flights` |
| Criar Reservas | ✅ Funcionando | `/v1/booking/flight-orders` |
| **Buscar PNR Externo** | ❌ **Não suportado** | Self-Service não permite |

### Próximos Passos

- [ ] Implementar formulário de cadastro manual
- [ ] Integrar validação de voo via Amadeus
- [ ] Ativar monitoramento automático
- [ ] Testar com voo real (G31413)
- [ ] Documentar processo para usuário

---

## 🔗 Links Úteis

- **Amadeus Developers:** https://developers.amadeus.com/self-service
- **Amadeus API Docs:** https://developers.amadeus.com/self-service/apis-docs
- **Enterprise vs Self-Service:** https://www.altexsoft.com/blog/amadeus-api-integration/
- **Site da GOL:** https://b2c.voegol.com.br/minhas-viagens/encontrar-viagem

---

**Data da Análise:** 2025-11-07
**Status:** ❌ Amadeus Self-Service não suporta PNRs externos
**Recomendação:** ✅ Cadastro manual + Monitoramento via Amadeus
**Tempo de Implementação:** 1-2 dias
