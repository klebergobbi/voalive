# Integração do Sistema de Notificações - Frontend VoaLive

## 📋 Visão Geral

Este documento descreve a integração completa do sistema de notificações e alertas no frontend do VoaLive, conforme implementado no backend (ver `GUIA_USO_NOTIFICACOES.md` na raiz do projeto).

## 🎯 Componentes Implementados

### 1. Hook: `useNotifications`
**Localização:** `apps/web/src/hooks/useNotifications.ts`

Hook React customizado para gerenciar o estado das notificações.

**Funcionalidades:**
- ✅ Buscar notificações não lidas (auto-refresh a cada 30s)
- ✅ Buscar estatísticas de notificações
- ✅ Buscar notificações de uma reserva específica
- ✅ Marcar notificação como lida
- ✅ Marcar todas como lidas
- ✅ Limpar notificações antigas (30+ dias)

**Uso Básico:**
```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const {
    notifications,        // Lista de notificações
    stats,               // Estatísticas
    loading,             // Estado de carregamento
    unreadCount,         // Contador de não lidas
    urgentCount,         // Contador de urgentes
    markAsRead,          // Função para marcar como lida
    refresh              // Função para atualizar manualmente
  } = useNotifications({
    autoRefresh: true,        // Padrão: true
    refreshInterval: 30000    // Padrão: 30 segundos
  });

  return (
    <div>
      <h1>Notificações ({unreadCount})</h1>
      {notifications.map(n => (
        <div key={n.id}>
          <p>{n.message}</p>
          {!n.read && (
            <button onClick={() => markAsRead(n.id)}>
              Marcar como lida
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

### 2. Componente: `NotificationBadge`
**Localização:** `apps/web/src/components/notifications/NotificationBadge.tsx`

Badge de notificações com contador para usar no header/navbar.

**Props:**
- `onClick?: () => void` - Callback ao clicar
- `className?: string` - Classes CSS customizadas
- `showUrgentOnly?: boolean` - Mostrar apenas urgentes

**Exemplo:**
```tsx
import { NotificationBadge } from '@/components/notifications';

<NotificationBadge
  onClick={() => router.push('/notifications')}
  className="ml-4"
/>
```

---

### 3. Componente: `NotificationCard`
**Localização:** `apps/web/src/components/notifications/NotificationCard.tsx`

Cartão individual de notificação com informações detalhadas.

**Props:**
- `notification: Notification` - Objeto de notificação
- `onMarkAsRead?: (id: string) => void` - Callback ao marcar como lida
- `compact?: boolean` - Versão compacta

**Recursos:**
- 🎨 Cores por prioridade (URGENT=vermelho, HIGH=laranja, MEDIUM=amarelo, LOW=azul)
- 📅 Formatação inteligente de datas ("5min atrás", "2h atrás", etc.)
- 🔗 Link de ação para verificar reserva
- 📊 Exibição de metadata (companhia aérea, contador de falhas, data do voo)

---

### 4. Componente: `NotificationList`
**Localização:** `apps/web/src/components/notifications/NotificationList.tsx`

Lista completa de notificações com ações em lote.

**Props:**
- `limit?: number` - Máximo de notificações (padrão: 50)
- `compact?: boolean` - Versão compacta
- `showActions?: boolean` - Mostrar botões de ação (padrão: true)

**Recursos:**
- 🔄 Auto-refresh a cada 30 segundos
- ✅ Marcar todas como lidas
- 🗑️ Limpar notificações antigas
- 🔍 Loading states e error handling

**Exemplo:**
```tsx
import { NotificationList } from '@/components/notifications';

<NotificationList
  limit={100}
  showActions
  compact={false}
/>
```

---

### 5. Componente: `NotificationDropdown`
**Localização:** `apps/web/src/components/notifications/NotificationList.tsx`

Dropdown compacto para usar no header (máximo 10 notificações).

**Props:**
- `onClose?: () => void` - Callback ao fechar

**Exemplo:**
```tsx
import { NotificationDropdown } from '@/components/notifications';

<NotificationDropdown onClose={() => setShowDropdown(false)} />
```

---

### 6. Componente: `BookingNotifications`
**Localização:** `apps/web/src/components/notifications/BookingNotifications.tsx`

Exibe notificações específicas de uma reserva.

**Props:**
- `bookingCode: string` - Código da reserva
- `onMarkAsRead?: (id: string) => void` - Callback
- `compact?: boolean` - Versão compacta

**Exemplo:**
```tsx
import { BookingNotifications } from '@/components/notifications';

<BookingNotifications
  bookingCode="PDCDX"
  compact
/>
```

---

### 7. Componente: `BookingNotificationBadge`
**Localização:** `apps/web/src/components/notifications/BookingNotifications.tsx`

Badge simples que mostra se há notificações para uma reserva.

**Props:**
- `bookingCode: string` - Código da reserva
- `onClick?: () => void` - Callback ao clicar

**Exemplo:**
```tsx
import { BookingNotificationBadge } from '@/components/notifications';

<BookingNotificationBadge
  bookingCode="PDCDX"
  onClick={() => setShowNotifications(true)}
/>
```

---

## 🔌 APIs Utilizadas

Todas as APIs estão documentadas no `GUIA_USO_NOTIFICACOES.md`.

### Base URL
```
https://www.reservasegura.pro/api/notifications
```

### Endpoints Integrados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/notifications?limit=50` | Buscar notificações não lidas |
| GET | `/api/notifications/stats` | Estatísticas de notificações |
| GET | `/api/notifications/booking/:code` | Notificações de uma reserva |
| PATCH | `/api/notifications/:id/read` | Marcar como lida |
| DELETE | `/api/notifications/cleanup` | Limpar antigas (30+ dias) |

---

## 📄 Páginas Implementadas

### 1. Dashboard Principal
**Localização:** `apps/web/src/app/dashboard/page.tsx`

**Integrações:**
- ✅ Módulo "Notificações" na navegação principal
- ✅ Badge com contador de não lidas
- ✅ Lista completa de notificações com prioridades
- ✅ Botão para marcar como lida
- ✅ Link de ação para verificar reserva

### 2. Página de Notificações
**Localização:** `apps/web/src/app/notifications/page.tsx`

**Recursos:**
- 📊 Cards de estatísticas (Total, Não Lidas, Urgentes, Alta Prioridade)
- 📋 Lista completa com NotificationList
- ℹ️ Informações sobre o sistema de monitoramento
- 🔄 Auto-refresh a cada 30 segundos

---

## 🎨 Estrutura de Prioridades

Conforme definido no backend:

| Prioridade | Cor | Ícone | Condição |
|-----------|-----|-------|----------|
| `URGENT` | 🔴 Vermelho | 🚨 | 20+ falhas OU voo < 24h |
| `HIGH` | 🟠 Laranja | ⚠️ | 10 falhas consecutivas |
| `MEDIUM` | 🟡 Amarelo | ⚡ | 3 falhas consecutivas |
| `LOW` | 🔵 Azul | ℹ️ | - |

---

## 🚀 Como Usar

### 1. Adicionar Badge no Header

```tsx
import { NotificationBadge } from '@/components/notifications';

function Header() {
  const router = useRouter();

  return (
    <header>
      <nav>
        {/* ... outros itens ... */}
        <NotificationBadge
          onClick={() => router.push('/notifications')}
        />
      </nav>
    </header>
  );
}
```

### 2. Criar Dropdown no Header

```tsx
import { useState } from 'react';
import { NotificationBadge, NotificationDropdown } from '@/components/notifications';

function Header() {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header>
      <nav>
        <div className="relative">
          <NotificationBadge onClick={() => setShowDropdown(!showDropdown)} />

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2">
              <NotificationDropdown onClose={() => setShowDropdown(false)} />
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
```

### 3. Exibir Notificações de uma Reserva

```tsx
import { BookingNotifications, BookingNotificationBadge } from '@/components/notifications';

function BookingDetails({ booking }) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-2">
        <h2>Reserva {booking.code}</h2>
        <BookingNotificationBadge
          bookingCode={booking.code}
          onClick={() => setShowNotifications(true)}
        />
      </div>

      {showNotifications && (
        <BookingNotifications
          bookingCode={booking.code}
          onMarkAsRead={(id) => console.log('Marked:', id)}
        />
      )}
    </div>
  );
}
```

---

## 🔔 Fluxo de Notificações

### Backend (Automático)
```
1. Monitor verifica reservas a cada 15 minutos
   ↓
2. Se scraping falhar → incrementa contador
   ↓
3. Se atingir threshold (3, 10, 20 falhas) → cria notificação
   ↓
4. Se voo < 24h → notificação URGENTE imediata
```

### Frontend (Auto-refresh)
```
1. Hook useNotifications faz polling a cada 30 segundos
   ↓
2. Atualiza contador no badge
   ↓
3. Usuário vê notificação no dashboard
   ↓
4. Usuário clica em "Verificar Reserva" → abre site da companhia
   ↓
5. Usuário marca como lida → atualiza estado local + backend
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

```env
# .env.local
NEXT_PUBLIC_API_URL=https://www.reservasegura.pro
```

### Customizar Intervalo de Refresh

```tsx
// Padrão: 30 segundos
const { notifications } = useNotifications({
  autoRefresh: true,
  refreshInterval: 60000 // 1 minuto
});
```

---

## 🧪 Testando a Integração

### 1. Verificar se o hook está funcionando

```bash
# Abra o console do navegador em /dashboard
# Deve ver logs:
[useNotifications] Buscando notificações...
[useNotifications] X notificações carregadas
```

### 2. Forçar criação de notificação (para teste)

Consulte o `GUIA_USO_NOTIFICACOES.md` na raiz do projeto, seção **Cenários de Teste**.

```bash
# Exemplo: Forçar 3 falhas em uma reserva
ssh root@159.89.80.179
docker exec voalive-postgres-dev psql -U reservasegura_user -d reservasegura_dev -c \
  "UPDATE \"ExternalBooking\"
   SET \"scrapingFailures\" = 3
   WHERE \"bookingCode\" = 'PDCDX';"
```

Aguardar até 30 segundos e verificar no dashboard se a notificação apareceu.

---

## 📊 Estatísticas Disponíveis

O hook `useNotifications` retorna as seguintes estatísticas via `stats`:

```typescript
{
  total: 5,              // Total de notificações
  unread: 2,             // Não lidas
  read: 3,               // Lidas
  byPriority: [          // Agrupado por prioridade
    { priority: 'URGENT', _count: 1 },
    { priority: 'HIGH', _count: 1 },
    { priority: 'MEDIUM', _count: 2 },
    { priority: 'LOW', _count: 1 }
  ],
  byType: [              // Agrupado por tipo
    { type: 'SCRAPING_FAILED', _count: 3 },
    { type: 'MANUAL_CHECK_REQUIRED', _count: 2 }
  ]
}
```

---

## 🔒 Segurança

- ✅ Componentes protegidos com `<AuthGuard>`
- ✅ Tokens armazenados em localStorage (considerar migrar para httpOnly cookies)
- ✅ URLs de ação sempre apontam para sites oficiais das companhias
- ✅ Sanitização de mensagens (sem HTML injection)

---

## 🎯 Próximos Passos (Melhorias Futuras)

- [ ] WebSocket para notificações em tempo real (substituir polling)
- [ ] Push notifications (Web Push API)
- [ ] Filtros por prioridade na página de notificações
- [ ] Som de alerta para notificações urgentes
- [ ] Notificações no sistema operacional (Desktop Notifications)
- [ ] Paginação para mais de 100 notificações
- [ ] Busca/filtro por código de reserva

---

## 📚 Referências

- **Backend:** `GUIA_USO_NOTIFICACOES.md` (raiz do projeto)
- **APIs:** [Base URL]/api/notifications
- **Monitoramento:** SimpleBookingMonitor (backend)
- **Documentação React:** https://react.dev
- **Lucide Icons:** https://lucide.dev

---

## 🐛 Troubleshooting

### Notificações não aparecem

1. Verificar se o backend está rodando:
```bash
curl https://www.reservasegura.pro/api/notifications/stats
```

2. Verificar logs do hook no console do navegador

3. Verificar variável de ambiente `NEXT_PUBLIC_API_URL`

### Badge não atualiza

- Hook tem auto-refresh a cada 30s
- Forçar refresh manual: `refresh()`
- Verificar se há erros no console

### Erro CORS

Verificar se o backend permite requisições do domínio do frontend.

---

**✅ Integração Completa e Funcional!**

Para mais informações sobre o backend, consulte `GUIA_USO_NOTIFICACOES.md` na raiz do projeto.
