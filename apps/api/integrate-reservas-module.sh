#!/bin/bash

# Script para integrar o módulo de monitoramento de reservas
echo "🔧 Integrando módulo de monitoramento de reservas..."

cd "$(dirname "$0")"

# Backup do index.ts original
cp src/index.ts src/index.ts.backup
echo "✓ Backup criado: src/index.ts.backup"

# Cria o index.ts integrado
cat > src/index.ts << 'EOFINDEX'
// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Now load the rest
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import { flightScraperRoutes } from './routes/flight-scraper.routes';
import airlineBookingRoutes from './routes/airline-booking.routes';
import flightSearchRoutes from './routes/flight-search.routes';
import { flightRoutes } from './routes/flight.routes';
import { authRoutes } from './routes/auth.routes';
import { bookingRoutes } from './routes/booking.routes';
import { transactionRoutes } from './routes/transaction.routes';
import { getFlightScraperService } from './services/flight-scraper.service';
import { metricsMiddleware, prometheusMetricsHandler, jsonMetricsHandler } from './middlewares/metrics.middleware';
import { getHealthMonitorService } from './services/health-monitor.service';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

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
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  const scraperService = getFlightScraperService();
  await scraperService.cleanup();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`🚀 VoaLive API is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📦 Reservas API: http://localhost:${PORT}/api/reservas/companhias`);

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
EOFINDEX

echo "✅ index.ts integrado com módulo de reservas"
echo ""
echo "Para restaurar o original, execute:"
echo "  cp src/index.ts.backup src/index.ts"
