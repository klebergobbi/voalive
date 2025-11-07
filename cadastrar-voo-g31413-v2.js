/**
 * Script para cadastrar voo REAL G31413 no banco de dados
 * Model: BookingMonitor
 * VOO ATIVO: G31413 - GOL - REC → CGH
 * Data: 2025-11-07
 * Status: EM VOO
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cadastrarVooReal() {
  console.log('=== CADASTRANDO VOO REAL G31413 ===\n');

  try {
    // Dados REAIS do voo obtidos da Aviationstack API
    const dadosVoo = {
      // Informações do voo
      flightNumber: 'G31413',
      flightIata: 'G31413',
      flightIcao: 'GLO1413',
      airline: 'GOL',
      airlineIata: 'G3',
      airlineIcao: 'GLO',

      // Origem: Recife
      departureAirport: 'REC',
      departureAirportName: 'Guararapes International',
      departureIcao: 'SBRF',
      departureTerminal: null,
      departureGate: '7',
      departureScheduled: '2025-11-07T10:55:00+00:00',
      departureEstimated: '2025-11-07T10:55:00+00:00',

      // Destino: Congonhas
      arrivalAirport: 'CGH',
      arrivalAirportName: 'Congonhas International Airport',
      arrivalIcao: 'SBSP',
      arrivalTerminal: null,
      arrivalBaggage: '2',
      arrivalScheduled: '2025-11-07T14:25:00+00:00',

      // Status
      status: 'EM VOO',
      flightDate: '2025-11-07',
      flightStatus: 'active',

      // Dados para monitoramento
      pnr: 'G31413TEST',
      passengerName: 'VOO REAL G31413',
      passengerEmail: 'monitor@reservasegura.pro',

      // Observações
      notes: 'Voo real cadastrado para teste de monitoramento. Status: EM VOO (active). Origem: REC, Destino: CGH'
    };

    console.log('📋 Dados do voo:');
    console.log(`   Número: ${dadosVoo.flightNumber}`);
    console.log(`   Companhia: ${dadosVoo.airline} (${dadosVoo.airlineIata})`);
    console.log(`   Rota: ${dadosVoo.departureAirport} → ${dadosVoo.arrivalAirport}`);
    console.log(`   Data: ${dadosVoo.flightDate}`);
    console.log(`   Partida: ${dadosVoo.departureScheduled}`);
    console.log(`   Chegada: ${dadosVoo.arrivalScheduled}`);
    console.log(`   Status: ${dadosVoo.status}`);
    console.log(`   Portão: ${dadosVoo.departureGate || 'N/A'}`);
    console.log(`   Esteira: ${dadosVoo.arrivalBaggage || 'N/A'}`);
    console.log('');

    // Primeiro, verificar se existe um usuário admin
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      throw new Error('Nenhum usuário admin encontrado. Execute create-admin.js primeiro!');
    }

    console.log(`👤 Usando usuário admin: ${adminUser.email}`);
    console.log('');

    // Verificar se existe uma conta conectada
    let account = await prisma.connectedAirlineAccount.findFirst({
      where: {
        userId: adminUser.id,
        airline: 'GOL'
      }
    });

    if (!account) {
      console.log('📝 Criando conta conectada GOL...');
      account = await prisma.connectedAirlineAccount.create({
        data: {
          userId: adminUser.id,
          airline: 'GOL',
          accountEmail: dadosVoo.passengerEmail,
          isActive: true,
          lastSync: new Date()
        }
      });
      console.log(`✅ Conta GOL criada: ${account.id}`);
      console.log('');
    }

    // Verificar se já existe este voo cadastrado
    const existing = await prisma.bookingMonitor.findFirst({
      where: {
        accountId: account.id,
        bookingCode: dadosVoo.pnr
      }
    });

    if (existing) {
      console.log('⚠️  Voo já cadastrado!');
      console.log(`   ID: ${existing.id}`);
      console.log(`   PNR: ${existing.bookingCode}`);
      console.log(`   Status: ${existing.currentStatus}`);
      console.log('');
      console.log('🔄 Atualizando dados do voo...');

      const updated = await prisma.bookingMonitor.update({
        where: { id: existing.id },
        data: {
          currentFlightNumber: dadosVoo.flightNumber,
          currentOrigin: dadosVoo.departureAirport,
          currentDestination: dadosVoo.arrivalAirport,
          currentDepartureTime: new Date(dadosVoo.departureScheduled),
          currentArrivalTime: new Date(dadosVoo.arrivalScheduled),
          currentGate: dadosVoo.departureGate,
          currentStatus: dadosVoo.status,
          monitoringEnabled: true,
          lastCheckedAt: new Date(),
          nextCheckAt: new Date(Date.now() + 5 * 60 * 1000),
          rawData: JSON.stringify({
            airline: dadosVoo.airline,
            airlineIata: dadosVoo.airlineIata,
            flightIata: dadosVoo.flightIata,
            flightIcao: dadosVoo.flightIcao,
            departureAirportName: dadosVoo.departureAirportName,
            arrivalAirportName: dadosVoo.arrivalAirportName,
            arrivalBaggage: dadosVoo.arrivalBaggage,
            flightDate: dadosVoo.flightDate,
            flightStatus: dadosVoo.flightStatus,
            notes: dadosVoo.notes
          })
        }
      });

      console.log('✅ Voo atualizado com sucesso!');
      console.log('');
      console.log('📊 Informações da reserva:');
      console.log(`   ID: ${updated.id}`);
      console.log(`   PNR: ${updated.bookingCode}`);
      console.log(`   Voo: ${updated.currentFlightNumber}`);
      console.log(`   Status: ${updated.currentStatus}`);
      console.log(`   Monitoramento: ${updated.monitoringEnabled ? 'ATIVO' : 'INATIVO'}`);
      console.log(`   Última verificação: ${updated.lastCheckedAt}`);
      console.log(`   Próxima verificação: ${updated.nextCheckAt}`);
      console.log('');
      console.log('🌐 Acesse o dashboard em: https://www.reservasegura.pro/dashboard');
      console.log('🔍 Busque pelo PNR: G31413TEST');
      console.log('');

      return updated;
    }

    // Criar monitoramento de reserva
    const booking = await prisma.bookingMonitor.create({
      data: {
        accountId: account.id,
        userId: adminUser.id,
        bookingCode: dadosVoo.pnr,
        airline: dadosVoo.airline,
        passengerName: dadosVoo.passengerName,
        currentFlightNumber: dadosVoo.flightNumber,
        currentOrigin: dadosVoo.departureAirport,
        currentDestination: dadosVoo.arrivalAirport,
        currentDepartureTime: new Date(dadosVoo.departureScheduled),
        currentArrivalTime: new Date(dadosVoo.arrivalScheduled),
        currentGate: dadosVoo.departureGate,
        currentStatus: dadosVoo.status,
        monitoringEnabled: true,
        checkInterval: 5, // 5 minutos
        lastCheckedAt: new Date(),
        nextCheckAt: new Date(Date.now() + 5 * 60 * 1000),
        rawData: JSON.stringify({
          airline: dadosVoo.airline,
          airlineIata: dadosVoo.airlineIata,
          flightIata: dadosVoo.flightIata,
          flightIcao: dadosVoo.flightIcao,
          departureAirportName: dadosVoo.departureAirportName,
          arrivalAirportName: dadosVoo.arrivalAirportName,
          arrivalBaggage: dadosVoo.arrivalBaggage,
          flightDate: dadosVoo.flightDate,
          flightStatus: dadosVoo.flightStatus,
          notes: dadosVoo.notes
        })
      }
    });

    console.log('✅ Voo cadastrado com sucesso no banco de dados!');
    console.log('');
    console.log('📊 Informações da reserva:');
    console.log(`   ID: ${booking.id}`);
    console.log(`   PNR: ${booking.bookingCode}`);
    console.log(`   Voo: ${booking.currentFlightNumber}`);
    console.log(`   Status: ${booking.currentStatus}`);
    console.log(`   Monitoramento: ${booking.monitoringEnabled ? 'ATIVO' : 'INATIVO'}`);
    console.log(`   Criado em: ${booking.createdAt}`);
    console.log(`   Próxima verificação: ${booking.nextCheckAt}`);
    console.log('');
    console.log('🌐 Acesse o dashboard em: https://www.reservasegura.pro/dashboard');
    console.log('🔍 Busque pelo PNR: G31413TEST');
    console.log('');

    return booking;

  } catch (error) {
    console.error('❌ Erro ao cadastrar voo:', error.message);
    if (error.meta) {
      console.error('Detalhes:', JSON.stringify(error.meta, null, 2));
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
cadastrarVooReal()
  .then(() => {
    console.log('✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Falha:', error);
    process.exit(1);
  });
