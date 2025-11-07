/**
 * Testes Práticos - FlightMonitoringService
 * Execute: npx ts-node test-flight-monitoring-service.ts
 */

import { FlightMonitoringService } from './apps/api/src/services/flightMonitoring';
import Redis from 'ioredis';
import Queue from 'bull';

// Configuração
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
});

const monitoringQueue = new Queue('flight-monitoring-test', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
});

const flightMonitor = new FlightMonitoringService(redis, monitoringQueue);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TESTES - FlightMonitoringService');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// =============================================================================
// TESTE 1: getFlightStatusByReservation
// =============================================================================
async function test1_GetFlightStatus() {
  console.log('📝 TESTE 1: getFlightStatusByReservation');
  console.log('─────────────────────────────────────────\n');

  try {
    const bookingRef = 'PDCDX';
    const lastName = 'Silva';

    console.log(`🔍 Buscando voo: ${bookingRef} - ${lastName}`);

    const result = await flightMonitor.getFlightStatusByReservation(
      bookingRef,
      lastName,
      {
        useCache: true,
        ip: '192.168.1.1',
      }
    );

    if (result.success && result.flight) {
      console.log('\n✅ VOO ENCONTRADO:');
      console.log(`   Número: ${result.flight.flightNumber}`);
      console.log(`   Companhia: ${result.flight.airlineName}`);
      console.log(`   Aeronave: ${result.flight.aircraft}`);
      console.log(`   Status: ${result.flight.status}`);
      console.log(`\n   PARTIDA:`);
      console.log(`   ├─ Aeroporto: ${result.flight.departure.airport} (${result.flight.departure.airportName})`);
      console.log(`   ├─ Horário: ${result.flight.departure.scheduledTime}`);
      console.log(`   ├─ Terminal: ${result.flight.departure.terminal || 'N/A'}`);
      console.log(`   └─ Portão: ${result.flight.departure.gate || 'N/A'}`);
      console.log(`\n   CHEGADA:`);
      console.log(`   ├─ Aeroporto: ${result.flight.arrival.airport} (${result.flight.arrival.airportName})`);
      console.log(`   ├─ Horário: ${result.flight.arrival.scheduledTime}`);
      console.log(`   ├─ Terminal: ${result.flight.arrival.terminal || 'N/A'}`);
      console.log(`   └─ Portão: ${result.flight.arrival.gate || 'N/A'}`);

      if (result.flight.delay) {
        console.log(`\n   ⚠️ ATRASO: ${result.flight.delay.minutes} minutos`);
        if (result.flight.delay.reason) {
          console.log(`   Motivo: ${result.flight.delay.reason}`);
        }
      }

      console.log(`\n   📊 METADATA:`);
      console.log(`   ├─ Fonte: ${result.source}`);
      console.log(`   ├─ Estratégia: ${result.metadata?.searchStrategy || 'N/A'}`);
      console.log(`   ├─ Camada: ${result.metadata?.layerUsed || 'N/A'}`);
      console.log(`   └─ Duração: ${result.metadata?.totalDuration || 0}ms`);

      if (result.metadata?.attempts) {
        console.log(`\n   🔍 TENTATIVAS:`);
        const { gds, externalAPI, scraping } = result.metadata.attempts;
        console.log(`   ├─ GDS: ${gds.tried ? (gds.success ? '✅' : '❌') : '⏭️'} ${gds.tried ? `(${gds.duration}ms)` : ''}`);
        console.log(`   ├─ API: ${externalAPI.tried ? (externalAPI.success ? '✅' : '❌') : '⏭️'} ${externalAPI.tried ? `(${externalAPI.duration}ms)` : ''}`);
        console.log(`   └─ Scraping: ${scraping.tried ? (scraping.success ? '✅' : '❌') : '⏭️'} ${scraping.tried ? `(${scraping.duration}ms)` : ''}`);
      }

    } else {
      console.log(`\n❌ ERRO: ${result.error}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Fonte: ${result.source}`);
    }

    console.log('\n✅ TESTE 1 COMPLETO\n');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE 1:', error);
  }
}

// =============================================================================
// TESTE 2: searchAcrossAllLayers com Análise de Fallback
// =============================================================================
async function test2_SearchAcrossLayers() {
  console.log('📝 TESTE 2: searchAcrossAllLayers (Fallback)');
  console.log('─────────────────────────────────────────\n');

  try {
    const bookingRef = 'SDWZVF';
    const lastName = 'Santos';

    console.log(`🔍 Buscando com fallback: ${bookingRef} - ${lastName}`);
    console.log('   Testando todas as 3 camadas...\n');

    const startTime = Date.now();
    const result = await flightMonitor.searchAcrossAllLayers(
      bookingRef,
      lastName,
      'LA' // LATAM
    );
    const totalTime = Date.now() - startTime;

    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   RESULTADO DO FALLBACK CASCADE');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (result.metadata?.attempts) {
      const { gds, externalAPI, scraping } = result.metadata.attempts;

      console.log('   📊 CAMADAS TESTADAS:\n');

      console.log('   1️⃣ Layer 1: GDS (Amadeus/Sabre)');
      console.log(`      Status: ${gds.tried ? (gds.success ? '✅ Sucesso' : '❌ Falhou') : '⏭️ Não tentado'}`);
      if (gds.tried) {
        console.log(`      Tempo: ${gds.duration}ms`);
        if (gds.error) console.log(`      Erro: ${gds.error}`);
      }

      console.log('\n   2️⃣ Layer 2: APIs Comerciais');
      console.log(`      Status: ${externalAPI.tried ? (externalAPI.success ? '✅ Sucesso' : '❌ Falhou') : '⏭️ Não tentado'}`);
      if (externalAPI.tried) {
        console.log(`      Tempo: ${externalAPI.duration}ms`);
        if (externalAPI.error) console.log(`      Erro: ${externalAPI.error}`);
      }

      console.log('\n   3️⃣ Layer 3: Web Scraping');
      console.log(`      Status: ${scraping.tried ? (scraping.success ? '✅ Sucesso' : '❌ Falhou') : '⏭️ Não tentado'}`);
      if (scraping.tried) {
        console.log(`      Tempo: ${scraping.duration}ms`);
        if (scraping.error) console.log(`      Erro: ${scraping.error}`);
      }

      console.log('\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   🎯 CAMADA VENCEDORA: ${result.metadata.layerUsed}`);
      console.log(`   ⏱️ TEMPO TOTAL: ${totalTime}ms`);
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    if (result.success && result.flight) {
      console.log(`   ✅ Voo: ${result.flight.flightNumber}`);
      console.log(`   📍 Rota: ${result.flight.departure.airport} → ${result.flight.arrival.airport}`);
    } else {
      console.log(`   ❌ Todas as camadas falharam`);
    }

    console.log('\n✅ TESTE 2 COMPLETO\n');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE 2:', error);
  }
}

// =============================================================================
// TESTE 3: monitorFlightContinuous
// =============================================================================
async function test3_MonitorContinuous() {
  console.log('📝 TESTE 3: monitorFlightContinuous');
  console.log('─────────────────────────────────────────\n');

  try {
    const bookingRef = 'TEST123';
    const lastName = 'Costa';

    console.log(`🚀 Iniciando monitoramento contínuo...`);
    console.log(`   Reserva: ${bookingRef}`);
    console.log(`   Passageiro: ${lastName}`);
    console.log(`   Intervalo: 5 minutos\n`);

    // Escutar eventos
    flightMonitor.on('monitoring:started', (job) => {
      console.log(`   ✅ Monitoramento iniciado: ${job.id}`);
    });

    flightMonitor.on('flight:change:detected', (change) => {
      console.log(`\n   🔔 MUDANÇA DETECTADA!`);
      console.log(`   ├─ Tipo: ${change.type}`);
      console.log(`   ├─ Campo: ${change.field}`);
      console.log(`   ├─ De: ${change.oldValue}`);
      console.log(`   ├─ Para: ${change.newValue}`);
      console.log(`   ├─ Severidade: ${change.severity}`);
      console.log(`   └─ Timestamp: ${change.timestamp}\n`);
    });

    // Iniciar monitoramento
    const job = await flightMonitor.monitorFlightContinuous(
      bookingRef,
      lastName,
      {
        intervalMinutes: 5,
        notifyOnChange: true,
        notifyOnDelay: true,
        notifyOnGateChange: true,
        notifyChannels: ['email', 'push'],
        autoStop: {
          afterDeparture: true,
          afterMinutes: 30
        }
      }
    );

    console.log('   📊 JOB CRIADO:');
    console.log(`   ├─ ID: ${job.id}`);
    console.log(`   ├─ Status: ${job.status}`);
    console.log(`   ├─ Iniciado: ${job.startedAt}`);
    console.log(`   ├─ Próxima checagem: ${job.nextCheckAt}`);
    console.log(`   └─ Intervalo: ${job.intervalMinutes} min`);

    if (job.currentFlightStatus?.flight) {
      console.log(`\n   ✈️ STATUS INICIAL DO VOO:`);
      console.log(`   ├─ Voo: ${job.currentFlightStatus.flight.flightNumber}`);
      console.log(`   ├─ Status: ${job.currentFlightStatus.flight.status}`);
      console.log(`   └─ Fonte: ${job.currentFlightStatus.source}`);
    }

    console.log('\n   ⏰ Monitoramento ativo. Aguardando mudanças...');
    console.log('   (Pressione Ctrl+C para parar)\n');

    // Aguardar 30 segundos para demonstração
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Verificar status
    const status = await flightMonitor.getMonitoringStatus(bookingRef, lastName);
    if (status) {
      console.log('   📊 STATUS DO MONITORAMENTO (30s depois):');
      console.log(`   ├─ Checagens: ${status.checksPerformed}`);
      console.log(`   ├─ Mudanças: ${status.changesDetected}`);
      console.log(`   └─ Última checagem: ${status.lastCheckAt}`);
    }

    // Parar monitoramento
    console.log('\n   🛑 Parando monitoramento...');
    const stopped = await flightMonitor.stopMonitoring(bookingRef, lastName);
    console.log(`   ${stopped ? '✅' : '❌'} Monitoramento ${stopped ? 'parado' : 'falhou ao parar'}`);

    console.log('\n✅ TESTE 3 COMPLETO\n');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE 3:', error);
  }
}

// =============================================================================
// TESTE 4: parseReservationDetails
// =============================================================================
async function test4_ParseReservation() {
  console.log('📝 TESTE 4: parseReservationDetails');
  console.log('─────────────────────────────────────────\n');

  try {
    // Dados de reserva simulados
    const rawBooking = {
      bookingCode: 'XYZ789',
      flights: [
        {
          flightNumber: 'G31234',
          origin: 'GRU',
          destination: 'GIG',
          departureDate: '2025-11-20T08:00:00Z',
          airline: 'GOL Linhas Aéreas'
        },
        {
          flightNumber: 'G35678',
          origin: 'GIG',
          destination: 'MAO',
          departureDate: '2025-11-20T14:30:00Z',
          airline: 'GOL Linhas Aéreas'
        }
      ],
      passengers: [
        {
          firstName: 'Maria',
          lastName: 'Costa',
          type: 'ADULT'
        },
        {
          firstName: 'Pedro',
          lastName: 'Costa',
          type: 'CHILD'
        }
      ],
      bookingClass: 'BUSINESS',
      totalAmount: 2500.00
    };

    console.log('   📥 DADOS BRUTOS:');
    console.log(JSON.stringify(rawBooking, null, 2));

    console.log('\n   🔄 Parseando reserva...\n');

    const parsed = flightMonitor.parseReservationDetails(rawBooking);

    console.log('   ✅ DADOS PARSEADOS:\n');
    console.log(`   📋 RESERVA:`);
    console.log(`   ├─ PNR: ${parsed.pnr}`);
    console.log(`   ├─ Companhia: ${parsed.airline} (${parsed.airlineCode})`);
    console.log(`   ├─ Classe: ${parsed.bookingClass}`);
    console.log(`   └─ Valor: R$ ${parsed.totalAmount?.toFixed(2) || 'N/A'}`);

    console.log(`\n   ✈️ VOOS (${parsed.routes.length}):`);
    parsed.routes.forEach((route, i) => {
      console.log(`   ${i + 1}. ${route.flightNumber}: ${route.origin} → ${route.destination}`);
      console.log(`      Data: ${new Date(route.date).toLocaleDateString('pt-BR')}`);
    });

    console.log(`\n   👥 PASSAGEIROS (${parsed.passengers.length}):`);
    parsed.passengers.forEach((pax, i) => {
      console.log(`   ${i + 1}. ${pax.firstName} ${pax.lastName} (${pax.type})`);
    });

    console.log('\n✅ TESTE 4 COMPLETO\n');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE 4:', error);
  }
}

// =============================================================================
// TESTE 5: Cache e Rate Limiting
// =============================================================================
async function test5_CacheAndRateLimit() {
  console.log('📝 TESTE 5: Cache e Rate Limiting');
  console.log('─────────────────────────────────────────\n');

  try {
    const bookingRef = 'CACHE_TEST';
    const lastName = 'Silva';

    // Primeira busca (cache miss)
    console.log('   🔍 Primeira busca (cache miss)...');
    const start1 = Date.now();
    const result1 = await flightMonitor.getFlightStatusByReservation(
      bookingRef,
      lastName,
      { useCache: true, ip: '192.168.1.100' }
    );
    const time1 = Date.now() - start1;
    console.log(`   ├─ Tempo: ${time1}ms`);
    console.log(`   └─ Fonte: ${result1.source}`);

    // Segunda busca (cache hit)
    console.log('\n   🔍 Segunda busca (cache hit esperado)...');
    const start2 = Date.now();
    const result2 = await flightMonitor.getFlightStatusByReservation(
      bookingRef,
      lastName,
      { useCache: true, ip: '192.168.1.100' }
    );
    const time2 = Date.now() - start2;
    console.log(`   ├─ Tempo: ${time2}ms`);
    console.log(`   └─ Fonte: ${result2.source}`);

    const speedup = ((time1 - time2) / time1 * 100).toFixed(2);
    console.log(`\n   📊 GANHO DE PERFORMANCE:`);
    console.log(`   ├─ Primeira busca: ${time1}ms`);
    console.log(`   ├─ Segunda busca: ${time2}ms`);
    console.log(`   └─ Melhoria: ${speedup}%`);

    // Teste de rate limiting (muitas requests rápidas)
    console.log('\n   🚦 Testando rate limiting...');
    const requests = 20;
    let blocked = 0;

    for (let i = 0; i < requests; i++) {
      const result = await flightMonitor.getFlightStatusByReservation(
        bookingRef,
        lastName,
        { useCache: true, ip: '192.168.1.100' }
      );

      if (result.status === 'RATE_LIMITED') {
        blocked++;
        console.log(`   ├─ Request ${i + 1}: ⛔ BLOQUEADO (rate limit)`);
      } else {
        console.log(`   ├─ Request ${i + 1}: ✅ OK`);
      }

      // Pequeno delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n   📊 RESULTADO:`);
    console.log(`   ├─ Total de requests: ${requests}`);
    console.log(`   ├─ Bloqueados: ${blocked}`);
    console.log(`   └─ Taxa de bloqueio: ${(blocked / requests * 100).toFixed(2)}%`);

    console.log('\n✅ TESTE 5 COMPLETO\n');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE 5:', error);
  }
}

// =============================================================================
// EXECUTAR TODOS OS TESTES
// =============================================================================
async function runAllTests() {
  try {
    await test1_GetFlightStatus();
    await test2_SearchAcrossLayers();
    await test3_MonitorContinuous();
    await test4_ParseReservation();
    await test5_CacheAndRateLimit();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TODOS OS TESTES COMPLETOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Cleanup
    await redis.quit();
    await monitoringQueue.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
    process.exit(1);
  }
}

// Executar testes
if (require.main === module) {
  runAllTests();
}

export {
  test1_GetFlightStatus,
  test2_SearchAcrossLayers,
  test3_MonitorContinuous,
  test4_ParseReservation,
  test5_CacheAndRateLimit
};
