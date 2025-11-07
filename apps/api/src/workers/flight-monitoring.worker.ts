import Queue from 'bull';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to parse REDIS_URL
const parseRedisUrl = (url: string) => {
  const match = url.match(/redis:\/\/:?([^@]*)@([^:]+):(\d+)/);
  if (match) {
    return {
      host: match[2],
      port: parseInt(match[3], 10),
      password: match[1] || undefined,
    };
  }
  return {
    host: 'localhost',
    port: 6379,
    password: undefined,
  };
};

const getRedisConfig = () => {
  if (process.env.REDIS_URL) {
    return parseRedisUrl(process.env.REDIS_URL);
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  };
};

// ============================================
// OPÇÃO 1: WORKER BULLMQ (PRINCIPAL)
// ============================================

const redisConfig = getRedisConfig();

export const flightMonitoringQueue = new Queue('flight-monitoring-24-7', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minuto
    },
    removeOnComplete: 100, // Manter últimos 100 jobs completados
    removeOnFail: 500, // Manter últimos 500 jobs com falha
  },
});

/**
 * 🔍 Função principal de monitoramento que verifica TODAS as reservas ativas
 */
async function checkAllActiveBookings() {
  const startTime = Date.now();
  console.log('🔍 [Flight Monitor] Iniciando verificação de todas as reservas ativas...');

  try {
    // Buscar todas as reservas ativas (status CONFIRMADA e data futura)
    const activeBookings = await prisma.booking.findMany({
      where: {
        bookingStatus: {
          in: ['CONFIRMADA', 'PENDING', 'EMITIDO']
        },
        departureDate: {
          gte: new Date() // Apenas voos futuros
        }
      },
      orderBy: {
        departureDate: 'asc'
      }
    });

    console.log(`📊 [Flight Monitor] Encontradas ${activeBookings.length} reservas ativas para monitorar`);

    let updatedCount = 0;
    let errorCount = 0;

    // Verificar cada reserva
    for (const booking of activeBookings) {
      try {
        // Aqui você pode integrar com seu serviço de scraping/API
        // Por exemplo: buscar status atualizado na companhia aérea

        const hasChanges = await checkBookingForChanges(booking);

        if (hasChanges) {
          updatedCount++;
          console.log(`✅ [Flight Monitor] Reserva ${booking.bookingCode} atualizada`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ [Flight Monitor] Erro ao verificar reserva ${booking.bookingCode}:`, error);
      }

      // Pequeno delay entre verificações para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [Flight Monitor] Verificação concluída em ${duration}ms`);
    console.log(`📈 [Flight Monitor] Estatísticas: ${updatedCount} atualizadas, ${errorCount} erros`);

    return {
      success: true,
      totalBookings: activeBookings.length,
      updatedCount,
      errorCount,
      duration,
    };
  } catch (error) {
    console.error('❌ [Flight Monitor] Erro crítico:', error);
    throw error;
  }
}

/**
 * Verifica se houve mudanças em uma reserva específica
 */
async function checkBookingForChanges(booking: any): Promise<boolean> {
  try {
    // TODO: Integrar com seu serviço de busca de voos
    // Por enquanto, vamos apenas registrar que foi verificado

    // Exemplo de como seria:
    // const currentStatus = await flightSearchService.checkFlight({
    //   flightNumber: booking.flightNumber,
    //   bookingCode: booking.bookingCode,
    //   airline: booking.airline
    // });

    // Se houver mudanças, criar notificação
    // if (hasStatusChange || hasTimeChange || hasGateChange) {
    //   await prisma.notification.create({
    //     data: {
    //       type: 'BOOKING_CHANGE',
    //       message: `Alteração detectada na reserva ${booking.bookingCode}`,
    //       bookingId: booking.id,
    //       read: false
    //     }
    //   });
    //
    //   await prisma.bookingChange.create({
    //     data: {
    //       bookingId: booking.id,
    //       changeType: 'STATUS_CHANGE',
    //       oldValue: booking.bookingStatus,
    //       newValue: currentStatus.status,
    //       detectedAt: new Date()
    //     }
    //   });
    //
    //   return true;
    // }

    return false;
  } catch (error) {
    console.error(`❌ [Flight Monitor] Erro ao verificar reserva ${booking.id}:`, error);
    return false;
  }
}

// ============================================
// Configurar Worker BullMQ
// ============================================

export function startFlightMonitoringWorker() {
  console.log('🚀 [Flight Monitor] Iniciando worker BullMQ...');

  // Processar jobs da fila
  flightMonitoringQueue.process(async (job) => {
    console.log(`🔄 [Flight Monitor] Processando job #${job.id}`);
    const result = await checkAllActiveBookings();
    return result;
  });

  // Adicionar job recorrente (a cada 5 minutos)
  flightMonitoringQueue.add(
    'monitor-all-bookings',
    {},
    {
      repeat: {
        every: 5 * 60 * 1000, // 5 minutos em milissegundos
      },
    }
  );

  // Listeners para monitorar o worker
  flightMonitoringQueue.on('completed', (job, result) => {
    console.log(`✅ [Flight Monitor] Job #${job.id} completado:`, result);
  });

  flightMonitoringQueue.on('failed', (job, err) => {
    console.error(`❌ [Flight Monitor] Job #${job?.id} falhou:`, err.message);
  });

  flightMonitoringQueue.on('stalled', (job) => {
    console.warn(`⚠️  [Flight Monitor] Job #${job.id} travado, será reiniciado`);
  });

  console.log('✅ [Flight Monitor] Worker BullMQ configurado para rodar a cada 5 minutos');
}

// ============================================
// OPÇÃO 2: NODE-CRON (BACKUP)
// ============================================

export function startNodeCronMonitoring() {
  console.log('🚀 [Flight Monitor] Iniciando Node-Cron como backup...');

  // Executar a cada 5 minutos (redundância com BullMQ)
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ [Node-Cron] Trigger de monitoramento (backup)');

    try {
      await checkAllActiveBookings();
    } catch (error) {
      console.error('❌ [Node-Cron] Erro ao executar monitoramento:', error);
    }
  });

  console.log('✅ [Flight Monitor] Node-Cron configurado para rodar a cada 5 minutos (backup)');
}

// ============================================
// OPÇÃO 3: ENDPOINT HTTP MANUAL
// ============================================

export { checkAllActiveBookings };

// ============================================
// Inicialização
// ============================================

export function initializeFlightMonitoring() {
  console.log('===========================================');
  console.log('🚀 SISTEMA DE MONITORAMENTO 24/7 INICIANDO');
  console.log('===========================================');

  // Opção 1: Worker BullMQ (Principal)
  startFlightMonitoringWorker();

  // Opção 2: Node-Cron (Backup)
  startNodeCronMonitoring();

  // Opção 3: Endpoint HTTP será registrado nas rotas

  console.log('===========================================');
  console.log('✅ SISTEMA DE MONITORAMENTO 24/7 ATIVO!');
  console.log('📊 Opção 1: Worker BullMQ - ATIVO');
  console.log('🔄 Opção 2: Node-Cron - ATIVO');
  console.log('🌐 Opção 3: Endpoint HTTP - /api/monitoring/check-all');
  console.log('⏱️  Frequência: A cada 5 minutos');
  console.log('===========================================');
}

// Cleanup ao desligar
export async function shutdownFlightMonitoring() {
  console.log('🛑 [Flight Monitor] Desligando sistema de monitoramento...');

  await flightMonitoringQueue.close();
  await prisma.$disconnect();

  console.log('✅ [Flight Monitor] Sistema de monitoramento desligado');
}
