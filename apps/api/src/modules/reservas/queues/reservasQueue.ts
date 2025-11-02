/**
 * Fila Bull para monitoramento de reservas
 * @module reservasQueue
 */

import Bull, { Job, Queue } from 'bull';
import { EventEmitter } from 'events';
import { redisClient } from '../../shared/config/redisConfig';
import * as scraperService from '../services/scraperService';
import * as changeDetectionService from '../services/changeDetectionService';
import * as proxyService from '../services/proxyService';
import { decrypt } from '../../shared/utils/encryption';
import { ReservaData } from '../services/changeDetectionService';

/**
 * Dados de um job de monitoramento
 */
export interface MonitorJobData {
  codigoReserva: string;
  email: string;
  senhaEncriptada: string;
  companhiaAerea: string;
  reservaAnterior?: ReservaData;
}

/**
 * Event emitter para notificações
 */
export const reservasEmitter = new EventEmitter();

/**
 * Configuração da fila Bull
 */
const QUEUE_CONFIG = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: 100, // Mantém últimos 100 jobs completados
    removeOnFail: 200, // Mantém últimos 200 jobs falhados
  },
  limiter: {
    max: 2, // Máximo 2 jobs por intervalo
    duration: 1000, // Por segundo
    groupKey: 'companhiaAerea', // Rate limit por companhia
  },
};

/**
 * Instância da fila de reservas
 */
export const reservasQueue: Queue<MonitorJobData> = new Bull('reservas-monitor', QUEUE_CONFIG);

/**
 * Intervalo de reagendamento (10 minutos)
 */
const RECHECK_INTERVAL = 10 * 60 * 1000; // 10 minutos

/**
 * Contador de falhas consecutivas por reserva
 */
const failureCount = new Map<string, number>();

/**
 * Circuit breaker: máximo de falhas antes de pausar
 */
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Processor da fila
 */
reservasQueue.process(async (job: Job<MonitorJobData>) => {
  const { codigoReserva, email, senhaEncriptada, companhiaAerea, reservaAnterior } = job.data;

  console.log(`[Reservas Queue] Processando job ${job.id} - ${codigoReserva}`);

  try {
    // Descriptografa senha
    const senha = decrypt(senhaEncriptada);

    // Obtém proxy (se configurado)
    const proxy = proxyService.obterProximo(companhiaAerea);

    // Monitora reserva
    const reservaAtual = await scraperService.monitorarReserva({
      codigoReserva,
      email,
      senha,
      companhiaAerea,
      proxy,
      timeout: 30000,
      retries: 1, // Retry interno já é feito pela fila
    });

    // Detecta mudanças
    let mudancas: changeDetectionService.Change[] = [];
    if (reservaAnterior) {
      mudancas = changeDetectionService.detectarMudancas(reservaAtual, reservaAnterior);
    }

    // Salva resultado no Redis para consulta rápida
    await salvarResultado(codigoReserva, reservaAtual, mudancas);

    // Emite eventos
    if (mudancas.length > 0) {
      reservasEmitter.emit('reserva:atualizada', {
        codigoReserva,
        companhiaAerea,
        mudancas,
        reserva: reservaAtual,
      });
    }

    // Reseta contador de falhas
    failureCount.delete(codigoReserva);

    // Reagenda próxima verificação
    await reagendarVerificacao(job.data, reservaAtual);

    console.log(`[Reservas Queue] Job ${job.id} concluído com sucesso`);

    return {
      sucesso: true,
      reserva: reservaAtual,
      mudancas,
      proximaVerificacao: new Date(Date.now() + RECHECK_INTERVAL),
    };
  } catch (error) {
    console.error(`[Reservas Queue] Erro no job ${job.id}:`, (error as Error).message);

    // Incrementa contador de falhas
    const falhas = (failureCount.get(codigoReserva) || 0) + 1;
    failureCount.set(codigoReserva, falhas);

    // Circuit breaker
    if (falhas >= MAX_CONSECUTIVE_FAILURES) {
      console.error(
        `[Reservas Queue] Circuit breaker acionado para ${codigoReserva} após ${falhas} falhas`
      );
      reservasEmitter.emit('reserva:falha-permanente', {
        codigoReserva,
        companhiaAerea,
        erro: (error as Error).message,
        falhasConsecutivas: falhas,
      });

      // Remove da fila
      await removerReserva(codigoReserva);
      throw error; // Não reagenda
    }

    // Emite evento de erro
    reservasEmitter.emit('reserva:erro', {
      codigoReserva,
      companhiaAerea,
      erro: (error as Error).message,
      tentativas: job.attemptsMade,
    });

    throw error; // Bull vai fazer retry automaticamente
  }
});

/**
 * Adiciona uma reserva para monitoramento
 * @param {MonitorJobData} data - Dados do job
 * @returns {Promise<string>} ID do job
 */
export async function adicionarReserva(data: MonitorJobData): Promise<string> {
  console.log(`[Reservas Queue] Adicionando reserva: ${data.codigoReserva}`);

  // Remove job existente se houver
  await removerReserva(data.codigoReserva);

  // Adiciona novo job
  const job = await reservasQueue.add(data, {
    jobId: `reserva:${data.codigoReserva}`,
    priority: 1,
  });

  console.log(`[Reservas Queue] Reserva adicionada com job ID: ${job.id}`);

  return job.id?.toString() || '';
}

/**
 * Reagenda verificação de uma reserva
 * @private
 */
async function reagendarVerificacao(
  jobData: MonitorJobData,
  reservaAtual: ReservaData
): Promise<void> {
  const novoJobData: MonitorJobData = {
    ...jobData,
    reservaAnterior: reservaAtual,
  };

  await reservasQueue.add(novoJobData, {
    jobId: `reserva:${jobData.codigoReserva}`,
    delay: RECHECK_INTERVAL,
    priority: 1,
  });

  console.log(
    `[Reservas Queue] Reserva ${jobData.codigoReserva} reagendada para daqui ${RECHECK_INTERVAL / 1000}s`
  );
}

/**
 * Remove uma reserva do monitoramento
 * @param {string} codigoReserva - Código da reserva
 */
export async function removerReserva(codigoReserva: string): Promise<void> {
  const jobId = `reserva:${codigoReserva}`;

  try {
    const job = await reservasQueue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`[Reservas Queue] Reserva ${codigoReserva} removida`);
    }

    // Remove do Redis
    await redisClient.del(`reserva:resultado:${codigoReserva}`);
    await redisClient.del(`reserva:historico:${codigoReserva}`);

    // Limpa contador de falhas
    failureCount.delete(codigoReserva);
  } catch (error) {
    console.error(`[Reservas Queue] Erro ao remover reserva ${codigoReserva}:`, error);
  }
}

/**
 * Pausa monitoramento de uma reserva
 * @param {string} codigoReserva - Código da reserva
 */
export async function pausarReserva(codigoReserva: string): Promise<void> {
  const jobId = `reserva:${codigoReserva}`;

  try {
    const job = await reservasQueue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`[Reservas Queue] Reserva ${codigoReserva} pausada`);
    }
  } catch (error) {
    console.error(`[Reservas Queue] Erro ao pausar reserva ${codigoReserva}:`, error);
  }
}

/**
 * Retoma monitoramento de uma reserva
 * @param {MonitorJobData} data - Dados do job
 */
export async function retomarReserva(data: MonitorJobData): Promise<void> {
  await adicionarReserva(data);
  console.log(`[Reservas Queue] Reserva ${data.codigoReserva} retomada`);
}

/**
 * Salva resultado no Redis
 * @private
 */
async function salvarResultado(
  codigoReserva: string,
  reserva: ReservaData,
  mudancas: changeDetectionService.Change[]
): Promise<void> {
  try {
    // Salva resultado atual
    await redisClient.setex(
      `reserva:resultado:${codigoReserva}`,
      24 * 60 * 60, // 24 horas
      JSON.stringify({ reserva, mudancas, timestamp: new Date() })
    );

    // Adiciona ao histórico
    if (mudancas.length > 0) {
      await redisClient.lpush(
        `reserva:historico:${codigoReserva}`,
        JSON.stringify({ mudancas, timestamp: new Date() })
      );

      // Limita histórico a 100 entradas
      await redisClient.ltrim(`reserva:historico:${codigoReserva}`, 0, 99);
    }
  } catch (error) {
    console.error('[Reservas Queue] Erro ao salvar resultado no Redis:', error);
  }
}

/**
 * Obtém status de uma reserva
 * @param {string} codigoReserva - Código da reserva
 */
export async function obterStatus(codigoReserva: string) {
  try {
    // Resultado do Redis
    const resultado = await redisClient.get(`reserva:resultado:${codigoReserva}`);

    if (resultado) {
      return JSON.parse(resultado);
    }

    return null;
  } catch (error) {
    console.error('[Reservas Queue] Erro ao obter status:', error);
    return null;
  }
}

/**
 * Obtém histórico de mudanças
 * @param {string} codigoReserva - Código da reserva
 */
export async function obterHistorico(codigoReserva: string) {
  try {
    const historico = await redisClient.lrange(`reserva:historico:${codigoReserva}`, 0, -1);

    return historico.map((item) => JSON.parse(item));
  } catch (error) {
    console.error('[Reservas Queue] Erro ao obter histórico:', error);
    return [];
  }
}

/**
 * Obtém estatísticas da fila
 */
export async function obterEstatisticas() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      reservasQueue.getWaitingCount(),
      reservasQueue.getActiveCount(),
      reservasQueue.getCompletedCount(),
      reservasQueue.getFailedCount(),
      reservasQueue.getDelayedCount(),
    ]);

    return {
      aguardando: waiting,
      ativos: active,
      completados: completed,
      falhados: failed,
      agendados: delayed,
      total: waiting + active + delayed,
    };
  } catch (error) {
    console.error('[Reservas Queue] Erro ao obter estatísticas:', error);
    return null;
  }
}

/**
 * Limpa jobs antigos
 */
export async function limparJobs(): Promise<void> {
  await reservasQueue.clean(24 * 60 * 60 * 1000); // Limpa jobs > 24h
  console.log('[Reservas Queue] Jobs antigos limpos');
}

// Event listeners da fila
reservasQueue.on('completed', (job, result) => {
  console.log(`[Reservas Queue] Job ${job.id} completado`);
});

reservasQueue.on('failed', (job, error) => {
  console.error(`[Reservas Queue] Job ${job?.id} falhou:`, error.message);
});

reservasQueue.on('stalled', (job) => {
  console.warn(`[Reservas Queue] Job ${job.id} travou`);
});

// Emite status da fila periodicamente
setInterval(async () => {
  const stats = await obterEstatisticas();
  reservasEmitter.emit('fila:status', stats);
}, 30000); // A cada 30 segundos

export default {
  reservasQueue,
  reservasEmitter,
  adicionarReserva,
  removerReserva,
  pausarReserva,
  retomarReserva,
  obterStatus,
  obterHistorico,
  obterEstatisticas,
  limparJobs,
};
