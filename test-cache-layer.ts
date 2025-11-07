/**
 * Test Cache Layer - Practical Examples
 *
 * Este arquivo demonstra o uso completo do CacheLayer com todos os recursos:
 * 1. Cache básico com TTL
 * 2. Distributed locks
 * 3. Histórico de mudanças
 * 4. Rate limiting
 */

import Redis from 'ioredis';
import { getCacheLayer } from './apps/api/src/services/flightMonitoring/cacheLayer';
import type { FlightStatus } from './apps/api/src/services/flightMonitoring/types';

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
});

const cache = getCacheLayer(redis, {
  ttl: 600,                   // 10 minutos
  lockTTL: 30,                // 30 segundos
  maxHistory: 50,             // 50 entradas
  enableRateLimiting: true,
  rateLimitWindow: 60,        // 1 minuto
  rateLimitMax: 10,           // 10 requests/min
});

// =============================================================================
// MOCK DATA
// =============================================================================

const mockFlightStatus: FlightStatus = {
  success: true,
  found: true,
  source: 'SCRAPING',
  airline: 'LATAM',
  bookingReference: 'ABC123',
  passenger: {
    lastName: 'SILVA',
    firstName: 'JOAO',
  },
  flight: {
    number: 'LA3090',
    airline: 'LATAM',
    status: 'ON_TIME',
    departure: {
      airport: 'GRU',
      terminal: '2',
      gate: '5',
      scheduled: new Date('2025-11-01T14:00:00Z'),
      estimated: new Date('2025-11-01T14:00:00Z'),
    },
    arrival: {
      airport: 'CGH',
      terminal: '1',
      scheduled: new Date('2025-11-01T15:00:00Z'),
      estimated: new Date('2025-11-01T15:00:00Z'),
    },
  },
  timestamp: new Date(),
};

// =============================================================================
// TEST 1: CACHE BÁSICO COM TTL
// =============================================================================

async function test1_BasicCache() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 1: Cache Básico com TTL');
  console.log('='.repeat(70));

  const bookingRef = 'ABC123';
  const lastName = 'SILVA';

  try {
    // 1. Verificar se existe no cache
    console.log('\n1️⃣ Verificando cache...');
    let cached = await cache.get(bookingRef, lastName);

    if (cached) {
      console.log('✅ Cache HIT!');
      console.log(`   Last Update: ${cached.lastUpdate}`);
      console.log(`   Hit Count: ${cached.hitCount}`);
      console.log(`   TTL: ${await cache.getTTL(bookingRef, lastName)}s`);
    } else {
      console.log('❌ Cache MISS - Buscando dados...');

      // 2. Buscar dados (simulado)
      console.log('\n2️⃣ Salvando no cache (TTL: 600s)...');
      await cache.set(bookingRef, lastName, mockFlightStatus, {
        ttl: 600,
        attempts: 1,
      });

      console.log('✅ Dados salvos no cache!');
    }

    // 3. Ler do cache novamente
    console.log('\n3️⃣ Lendo do cache novamente...');
    cached = await cache.get(bookingRef, lastName);

    if (cached) {
      console.log('✅ Cache HIT!');
      console.log(`   Flight: ${cached.status.flight?.number}`);
      console.log(`   Status: ${cached.status.flight?.status}`);
      console.log(`   Source: ${cached.source}`);
      console.log(`   Hit Count: ${cached.hitCount}`);
    }

    // 4. Verificar TTL
    console.log('\n4️⃣ Informações do cache:');
    const ttl = await cache.getTTL(bookingRef, lastName);
    console.log(`   TTL Restante: ${ttl}s (${(ttl / 60).toFixed(1)} minutos)`);
    console.log(`   Expira em: ${new Date(Date.now() + ttl * 1000).toISOString()}`);

    // 5. Estender TTL
    console.log('\n5️⃣ Estendendo TTL para 900s (15 min)...');
    await cache.refreshTTL(bookingRef, lastName, 900);
    const newTTL = await cache.getTTL(bookingRef, lastName);
    console.log(`✅ Novo TTL: ${newTTL}s`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// =============================================================================
// TEST 2: DISTRIBUTED LOCKS
// =============================================================================

async function test2_DistributedLocks() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 2: Distributed Locks (Evitar Requisições Duplicadas)');
  console.log('='.repeat(70));

  const bookingRef = 'DEF456';
  const lastName = 'SANTOS';

  try {
    // 1. Verificar se está locked
    console.log('\n1️⃣ Verificando lock...');
    const isLocked = await cache.isLocked(bookingRef, lastName);
    console.log(`   Locked: ${isLocked ? '🔒 Sim' : '🔓 Não'}`);

    // 2. Adquirir lock
    console.log('\n2️⃣ Tentando adquirir lock...');
    const acquired = await cache.acquireLock(bookingRef, lastName, 30);

    if (acquired) {
      console.log('✅ Lock adquirido com sucesso! (TTL: 30s)');

      // 3. Tentar adquirir novamente (deve falhar)
      console.log('\n3️⃣ Tentando adquirir lock novamente...');
      const acquired2 = await cache.acquireLock(bookingRef, lastName);

      if (!acquired2) {
        console.log('⏳ Lock já existe (esperado!)');
      }

      // 4. Simular operação demorada
      console.log('\n4️⃣ Executando operação (3 segundos)...');
      await sleep(3000);
      console.log('✅ Operação concluída!');

      // 5. Liberar lock
      console.log('\n5️⃣ Liberando lock...');
      await cache.releaseLock(bookingRef, lastName);
      console.log('✅ Lock liberado!');

    } else {
      console.log('⏳ Lock já existe - Aguardando liberação...');
      const released = await cache.waitForLock(bookingRef, lastName, 10000);

      if (released) {
        console.log('✅ Lock foi liberado!');
      }
    }

    // 6. Usar executeWithLock (recomendado)
    console.log('\n6️⃣ Usando executeWithLock (método recomendado)...');
    const result = await cache.executeWithLock(
      bookingRef,
      lastName,
      async () => {
        console.log('   🔒 Lock adquirido automaticamente');
        console.log('   ⏳ Executando operação...');
        await sleep(2000);

        // Salvar no cache
        await cache.set(bookingRef, lastName, {
          ...mockFlightStatus,
          bookingReference: bookingRef,
          passenger: {
            ...mockFlightStatus.passenger!,
            lastName: lastName,
          },
        });

        console.log('   ✅ Operação concluída');
        console.log('   🔓 Lock será liberado automaticamente');
        return 'Success';
      },
      { lockTTL: 30, maxWait: 10000 }
    );

    console.log(`✅ Resultado: ${result}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// =============================================================================
// TEST 3: HISTÓRICO DE MUDANÇAS
// =============================================================================

async function test3_HistoryTracking() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 3: Histórico de Mudanças');
  console.log('='.repeat(70));

  const bookingRef = 'GHI789';
  const lastName = 'OLIVEIRA';

  try {
    // 1. Criar primeira entrada
    console.log('\n1️⃣ Criando entrada inicial (ON_TIME)...');
    const status1 = { ...mockFlightStatus };
    await cache.addToHistory(bookingRef, lastName, status1);
    console.log('✅ Entrada adicionada ao histórico');

    await sleep(1000);

    // 2. Criar segunda entrada (DELAYED)
    console.log('\n2️⃣ Atualizando status (DELAYED - 30 min)...');
    const status2 = {
      ...mockFlightStatus,
      flight: {
        ...mockFlightStatus.flight!,
        status: 'DELAYED',
        delay: {
          minutes: 30,
          reason: 'Weather conditions',
        },
      },
    };
    await cache.addToHistory(bookingRef, lastName, status2, [
      'Status changed: ON_TIME → DELAYED',
      'Delay: 30 minutes',
    ]);
    console.log('✅ Mudança registrada no histórico');

    await sleep(1000);

    // 3. Criar terceira entrada (Gate change)
    console.log('\n3️⃣ Mudança de portão (5 → 7)...');
    const status3 = {
      ...status2,
      flight: {
        ...status2.flight!,
        departure: {
          ...status2.flight!.departure,
          gate: '7',
        },
      },
    };
    await cache.addToHistory(bookingRef, lastName, status3, [
      'Gate changed: 5 → 7',
    ]);
    console.log('✅ Mudança de portão registrada');

    // 4. Obter histórico completo
    console.log('\n4️⃣ Obtendo histórico completo...');
    const history = await cache.getHistory(bookingRef, lastName, 10);
    console.log(`✅ ${history.length} entradas encontradas:\n`);

    history.forEach((entry, idx) => {
      console.log(`   ${idx + 1}. ${entry.timestamp.toISOString()}`);
      console.log(`      Status: ${entry.status.flight?.status}`);
      console.log(`      Gate: ${entry.status.flight?.departure.gate}`);
      console.log(`      Delay: ${entry.status.flight?.delay?.minutes || 0} min`);
      if (entry.changes.length > 0) {
        console.log(`      Changes:`);
        entry.changes.forEach(change => console.log(`        - ${change}`));
      }
      console.log();
    });

    // 5. Detectar mudanças automaticamente
    console.log('5️⃣ Detectando mudanças entre últimas 2 entradas...');
    const changes = await cache.getChanges(bookingRef, lastName);

    if (changes.length > 0) {
      console.log('✅ Mudanças detectadas:');
      changes.forEach(change => console.log(`   - ${change}`));
    } else {
      console.log('ℹ️  Nenhuma mudança detectada');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// =============================================================================
// TEST 4: RATE LIMITING
// =============================================================================

async function test4_RateLimiting() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 4: Rate Limiting (10 requests/min)');
  console.log('='.repeat(70));

  const ip = '192.168.1.100';
  const userId = 'user-123';

  try {
    // 1. Verificar limite inicial
    console.log('\n1️⃣ Verificando rate limit inicial...');
    const initialLimit = await cache.checkRateLimit(ip, 'ip');
    console.log(`   IP: ${ip}`);
    console.log(`   Remaining: ${initialLimit.remaining}/10`);
    console.log(`   Reset at: ${initialLimit.resetAt.toISOString()}`);
    console.log(`   Blocked: ${initialLimit.blocked ? '🚫 Sim' : '✅ Não'}`);

    // 2. Simular 8 requisições
    console.log('\n2️⃣ Simulando 8 requisições...');
    for (let i = 1; i <= 8; i++) {
      const limit = await cache.checkRateLimit(ip, 'ip');

      if (!limit.blocked) {
        await cache.incrementRateLimit(ip, 'ip');
        console.log(`   ✅ Request ${i}/10 - Remaining: ${limit.remaining}`);
      } else {
        console.log(`   🚫 Request ${i}/10 - BLOCKED!`);
        break;
      }

      await sleep(100);
    }

    // 3. Verificar status atual
    console.log('\n3️⃣ Status atual do rate limit:');
    const currentLimit = await cache.checkRateLimit(ip, 'ip');
    console.log(`   Remaining: ${currentLimit.remaining}/10`);
    console.log(`   Blocked: ${currentLimit.blocked ? '🚫 Sim' : '✅ Não'}`);

    // 4. Tentar mais 3 requisições (deve bloquear na 3ª)
    console.log('\n4️⃣ Tentando mais 3 requisições...');
    for (let i = 9; i <= 11; i++) {
      const limit = await cache.checkRateLimit(ip, 'ip');

      if (!limit.blocked) {
        await cache.incrementRateLimit(ip, 'ip');
        console.log(`   ✅ Request ${i}/10 - Remaining: ${limit.remaining}`);
      } else {
        const resetIn = Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000);
        console.log(`   🚫 Request ${i}/10 - BLOCKED!`);
        console.log(`   ⏰ Reset em ${resetIn}s (${limit.resetAt.toISOString()})`);
        break;
      }

      await sleep(100);
    }

    // 5. Rate limit por usuário
    console.log('\n5️⃣ Rate limit por usuário...');
    const userLimit1 = await cache.checkRateLimit(userId, 'user');
    console.log(`   User ID: ${userId}`);
    console.log(`   Remaining: ${userLimit1.remaining}/10`);

    await cache.incrementRateLimit(userId, 'user');
    await cache.incrementRateLimit(userId, 'user');
    await cache.incrementRateLimit(userId, 'user');

    const userLimit2 = await cache.checkRateLimit(userId, 'user');
    console.log(`   Após 3 requests: ${userLimit2.remaining}/10`);

    // 6. Reset manual
    console.log('\n6️⃣ Reset manual do rate limit...');
    await cache.resetRateLimit(ip, 'ip');
    const resetLimit = await cache.checkRateLimit(ip, 'ip');
    console.log(`✅ Rate limit resetado!`);
    console.log(`   Remaining: ${resetLimit.remaining}/10`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// =============================================================================
// TEST 5: ESTATÍSTICAS E MONITORAMENTO
// =============================================================================

async function test5_Statistics() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 5: Estatísticas e Monitoramento');
  console.log('='.repeat(70));

  try {
    // 1. Gerar algum tráfego
    console.log('\n1️⃣ Gerando tráfego no cache...');

    const bookings = [
      { ref: 'TEST001', last: 'SILVA' },
      { ref: 'TEST002', last: 'SANTOS' },
      { ref: 'TEST003', last: 'OLIVEIRA' },
    ];

    for (const booking of bookings) {
      // Set
      await cache.set(booking.ref, booking.last, {
        ...mockFlightStatus,
        bookingReference: booking.ref,
      });

      // Get (hit)
      await cache.get(booking.ref, booking.last);
      await cache.get(booking.ref, booking.last);

      // Get miss
      await cache.get('NOTFOUND', 'NOTFOUND');
    }

    console.log('✅ Tráfego gerado');

    // 2. Obter estatísticas
    console.log('\n2️⃣ Estatísticas do cache:');
    const stats = await cache.getStats();

    console.log(`   Total Hits: ${stats.totalHits}`);
    console.log(`   Total Misses: ${stats.totalMisses}`);
    console.log(`   Hit Rate: ${stats.hitRate.toFixed(2)}%`);
    console.log(`   Total Keys: ${stats.totalKeys}`);
    console.log(`   Memory Usage: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Avg TTL: ${stats.avgTTL.toFixed(0)}s`);

    // 3. Cache warming
    console.log('\n3️⃣ Cache warming (pré-carregar dados)...');
    const warmData = [
      { bookingReference: 'WARM001', lastName: 'COSTA', status: mockFlightStatus },
      { bookingReference: 'WARM002', lastName: 'PEREIRA', status: mockFlightStatus },
      { bookingReference: 'WARM003', lastName: 'ALMEIDA', status: mockFlightStatus },
    ];

    const warmed = await cache.warmCache(warmData);
    console.log(`✅ ${warmed}/${warmData.length} entradas pré-carregadas`);

    // 4. Listar keys por padrão
    console.log('\n4️⃣ Invalidação por padrão...');
    console.log('   Invalidando keys TEST*...');
    const invalidated = await cache.invalidatePattern('flight:TEST*');
    console.log(`✅ ${invalidated} keys invalidadas`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// =============================================================================
// HELPER
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('\n' + '█'.repeat(70));
  console.log('█' + ' '.repeat(68) + '█');
  console.log('█' + '  🧪 CACHE LAYER - TESTE COMPLETO'.padEnd(68) + '█');
  console.log('█' + ' '.repeat(68) + '█');
  console.log('█'.repeat(70));

  try {
    // Verificar conexão Redis
    console.log('\n🔌 Verificando conexão com Redis...');
    await redis.ping();
    console.log('✅ Redis conectado!');

    // Limpar cache anterior
    console.log('\n🗑️  Limpando cache de testes anteriores...');
    await cache.clearAll();
    await cache.resetStats();
    console.log('✅ Cache limpo!');

    // Executar testes
    await test1_BasicCache();
    await test2_DistributedLocks();
    await test3_HistoryTracking();
    await test4_RateLimiting();
    await test5_Statistics();

    // Estatísticas finais
    console.log('\n' + '='.repeat(70));
    console.log('📊 ESTATÍSTICAS FINAIS');
    console.log('='.repeat(70));

    const finalStats = await cache.getStats();
    console.log(`\n   Total Hits: ${finalStats.totalHits}`);
    console.log(`   Total Misses: ${finalStats.totalMisses}`);
    console.log(`   Hit Rate: ${finalStats.hitRate.toFixed(2)}%`);
    console.log(`   Total Keys: ${finalStats.totalKeys}`);
    console.log(`   Memory Usage: ${(finalStats.memoryUsage / 1024 / 1024).toFixed(2)} MB`);

    console.log('\n' + '█'.repeat(70));
    console.log('█' + ' '.repeat(68) + '█');
    console.log('█' + '  ✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!'.padEnd(68) + '█');
    console.log('█' + ' '.repeat(68) + '█');
    console.log('█'.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
  } finally {
    // Cleanup
    await redis.quit();
    console.log('👋 Conexão com Redis encerrada\n');
  }
}

// Execute
if (require.main === module) {
  main();
}
