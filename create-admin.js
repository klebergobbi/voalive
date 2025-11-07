/**
 * Script para criar usuário administrador no VoaLive/Reserva Segura
 *
 * Uso:
 * node create-admin.js
 *
 * Ou via API em produção:
 * node create-admin.js --api
 */

const mode = process.argv.includes('--api') ? 'api' : 'local';

if (mode === 'local') {
  // Modo local usando Prisma diretamente
  createAdminLocal();
} else {
  // Modo API para produção
  createAdminAPI();
}

async function createAdminLocal() {
  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcryptjs');

  const prisma = new PrismaClient();

  console.log('🔑 Criando usuário administrador (modo local)...\n');

  try {
    const email = 'admin@reservasegura.pro';
    const password = 'Admin@2024!Secure';
    const name = 'Administrador';

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('⚠️  Usuário já existe. Atualizando role para ADMIN...');

      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          role: 'ADMIN',
          isActive: true
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      console.log('\n✅ Usuário atualizado com sucesso!');
      console.log('📧 Email:', updatedUser.email);
      console.log('👤 Nome:', updatedUser.name);
      console.log('🎭 Role:', updatedUser.role);
      console.log('📅 Criado em:', updatedUser.createdAt);

    } else {
      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Criar usuário
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'ADMIN',
          isActive: true
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      console.log('\n✅ Usuário admin criado com sucesso!');
      console.log('📧 Email:', user.email);
      console.log('🔑 Senha:', password);
      console.log('👤 Nome:', user.name);
      console.log('🎭 Role:', user.role);
      console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
    }

    console.log('\n🔗 Acesse: https://www.reservasegura.pro/login');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

function createAdminAPI() {
  const https = require('https');

  const agent = new https.Agent({
    rejectUnauthorized: false
  });

  const data = JSON.stringify({
    email: 'admin@reservasegura.pro',
    password: 'Admin@2024!Secure',
    name: 'Administrador'
  });

  const options = {
    hostname: 'www.reservasegura.pro',
    port: 443,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    },
    agent: agent,
    timeout: 10000
  };

  console.log('🔑 Criando usuário admin via API...\n');

  const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('Status:', res.statusCode, '\n');
      try {
        const json = JSON.parse(responseData);
        console.log('✅ Resposta:');
        console.log(JSON.stringify(json, null, 2));

        if (json.success) {
          console.log('\n✅ Usuário admin criado com sucesso!');
          console.log('📧 Email: admin@reservasegura.pro');
          console.log('🔑 Senha: Admin@2024!Secure');
          console.log('⚠️  IMPORTANTE: Use o script update-admin-role.js para promover a role para ADMIN!');
          console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
        } else {
          console.log('\n⚠️  Aviso:', json.error || json.message);
        }
      } catch (e) {
        console.log('Resposta:', responseData);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Erro:', e.message);
  });

  req.on('timeout', () => {
    req.destroy();
    console.error('❌ Timeout - API não respondeu em 10s');
  });

  req.write(data);
  req.end();
}
