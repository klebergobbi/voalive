# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReservaSegura is a flight and reservation management system built as a monorepo using Turborepo. The project replicates functionality similar to MilhasPix with modern web technologies.

## Technology Stack

- **Frontend**: Next.js 14+ with TypeScript, App Router
- **Backend**: Node.js with Express and TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS + Custom UI components
- **State Management**: Zustand and React Query
- **Monorepo**: Turborepo

## Project Structure

```
reservasegura/
├── apps/
│   ├── web/         # Next.js frontend application
│   └── api/         # Express backend API
├── packages/
│   ├── ui/          # Shared React components
│   ├── database/    # Prisma schema and client
│   └── types/       # Shared TypeScript types
```

## Development Commands

### Install Dependencies
```bash
npm install
```

### Development
```bash
# Para iniciar tudo (pode ter problemas no WSL)
npm run dev

# Para iniciar apenas o backend (recomendado)
cd apps/api && npm run dev

# Para iniciar frontend de forma robusta
# No Windows (PowerShell):
.\start-frontend.ps1     # Script otimizado para Windows

# No WSL/Linux:
./start-frontend.sh      # Script otimizado para WSL

# Alternativa manual para frontend
cd apps/web
NEXT_TELEMETRY_DISABLED=1 WATCHPACK_POLLING=true NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

### Build
```bash
npm run build            # Build all apps
```

### Database Commands
```bash
cd packages/database
npm run db:generate      # Generate Prisma client
npm run db:push         # Push schema to database
npm run db:migrate      # Run migrations
npm run db:studio       # Open Prisma Studio
```

### Linting & Type Checking
```bash
npm run lint            # Lint all packages
npm run type-check      # Type check all packages
```

## Architecture

### Frontend (apps/web)
- Next.js 14 with App Router
- Server and Client Components
- API routes for authentication
- Tailwind CSS for styling
- Form handling with react-hook-form and Zod

### Backend (apps/api)
- Express server with TypeScript
- RESTful API endpoints
- JWT authentication
- Prisma ORM for database operations
- Request validation with Zod

### Database Schema
Key entities:
- **User**: Authentication and user management
- **Flight**: Flight information and scheduling
- **Booking**: Reservation management
- **Transaction**: Payment processing

### Shared Packages
- **@reservasegura/ui**: Reusable React components
- **@reservasegura/types**: Shared TypeScript types and Zod schemas
- **@reservasegura/database**: Prisma client and database utilities

## Environment Variables

### Frontend (.env.local)
```
PORT=3007
NEXTAUTH_URL=http://localhost:3007
NEXTAUTH_SECRET=your-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/reservasegura
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Backend (.env)
```
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/reservasegura
JWT_SECRET=your-jwt-secret
NODE_ENV=development
```

## Key Features to Implement

1. **Authentication System**: User registration, login, JWT tokens
2. **Flight Management**: Search, list, and manage flights
3. **Booking System**: Create, modify, and cancel reservations
4. **Payment Integration**: Process transactions
5. **Admin Dashboard**: Manage flights, users, and bookings
6. **User Dashboard**: View bookings and transaction history

## Development Tips

1. Use shared types from `@reservasegura/types` for consistency
2. Keep business logic in services, not controllers
3. Use Prisma transactions for complex database operations
4. Implement proper error handling and validation
5. Follow RESTful conventions for API endpoints