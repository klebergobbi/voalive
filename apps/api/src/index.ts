// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Now load the rest
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import Redis from 'ioredis';
import Queue from 'bull';
import { flightScraperRoutes } from './routes/flight-scraper.routes';
import airlineBookingRoutes from './routes/airline-booking.routes';
import flightSearchRoutes from './routes/flight-search.routes';
import { flightRoutes } from './routes/flight.routes';
import { authRoutes } from './routes/auth.routes';
import { bookingRoutes } from './routes/booking.routes';
import { transactionRoutes } from './routes/transaction.routes';
import bookingMonitorRoutes from './routes/booking-monitor.routes';
import externalBookingRoutes from './routes/external-booking.routes';
import notificationRoutes from './routes/notification.routes';
import { getFlightScraperService } from './services/flight-scraper.service';
import { metricsMiddleware, prometheusMetricsHandler, jsonMetricsHandler } from './middlewares/metrics.middleware';
import { getHealthMonitorService } from './services/health-monitor.service';
import { getBookingMonitorService } from './services/booking-monitor.service';
import { getSimpleBookingMonitorService } from './services/simple-booking-monitor.service';

// Flight Monitoring (NEW)
import flightsRoutes from './routes/flights.routes';
import flightMonitoringCacheRoutes from './routes/flight-monitoring-cache-routes';
import { getFlightMonitoringService } from './services/flightMonitoring';
import { initializeFlightWebSocket } from './websockets/flightWebSocket';

// Sistema de Monitoramento de Reservas Aéreas (Playwright + BullMQ)
import airlineMonitoringRoutes from './routes/airline-monitoring.routes';
import { initializeMonitoringSystem, shutdownMonitoringSystem } from './initialize-monitoring';

// Sistema de Monitoramento 24/7 (Worker BullMQ + Node-Cron + HTTP)
import monitoringRoutes from './routes/monitoring.routes';
import { initializeFlightMonitoring, shutdownFlightMonitoring } from './workers/flight-monitoring.worker';

// NOVO: Sistema de Monitoramento de Reservas com ScrapingBee (PNR + Sobrenome + Origem)
import reservationMonitoringRoutes from './routes/reservation-monitoring.routes';
import { getReservationMonitoringWorker } from './workers/reservation-monitoring.worker';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// Helper function to parse REDIS_URL
const parseRedisUrl = (url: string) => {
  // redis://:password@host:port
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

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics middleware (before routes)
app.use(metricsMiddleware);

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Comprehensive health check
app.get('/health/detailed', async (req, res) => {
  try {
    const healthMonitor = getHealthMonitorService();
    const health = await healthMonitor.performHealthCheck();

    res.status(health.overall === 'healthy' ? 200 : health.overall === 'degraded' ? 206 : 503)
       .json(health);
  } catch (error) {
    res.status(500).json({
      overall: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date()
    });
  }
});

// Health history endpoint
app.get('/health/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const healthMonitor = getHealthMonitorService();
    const history = await healthMonitor.getHealthHistory(hours);

    res.json(history);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get health history'
    });
  }
});

// Metrics endpoints
app.get('/metrics', prometheusMetricsHandler);
app.get('/api/metrics', jsonMetricsHandler);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/v1/flight-scraper', flightScraperRoutes);
app.use('/api/v1/airline-booking', airlineBookingRoutes);
app.use('/api/v1/flight-search', flightSearchRoutes);
app.use('/api/v2/booking-monitor', bookingMonitorRoutes);
app.use('/api/v2/external-booking', externalBookingRoutes);

// Sistema de Monitoramento de Reservas Aéreas (Production-Ready)
app.use('/api/airline-monitoring', airlineMonitoringRoutes);
console.log('✅ Sistema de Monitoramento de Reservas Aéreas (Playwright + BullMQ) carregado');
app.use('/api/notifications', notificationRoutes);
console.log('✅ Sistema de monitoramento avançado de reservas carregado');
console.log('✅ Sistema de reservas externas (Modelo CVC) carregado');
console.log('✅ Sistema de notificações carregado');

// Sistema de Monitoramento 24/7 (Worker BullMQ + Node-Cron + HTTP)
app.use('/api/monitoring', monitoringRoutes);
console.log('✅ Sistema de Monitoramento 24/7 (3 camadas de redundância) carregado');

// NOVO: Sistema de Monitoramento de Reservas (ScrapingBee + 3 campos)
app.use('/api/v2/monitoring', reservationMonitoringRoutes);
console.log('✅ Sistema de Monitoramento de Reservas (ScrapingBee) carregado');
console.log('   POST   /api/v2/monitoring/register');
console.log('   GET    /api/v2/monitoring/my-reservations');
console.log('   GET    /api/v2/monitoring/stats/general');

// ============================================================================
// FLIGHT MONITORING SYSTEM (NEW)
// ============================================================================
try {
  console.log('🚀 Initializing Flight Monitoring System...');

  // Initialize Redis
  const redis = new Redis({
    ...getRedisConfig(),
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected for Flight Monitoring');
  });

  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
  });

  // Initialize Bull Queue
  const monitoringQueue = new Queue('flight-monitoring', {
    redis: getRedisConfig(),
  });

  // Initialize FlightMonitoringService
  getFlightMonitoringService(redis, monitoringQueue, {
    cacheConfig: {
      ttl: 900, // 15 minutes
      rateLimitMax: 10,
      rateLimitWindow: 60,
    },
  });

  console.log('✅ FlightMonitoringService initialized');

  // Initialize WebSocket
  initializeFlightWebSocket(server);
  console.log('✅ Flight WebSocket initialized at /ws/flights');

  // Register routes (usando /api/v2/flights para evitar conflito)
  app.use('/api/v2/flights', flightsRoutes);
  app.use('/api/v2/flight-monitoring', flightMonitoringCacheRoutes);

  console.log('✅ Flight Monitoring routes registered:');
  console.log('   GET    /api/v2/flights/status');
  console.log('   POST   /api/v2/flights/monitor');
  console.log('   GET    /api/v2/flights/monitor');
  console.log('   GET    /api/v2/flights/monitor/:id');
  console.log('   DELETE /api/v2/flights/monitor/:id');
  console.log('   GET    /api/v2/flight-monitoring/history/:booking/:name');
  console.log('   GET    /api/v2/flight-monitoring/cache/stats');
  console.log('   WS     /ws/flights');

} catch (error) {
  console.error('❌ Failed to initialize Flight Monitoring System:', error);
}

// ✨ MÓDULO DE MONITORAMENTO DE RESERVAS EM TEMPO REAL
try {
  const { initReservasModule } = require('./modules/reservas');
  initReservasModule(app, server);
  console.log('✅ Módulo de Monitoramento de Reservas inicializado');
} catch (error) {
  console.warn('⚠️  Módulo de Reservas não pôde ser inicializado:', error instanceof Error ? error.message : error);
}

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'VoaLive Flight Management API',
    version: '1.0.0',
    modules: {
      'reservas': '✅ Sistema de Monitoramento de Reservas em Tempo Real'
    },
    endpoints: {
      health: 'GET /health',
      'reservas-health': 'GET /api/health/reservas',
      'reservas-monitorar': 'POST /api/reservas/monitorar',
      'reservas-status': 'GET /api/reservas/:codigo/status',
      'reservas-companhias': 'GET /api/reservas/companhias',
      auth: {
        'register': 'POST /api/auth/register',
        'login': 'POST /api/auth/login'
      },
      flights: {
        'list-all': 'GET /api/flights',
        'stats': 'GET /api/flights/stats'
      },
      scraping: {
        'scrape-flight': 'POST /api/v1/flight-scraper/scrape/flight',
        'stats': 'GET /api/v1/flight-scraper/stats'
      }
    }
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const scraperService = getFlightScraperService();
  await scraperService.cleanup();
  await shutdownFlightMonitoring();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  const scraperService = getFlightScraperService();
  await scraperService.cleanup();
  await shutdownFlightMonitoring();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`🚀 VoaLive API is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📦 Reservas API: http://localhost:${PORT}/api/reservas/companhias`);

  // Iniciar monitoramento automático de reservas
  setTimeout(() => {
    try {
      const simpleMonitor = getSimpleBookingMonitorService();
      simpleMonitor.startMonitoring();
      console.log('✅ [Startup] Simple Booking Monitor iniciado automaticamente');
    } catch (error) {
      console.error('❌ [Startup] Falha ao iniciar Simple Booking Monitor:', error);
    }
  }, 3000);

  // 🚀 Iniciar Sistema de Monitoramento 24/7 automaticamente
  setTimeout(() => {
    try {
      initializeFlightMonitoring();
      console.log('✅ [Startup] Sistema de Monitoramento 24/7 iniciado automaticamente');
    } catch (error) {
      console.error('❌ [Startup] Falha ao iniciar Sistema de Monitoramento 24/7:', error);
    }
  }, 5000); // Aguarda 5 segundos para garantir que Redis e Banco estejam prontos

  // Iniciar Worker de Monitoramento de Reservas (ScrapingBee)
  setTimeout(() => {
    try {
      const reservationWorker = getReservationMonitoringWorker();
      reservationWorker.start();
      console.log('✅ [Startup] Reservation Monitoring Worker iniciado');
    } catch (error) {
      console.error('❌ [Startup] Falha ao iniciar Reservation Monitoring Worker:', error);
    }
  }, 7000);

  // Optionally start the scheduler on server startup
  if (process.env.AUTO_START_SCRAPER === 'true') {
    setTimeout(async () => {
      try {
        const scraperService = getFlightScraperService();
        await scraperService.startScheduledScraping();
        console.log('✅ Scheduled scraping started automatically');
      } catch (error) {
        console.error('❌ Failed to start scheduled scraping:', error);
      }
    }, 5000);
  }
});
