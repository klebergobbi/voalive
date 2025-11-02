/**
 * Configuração Redis com retry automático e health check
 * @module redisConfig
 */

import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * @typedef {Object} RedisConfig
 * @property {string} host - Host do Redis
 * @property {number} port - Porta do Redis
 * @property {string} [password] - Senha do Redis
 * @property {number} maxRetriesPerRequest - Máximo de tentativas por requisição
 * @property {number} retryStrategy - Estratégia de retry
 */

// Parse REDIS_URL if provided, otherwise fallback to individual env vars
const parseRedisUrl = (url: string | undefined) => {
  if (!url) {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    };
  }

  // Parse redis://[:password@]host:port format
  const match = url.match(/redis:\/\/:?([^@]+)?@([^:]+):(\d+)/);
  if (match) {
    return {
      host: match[2],
      port: parseInt(match[3], 10),
      password: match[1] || undefined,
    };
  }

  // Fallback
  return {
    host: 'localhost',
    port: 6379,
    password: undefined,
  };
};

const { host, port, password } = parseRedisUrl(process.env.REDIS_URL);

const REDIS_CONFIG = {
  host,
  port,
  password,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`[Redis] Tentativa de reconexão ${times}, aguardando ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // Reconecta em caso de erro READONLY
    }
    return false;
  },
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: false,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

/**
 * Instância principal do Redis
 */
export const redisClient = new Redis(REDIS_CONFIG);

/**
 * Cliente Redis para subscriber (pub/sub)
 */
export const redisSubscriber = new Redis(REDIS_CONFIG);

/**
 * Cliente Redis para publisher (pub/sub)
 */
export const redisPublisher = new Redis(REDIS_CONFIG);

// Event Handlers para monitoramento
redisClient.on('connect', () => {
  console.log('[Redis] Conectado com sucesso');
});

redisClient.on('ready', () => {
  console.log('[Redis] Pronto para aceitar comandos');
});

redisClient.on('error', (err: Error) => {
  console.error('[Redis] Erro de conexão:', err.message);
});

redisClient.on('close', () => {
  console.log('[Redis] Conexão fechada');
});

redisClient.on('reconnecting', () => {
  console.log('[Redis] Tentando reconectar...');
});

redisSubscriber.on('connect', () => {
  console.log('[Redis Subscriber] Conectado');
});

redisPublisher.on('connect', () => {
  console.log('[Redis Publisher] Conectado');
});

/**
 * Verifica saúde da conexão Redis
 * @returns {Promise<boolean>} True se conectado e funcionando
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await redisClient.ping();
    return response === 'PONG';
  } catch (error) {
    console.error('[Redis Health Check] Falhou:', error);
    return false;
  }
}

/**
 * Retorna estatísticas do Redis
 * @returns {Promise<Object>} Estatísticas da conexão
 */
export async function getStats(): Promise<{
  status: string;
  connected: boolean;
  memory: any;
  stats: any;
}> {
  try {
    const info = await redisClient.info();
    const connected = redisClient.status === 'ready';

    return {
      status: redisClient.status,
      connected,
      memory: parseRedisInfo(info, 'memory'),
      stats: parseRedisInfo(info, 'stats'),
    };
  } catch (error) {
    console.error('[Redis Stats] Erro ao obter estatísticas:', error);
    return {
      status: 'error',
      connected: false,
      memory: null,
      stats: null,
    };
  }
}

/**
 * Parser de informações do Redis INFO command
 * @private
 */
function parseRedisInfo(info: string, section: string): Record<string, any> {
  const lines = info.split('\r\n');
  const result: Record<string, any> = {};
  let inSection = false;

  for (const line of lines) {
    if (line.startsWith(`# ${section}`)) {
      inSection = true;
      continue;
    }
    if (line.startsWith('#')) {
      inSection = false;
    }
    if (inSection && line.includes(':')) {
      const [key, value] = line.split(':');
      result[key] = value;
    }
  }

  return result;
}

/**
 * Fecha todas as conexões Redis gracefully
 */
export async function closeConnections(): Promise<void> {
  console.log('[Redis] Fechando conexões...');

  try {
    await Promise.all([
      redisClient.quit(),
      redisSubscriber.quit(),
      redisPublisher.quit(),
    ]);
    console.log('[Redis] Todas as conexões fechadas com sucesso');
  } catch (error) {
    console.error('[Redis] Erro ao fechar conexões:', error);
    // Força o fechamento em caso de erro
    redisClient.disconnect();
    redisSubscriber.disconnect();
    redisPublisher.disconnect();
  }
}

/**
 * Testa a conexão Redis ao inicializar
 */
(async () => {
  try {
    const isHealthy = await healthCheck();
    if (isHealthy) {
      console.log('[Redis] Health check passou ✓');
    } else {
      console.warn('[Redis] Health check falhou ✗');
    }
  } catch (error) {
    console.error('[Redis] Erro no health check inicial:', error);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeConnections();
  process.exit(0);
});

export default {
  client: redisClient,
  subscriber: redisSubscriber,
  publisher: redisPublisher,
  healthCheck,
  getStats,
  closeConnections,
};
