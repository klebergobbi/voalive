/**
 * Script para cadastrar voo REAL G31413 no banco de dados
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
      pnr: 'G31413TEST', // PNR para identificação no sistema
      lastName: 'MONITORAMENTO',
      passengerName: 'VOO REAL G31413',
      passengerEmail: 'monitor@reservasegura.pro',
      passengerPhone: '+5581999999999',

      // Configurações de notificação
      notifications: {
        whatsapp: true,
        email: true,
        sms: false
      },

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

    // Criar reserva no banco
    const booking = await prisma.booking.create({
      data: {
        pnr: dadosVoo.pnr,
        lastName: dadosVoo.lastName,
        flightNumber: dadosVoo.flightNumber,
        airline: dadosVoo.airline,
        departureAirport: dadosVoo.departureAirport,
        arrivalAirport: dadosVoo.arrivalAirport,
        departureTime: new Date(dadosVoo.departureScheduled),
        arrivalTime: new Date(dadosVoo.arrivalScheduled),
        flightDate: new Date(dadosVoo.flightDate),
        status: dadosVoo.status,
        passengerName: dadosVoo.passengerName,
        passengerEmail: dadosVoo.passengerEmail,
        passengerPhone: dadosVoo.passengerPhone,
        departureGate: dadosVoo.departureGate,
        arrivalBaggage: dadosVoo.arrivalBaggage,
        departureTerminal: dadosVoo.departureTerminal,
        arrivalTerminal: dadosVoo.arrivalTerminal,
        notifications: dadosVoo.notifications,
        notes: dadosVoo.notes,
        monitoringEnabled: true,
        lastChecked: new Date()
      }
    });

    console.log('✅ Voo cadastrado com sucesso no banco de dados!');
    console.log('');
    console.log('📊 Informações da reserva:');
    console.log(`   ID: ${booking.id}`);
    console.log(`   PNR: ${booking.pnr}`);
    console.log(`   Voo: ${booking.flightNumber}`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   Monitoramento: ${booking.monitoringEnabled ? 'ATIVO' : 'INATIVO'}`);
    console.log(`   Criado em: ${booking.createdAt}`);
    console.log('');
    console.log('🌐 Acesse o dashboard em: https://www.reservasegura.pro/dashboard');
    console.log('🔍 Busque pelo PNR: G31413TEST');
    console.log('');

    return booking;

  } catch (error) {
    console.error('❌ Erro ao cadastrar voo:', error.message);
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
