/**
 * Booking Monitor Processor
 * Worker que processa jobs de monitoramento de reservas
 */

import Queue from 'bull';
import { getAirlineMonitoringService } from '../services/airline-monitoring.service';
import { Logger } from '../utils/logger.util';

const logger = new Logger('BookingMonitorProcessor');

export interface CheckBookingStatusJob {
  bookingId: string;
  pnr: string;
  lastName: string;
  airline: string;
}

/**
 * Processa job de verificação de status
 */
async function processCheckBookingStatus(job: Queue.Job<CheckBookingStatusJob>): Promise<void> {
  const { bookingId, pnr, airline } = job.data;

  logger.info(`Processando job ${job.id}: verificar status de ${pnr} (${airline})`);

  try {
    const monitoringService = getAirlineMonitoringService();
    await monitoringService.checkBookingStatus(bookingId);

    logger.info(`Job ${job.id} processado com sucesso`);
  } catch (error: any) {
    logger.error(`Erro ao processar job ${job.id}:`, error.message);
    throw error; // Re-throw para Bull fazer retry
  }
}

/**
 * Cria e inicia o worker
 * Bull usa queue.process() ao invés de Worker separado
 */
export function createBookingMonitorWorker(connection: any): any {
  logger.info('Criando worker de monitoramento de reservas...');

  const queue = new Queue('booking-monitor', {
    redis: connection,
  });

  // Configurar processamento de jobs
  queue.process('check-booking-status', 5, async (job: Queue.Job<CheckBookingStatusJob>) => {
    logger.info(`Worker recebeu job ${job.id}: ${job.name}`);
    await processCheckBookingStatus(job);
  });

  // Processar outros tipos de jobs (default)
  queue.process(5, async (job: Queue.Job) => {
    logger.info(`Worker recebeu job ${job.id}: ${job.name}`);

    switch (job.name) {
      case 'check-booking-status':
        await processCheckBookingStatus(job);
        break;

      default:
        logger.warn(`Tipo de job desconhecido: ${job.name}`);
    }
  });

  // Event listeners
  queue.on('completed', (job) => {
    logger.info(`Job ${job.id} concluído com sucesso`);
  });

  queue.on('failed', (job, error) => {
    if (job) {
      logger.error(`Job ${job.id} falhou:`, error.message);
    } else {
      logger.error('Job falhou:', error.message);
    }
  });

  queue.on('error', (error) => {
    logger.error('Erro no worker:', error.message);
  });

  logger.info('Worker de monitoramento criado e iniciado');

  return queue;
}
