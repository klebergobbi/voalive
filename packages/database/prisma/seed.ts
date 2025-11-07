/**
 * Prisma Database Seeder
 * Cria usuário admin padrão para o sistema
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuário ADMIN
  const adminEmail = 'admin@reservasegura.pro';
  const adminPassword = 'Admin@2024'; // Senha padrão - MUDAR EM PRODUÇÃO

  // Verificar se admin já existe
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingAdmin) {
    console.log('✅ Usuário admin já existe:', adminEmail);
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Administrador',
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('   📧 Email:', adminEmail);
    console.log('   🔑 Senha:', adminPassword);
    console.log('   ⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
  }

  console.log('🌱 Seed concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
