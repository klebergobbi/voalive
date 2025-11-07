#!/bin/bash
echo "🔧 Corrigindo imports do PrismaClient..."

# Arquivos para corrigir
FILES=(
  "apps/api/src/controllers/auth.controller.ts"
  "apps/api/src/controllers/booking.controller.ts"
  "apps/api/src/controllers/flight.controller.ts"
  "apps/api/src/controllers/transaction.controller.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Corrigindo: $file"
    # Substituir import de @prisma/client por @reservasegura/database
    sed -i "s|import { PrismaClient } from '@prisma/client';|import { prisma } from '@reservasegura/database';|g" "$file"
    # Remover linha const prisma = new PrismaClient();
    sed -i "/^const prisma = new PrismaClient();$/d" "$file"
    echo "✅ $file corrigido"
  fi
done

echo "✅ Todos os imports corrigidos!"
