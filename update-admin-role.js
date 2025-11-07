/**
 * Script para atualizar role do admin para ADMIN
 * Executar no servidor dentro do container da API
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Atualizando role do usuário admin...\n');

  const updatedUser = await prisma.user.update({
    where: { email: 'admin@reservasegura.pro' },
    data: { role: 'ADMIN' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    }
  });

  console.log('✅ Usuário atualizado com sucesso!');
  console.log(JSON.stringify(updatedUser, null, 2));
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
