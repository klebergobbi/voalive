import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import 'express-async-errors';
import { flightScraperRoutes } from './routes/flight-scraper.routes';
import airlineBookingRoutes from './routes/airline-booking.routes';
import { getFlightScraperService } from './services/flight-scraper.service';
import { metricsMiddleware, prometheusMetricsHandler, jsonMetricsHandler } from './middlewares/metrics.middleware';
import { getHealthMonitorService } from './services/health-monitor.service';

dotenv.config();

const app = express();
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
app.use('/api/v1/flight-scraper', flightScraperRoutes);
app.use('/api/v1/airline-booking', airlineBookingRoutes);

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'VoaLive Flight Management API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      scraping: {
        'scrape-flight': 'POST /api/v1/flight-scraper/scrape/flight',
        'scrape-airport': 'POST /api/v1/flight-scraper/scrape/airport',
        'get-flight': 'GET /api/v1/flight-scraper/flights/:flightNumber',
        'get-airport-flights': 'GET /api/v1/flight-scraper/airports/:airportCode/flights',
        'search-flights': 'GET /api/v1/flight-scraper/flights/search',
        'recent-flights': 'GET /api/v1/flight-scraper/flights/recent',
        'start-scheduler': 'POST /api/v1/flight-scraper/scheduler/start',
        'stop-scheduler': 'POST /api/v1/flight-scraper/scheduler/stop',
        'stats': 'GET /api/v1/flight-scraper/stats'
      },
      'airline-booking': {
        'search-booking': 'POST /api/v1/airline-booking/search-booking',
        'validate-localizador': 'POST /api/v1/airline-booking/validate-localizador',
        'airlines': 'GET /api/v1/airline-booking/airlines'
      }
    },
    firecrawlKey: process.env.FIRECRAWL_API_KEY ? '***configured***' : 'missing'
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
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/v1/flight-scraper/scrape/flight',
      'POST /api/v1/flight-scraper/scrape/airport',
      'GET /api/v1/flight-scraper/flights/:flightNumber',
      'GET /api/v1/flight-scraper/airports/:airportCode/flights'
    ]
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

app.listen(PORT, () => {
  console.log(`🚀 VoaLive API is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/`);

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
    }, 5000); // Wait 5 seconds after server start
  }
});