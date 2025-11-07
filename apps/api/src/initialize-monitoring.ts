/**
 * Initialize Monitoring System
 * Arquivo para inicializar o sistema de monitoramento
 * Deve ser importado no index.ts principal
 */

import { getQueueManager } from './queues/queue-manager';
import { Logger } from './utils/logger.util';

const logger = new Logger('MonitoringInitializer');

/**
 * Inicializa o sistema de monitoramento
 */
export async function initializeMonitoringSystem(): Promise<void> {
  try {
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('🚀 Inicializando Sistema de Monitoramento de Reservas');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Verificar variáveis de ambiente
    logger.info('📋 Verificando configurações...');

    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';
    const webhookUrl = process.env.WEBHOOK_URL || '';

    logger.info(`   Redis: ${redisHost}:${redisPort}`);
    logger.info(`   Webhook: ${webhookUrl || 'NÃO CONFIGURADO'}`);

    // Inicializar sistema de filas
    logger.info('📦 Inicializando sistema de filas BullMQ...');
    const queueManager = getQueueManager();
    await queueManager.initialize();

    logger.info('✅ Sistema de filas inicializado');

    // Obter estatísticas iniciais
    const stats = await queueManager.getQueueStats();
    logger.info('📊 Estatísticas da fila:');
    logger.info(`   Aguardando: ${stats.waiting}`);
    logger.info(`   Ativos: ${stats.active}`);
    logger.info(`   Concluídos: ${stats.completed}`);
    logger.info(`   Falhados: ${stats.failed}`);
    logger.info(`   Atrasados: ${stats.delayed}`);

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('✅ Sistema de Monitoramento PRONTO');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('');
    logger.info('📝 Endpoints disponíveis:');
    logger.info('   POST   /api/monitoring/bookings');
    logger.info('   GET    /api/monitoring/bookings/:pnr');
    logger.info('   DELETE /api/monitoring/bookings/:pnr');
    logger.info('   POST   /api/monitoring/bookings/:pnr/check');
    logger.info('   GET    /api/monitoring/airlines');
    logger.info('   GET    /api/monitoring/queue/stats');
    logger.info('   POST   /api/monitoring/webhook/test');
    logger.info('   GET    /api/health');
    logger.info('   GET    /api/metrics');
    logger.info('');
  } catch (error: any) {
    logger.error('❌ Erro ao inicializar sistema de monitoramento:', error.message);
    throw error;
  }
}

/**
 * Graceful shutdown do sistema de monitoramento
 */
export async function shutdownMonitoringSystem(): Promise<void> {
  try {
    logger.info('🛑 Encerrando sistema de monitoramento...');

    const queueManager = getQueueManager();
    await queueManager.close();

    logger.info('✅ Sistema de monitoramento encerrado');
  } catch (error: any) {
    logger.error('❌ Erro ao encerrar sistema de monitoramento:', error.message);
  }
}
