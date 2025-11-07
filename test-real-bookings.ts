/**
 * Test Real Bookings
 * Teste com reservas reais para validação do sistema em produção
 */

const testBookings = [
  {
    localizador: 'PDCDX',
    lastName: 'DINIZ',
    origin: 'SLZ',
    description: 'Reserva 1 - São Luís'
  },
  {
    localizador: 'SDWZVF',
    lastName: 'MELLO',
    origin: 'GIG',
    description: 'Reserva 2 - Rio de Janeiro'
  },
  {
    localizador: 'CFIWFV',
    lastName: 'SANTOS',
    origin: 'CGH',
    description: 'Reserva 3 - Congonhas'
  },
  {
    localizador: 'MSFHQJ',
    lastName: 'CORTES',
    origin: 'CNF',
    description: 'Reserva 4 - Confins'
  }
];

async function testRealBookings() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   TESTE DE RESERVAS REAIS - VoaLive Production      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const API_BASE = process.env.API_URL || 'http://localhost:4000';

  for (let i = 0; i < testBookings.length; i++) {
    const booking = testBookings[i];
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 Teste ${i + 1}/4: ${booking.description}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Localizador: ${booking.localizador}`);
    console.log(`   Sobrenome: ${booking.lastName}`);
    console.log(`   Origem: ${booking.origin}`);
    console.log('');

    try {
      const url = `${API_BASE}/api/v2/flights/status?bookingReference=${booking.localizador}&lastName=${booking.lastName}`;
      console.log(`🔍 Buscando: ${url}\n`);

      const startTime = Date.now();
      const response = await fetch(url);
      const duration = Date.now() - startTime;

      const data = await response.json();

      if (response.ok && data.success) {
        console.log(`✅ SUCESSO (${duration}ms)`);
        console.log(`   Status HTTP: ${response.status}`);
        console.log(`   Fonte: ${data.data.source}`);

        if (data.data.metadata) {
          console.log(`   Layer usado: ${data.data.metadata.layerUsed}`);
          console.log(`   Duração total: ${data.data.metadata.totalDuration}ms`);

          // Mostrar tentativas
          const attempts = data.data.metadata.attempts;
          if (attempts) {
            console.log(`\n   Tentativas:`);
            if (attempts.gds.tried) {
              console.log(`     📡 GDS: ${attempts.gds.success ? '✅' : '❌'} (${attempts.gds.duration}ms)${attempts.gds.error ? ` - ${attempts.gds.error}` : ''}`);
            }
            if (attempts.externalAPI.tried) {
              console.log(`     🌐 API Externa: ${attempts.externalAPI.success ? '✅' : '❌'} (${attempts.externalAPI.duration}ms)${attempts.externalAPI.error ? ` - ${attempts.externalAPI.error}` : ''}`);
            }
            if (attempts.scraping.tried) {
              console.log(`     🕷️  Scraping: ${attempts.scraping.success ? '✅' : '❌'} (${attempts.scraping.duration}ms)${attempts.scraping.error ? ` - ${attempts.scraping.error}` : ''}`);
            }
          }
        }

        if (data.data.flight) {
          console.log(`\n   Voo: ${data.data.flight.flightNumber || data.data.flightNumber}`);
          console.log(`   Status Voo: ${data.data.flight.status || data.data.status}`);
          console.log(`   Companhia: ${data.data.flight.airline || data.data.airline} - ${data.data.flight.airlineName || data.data.airlineName || 'N/A'}`);

          const departure = data.data.flight?.departure || data.data.departure;
          const arrival = data.data.flight?.arrival || data.data.arrival;

          if (departure) {
            console.log(`   Saída: ${departure.airport} - ${departure.scheduledTime}`);
            console.log(`   Portão: ${departure.gate || 'N/A'} | Terminal: ${departure.terminal || 'N/A'}`);
          }

          if (arrival) {
            console.log(`   Chegada: ${arrival.airport} - ${arrival.scheduledTime}`);
          }

          if (data.data.delay || data.data.flight?.delay) {
            const delay = data.data.delay || data.data.flight.delay;
            console.log(`   ⚠️  Atraso: ${delay.minutes} minutos`);
            if (delay.reason) console.log(`   Motivo: ${delay.reason}`);
          }
        }

      } else {
        console.log(`❌ FALHA (${duration}ms)`);
        console.log(`   Status HTTP: ${response.status}`);
        console.log(`   Erro: ${data.error || data.message}`);

        if (data.data?.metadata?.attempts) {
          const attempts = data.data.metadata.attempts;
          console.log(`\n   Todas as fontes falharam:`);
          Object.entries(attempts).forEach(([layer, attempt]: [string, any]) => {
            if (attempt.tried) {
              console.log(`     ${layer}: ${attempt.error} (${attempt.duration}ms)`);
            }
          });

          if (data.data.metadata.suggestion) {
            console.log(`\n   💡 Sugestão: ${data.data.metadata.suggestion}`);
          }
          if (data.data.metadata.retryAfter) {
            console.log(`   🔄 Tentar novamente em: ${data.data.metadata.retryAfter}s`);
          }
        }
      }

    } catch (error) {
      console.log(`❌ ERRO DE CONEXÃO`);
      console.error(`   ${error instanceof Error ? error.message : error}`);
    }

    // Aguardar 2 segundos entre testes
    if (i < testBookings.length - 1) {
      console.log(`\n⏳ Aguardando 2 segundos...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║                  TESTE CONCLUÍDO                     ║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);
}

// Run tests
testRealBookings().catch(console.error);
