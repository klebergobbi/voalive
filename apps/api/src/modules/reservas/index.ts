/**
 * Módulo de Monitoramento de Reservas Aéreas
 * Entry point principal
 * @module reservas
 */

// Rotas
export { default as reservasRoutes } from './routes';

// Controllers
export * as reservasController from './controllers/reservasController';

// Services
export * as scraperService from './services/scraperService';
export * as proxyService from './services/proxyService';
export * as changeDetectionService from './services/changeDetectionService';

// Queue
export * as reservasQueue from './queues/reservasQueue';
export { reservasEmitter } from './queues/reservasQueue';

// Models
export * from './models/Reserva';

// Middleware Socket.io (re-export)
export { initializeSocketIO } from '../shared/middleware/socketMiddleware';

// Utils (re-export)
export * from '../shared/utils/errorHandler';
export { encrypt, decrypt } from '../shared/utils/encryption';

/**
 * Inicialização rápida do módulo completo
 * Use esta função no seu server principal
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import http from 'http';
 * import { initReservasModule } from './modules/reservas';
 *
 * const app = express();
 * const server = http.createServer(app);
 *
 * // Inicializa módulo de reservas
 * initReservasModule(app, server);
 *
 * server.listen(4000);
 * ```
 */
export function initReservasModule(app: any, httpServer: any) {
  const { initializeSocketIO } = require('../shared/middleware/socketMiddleware');
  const routes = require('./routes').default;

  // Inicializa Socket.io
  const io = initializeSocketIO(httpServer);
  console.log('✓ [Reservas] Socket.io inicializado');

  // Registra rotas
  app.use('/api/reservas', routes);
  console.log('✓ [Reservas] Rotas registradas em /api/reservas');

  // Health check
  app.get('/api/health/reservas', async (req: any, res: any) => {
    const { healthCheck: redisHealth } = require('../shared/config/redisConfig');
    const { healthCheck: playwrightHealth } = require('../shared/config/playwrightConfig');
    const { obterEstatisticas } = require('./queues/reservasQueue');

    const [redis, playwright, queueStats] = await Promise.all([
      redisHealth(),
      playwrightHealth(),
      obterEstatisticas(),
    ]);

    const healthy = redis && playwright && queueStats !== null;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      checks: {
        redis: redis ? 'ok' : 'fail',
        playwright: playwright ? 'ok' : 'fail',
        queue: queueStats ? 'ok' : 'fail',
      },
      queue: queueStats,
      timestamp: new Date(),
    });
  });

  console.log('✓ [Reservas] Health check registrado em /api/health/reservas');

  return { io, routes };
}

export default {
  initReservasModule,
};
