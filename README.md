# ReservaSegura - Sistema de Gerenciamento de Voos

ReservaSegura é uma plataforma completa de gerenciamento de voos e reservas, inspirada no MilhasPix, desenvolvida com tecnologias modernas em uma arquitetura monorepo.

## 🚀 Tecnologias

- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Banco de Dados**: PostgreSQL, Prisma ORM
- **Autenticação**: NextAuth.js, JWT
- **Monorepo**: Turborepo

## 📁 Estrutura do Projeto

```
reservasegura/
├── apps/
│   ├── web/         # Aplicação Next.js
│   └── api/         # API Express
├── packages/
│   ├── ui/          # Componentes React compartilhados
│   ├── database/    # Prisma e esquema do banco
│   └── types/       # Tipos TypeScript compartilhados
```

## 🛠️ Instalação

### Pré-requisitos

- Node.js 18+
- PostgreSQL
- npm ou yarn

### Configuração

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/reservasegura.git
cd reservasegura
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:

Crie um arquivo `.env` em `apps/web/` e `apps/api/` baseado nos arquivos `.env.example`

4. Configure o banco de dados:
```bash
cd packages/database
npm run db:push
```

## 🎯 Comandos Principais

### Desenvolvimento
```bash
npm run dev              # Executa todos os apps
npm run dev --filter=web    # Apenas frontend
npm run dev --filter=api    # Apenas backend
```

### Build
```bash
npm run build            # Build de todos os apps
```

### Banco de Dados
```bash
cd packages/database
npm run db:studio       # Abre o Prisma Studio
npm run db:migrate      # Executa migrations
```

## 📋 Funcionalidades

- [ ] Sistema de Autenticação
  - [ ] Cadastro de usuários
  - [ ] Login/Logout
  - [ ] Recuperação de senha

- [ ] Gestão de Voos
  - [ ] Busca de voos
  - [ ] Listagem de voos disponíveis
  - [ ] Detalhes do voo

- [ ] Sistema de Reservas
  - [ ] Criar reserva
  - [ ] Modificar reserva
  - [ ] Cancelar reserva

- [ ] Pagamentos
  - [ ] Processar transações
  - [ ] Histórico de pagamentos

- [ ] Dashboards
  - [ ] Dashboard do usuário
  - [ ] Dashboard administrativo

- [ ] Relatórios
  - [ ] Relatórios de vendas
  - [ ] Análise de ocupação

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT.