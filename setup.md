# ReservaSegura - Setup Instructions

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3002
- Backend: http://localhost:4000

## 📋 Features Implemented

✅ **Dashboard Principal**
- Navbar superior com abas: "Todos", "Próximos voos", "Pendentes", "Check-in Aberto", "Check-in Fechado", "Voados"
- Contadores dinâmicos para cada categoria
- Campo de pesquisa com filtros por empresa aérea

✅ **Tabela Principal**
- EMPRESA (logos das companhias Azul, LATAM, GOL)
- STATUS (badges coloridos: CONFIRMADO, SCHEDULED, DELAYED, etc.)
- NOME (editável inline)
- LOCALIZADOR
- SOBRENOME
- CHECK-IN (status FECHADO/ABERTO com badges)
- ROTA (com ícones de avião e códigos IATA)
- EMBARQUE (data/hora formatada)
- AÇÕES (checkboxes e botão delete)

✅ **Interface Moderna**
- Design com cores azuis (#0EA5E9, #0284C7)
- Sidebar com ícones de navegação
- Avatar do usuário no header
- Botão flutuante "+" no canto direito
- Responsividade completa

✅ **Funcionalidades**
- Sistema de filtros por empresa aérea
- Pesquisa por nome, localizador ou destino
- Contadores dinâmicos nas abas
- Edição inline de nomes
- Seleção múltipla com checkboxes
- Status coloridos para check-in e voos

## 🏗️ Arquitetura

- **Monorepo**: Turborepo para gerenciar múltiplas aplicações
- **Frontend**: Next.js 14 com App Router
- **Componentes**: Sistema de design próprio baseado em Radix UI
- **Tipagem**: TypeScript com validação Zod
- **Estilo**: Tailwind CSS customizado

## 📁 Estrutura

```
reservasegura/
├── apps/
│   ├── web/                 # Next.js Dashboard
│   └── api/                 # Express Backend (preparado)
├── packages/
│   ├── ui/                  # Componentes React
│   ├── database/            # Prisma (preparado)
│   └── types/               # Types + Validação
```

## 🛠️ Próximos Passos

1. **Backend Integration**: Conectar com APIs reais
2. **Database**: Configurar PostgreSQL e Prisma
3. **Authentication**: Implementar NextAuth.js
4. **Forms**: Modais para adicionar/editar voos
5. **Real-time**: WebSocket para updates em tempo real

Acesse http://localhost:3002/dashboard para ver o sistema completo funcionando!