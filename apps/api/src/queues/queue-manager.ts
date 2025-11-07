/**
 * Queue Manager
 * Gerenciador de filas Bull
 */

import Queue from 'bull';
import IORedis from 'ioredis';
import { Logger } from '../utils/logger.util';
import { createBookingMonitorWorker } from './booking-monitor.processor';
import { getAirlineMonitoringService } from '../services/airline-monitoring.service';

const logger = new Logger('QueueManager');

export class QueueManager {
  private connection: IORedis;
  private bookingMonitorQueue: Queue.Queue | null = null;
  private worker: any = null;

  constructor() {
    // Configurar conexão Redis usando REDIS_URL ou fallback para variáveis separadas
    const redisUrl = process.env.REDIS_URL;

    let redisOptions: any = {
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    if (redisUrl) {
      // Parse redis://[:password@]host:port format
      logger.info(`Conectando ao Redis usando REDIS_URL`);
      this.connection = new IORedis(redisUrl, redisOptions);
    } else {
      // Fallback para variáveis separadas
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379');
      logger.info(`Conectando ao Redis: ${redisHost}:${redisPort}`);

      this.connection = new IORedis({
        host: redisHost,
        port: redisPort,
        ...redisOptions,
      });
    }

    this.connection.on('connect', () => {
      logger.info('Conectado ao Redis');
    });

    this.connection.on('error', (error) => {
      logger.error('Erro no Redis:', error.message);
    });
  }

  /**
   * Inicializa as filas
   */
  async initialize(): Promise<void> {
    logger.info('Inicializando filas...');

    // Criar fila de monitoramento (Bull usa redis config diferente)
    this.bookingMonitorQueue = new Queue('booking-monitor', {
      redis: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    // Configurar eventos da fila (Bull usa eventos diretamente na queue)
    this.bookingMonitorQueue.on('completed', (job) => {
      logger.info(`Job ${job.id} concluído`);
    });

    this.bookingMonitorQueue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} falhou: ${err.message}`);
    });

    // Criar worker
    this.worker = createBookingMonitorWorker(this.connection);

    // Injetar fila no serviço de monitoramento
    const monitoringService = getAirlineMonitoringService();
    monitoringService.setQueue(this.bookingMonitorQueue);

    logger.info('Filas inicializadas com sucesso');
  }

  /**
   * Retorna a fila de monitoramento
   */
  getBookingMonitorQueue(): Queue.Queue {
    if (!this.bookingMonitorQueue) {
      throw new Error('Fila não inicializada. Chame initialize() primeiro.');
    }
    return this.bookingMonitorQueue;
  }

  /**
   * Obtém estatísticas da fila
   */
  async getQueueStats(): Promise<any> {
    if (!this.bookingMonitorQueue) {
      return null;
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.bookingMonitorQueue.getWaitingCount(),
      this.bookingMonitorQueue.getActiveCount(),
      this.bookingMonitorQueue.getCompletedCount(),
      this.bookingMonitorQueue.getFailedCount(),
      this.bookingMonitorQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Limpa jobs antigos
   */
  async cleanQueue(): Promise<void> {
    if (!this.bookingMonitorQueue) {
      return;
    }

    logger.info('Limpando jobs antigos...');

    await this.bookingMonitorQueue.clean(24 * 3600 * 1000, 1000, 'completed');
    await this.bookingMonitorQueue.clean(7 * 24 * 3600 * 1000, 100, 'failed');

    logger.info('Limpeza concluída');
  }

  /**
   * Fecha todas as conexões
   */
  async close(): Promise<void> {
    logger.info('Fechando filas...');

    if (this.worker) {
      await this.worker.close();
    }

    if (this.bookingMonitorQueue) {
      await this.bookingMonitorQueue.close();
    }

    await this.connection.quit();

    logger.info('Filas fechadas');
  }
}

// Singleton
let queueManager: QueueManager;

export function getQueueManager(): QueueManager {
  if (!queueManager) {
    queueManager = new QueueManager();
  }
  return queueManager;
}
