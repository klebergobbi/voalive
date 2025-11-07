/**
 * Flight Monitoring Routes
 * Endpoints para monitoramento de voos
 */

import { Router, Request, Response } from 'express';
import { getFlightMonitoringService } from '../services/flightMonitoring';
import { z } from 'zod';

const router = Router();

// Validation schemas
const searchFlightSchema = z.object({
  bookingReference: z.string().min(5).max(8),
  lastName: z.string().min(2),
  airline: z.string().length(2).optional(),
  useCache: z.boolean().optional().default(true),
});

const startMonitoringSchema = z.object({
  bookingReference: z.string().min(5).max(8),
  lastName: z.string().min(2),
  intervalMinutes: z.number().min(5).max(120).default(15),
  notifyOnChange: z.boolean().default(true),
  notifyOnDelay: z.boolean().default(true),
  notifyOnGateChange: z.boolean().default(true),
  notifyChannels: z.array(z.enum(['email', 'sms', 'push', 'webhook'])).optional(),
  autoStopAfterDeparture: z.boolean().optional(),
  autoStopAfterMinutes: z.number().min(60).max(2880).optional(), // Max 48 hours
});

const stopMonitoringSchema = z.object({
  bookingReference: z.string().min(5).max(8),
  lastName: z.string().min(2),
});

/**
 * POST /api/v2/flight-monitoring/search
 * Busca status de voo por referência de reserva
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { bookingReference, lastName, airline, useCache } = searchFlightSchema.parse(req.body);

    console.log(`🔍 Searching flight: ${bookingReference} - ${lastName}`);

    // Get service instance (será inicializado no index.ts)
    const service = getFlightMonitoringService();

    const status = await service.getFlightStatusByReservation(
      bookingReference,
      lastName,
      { airline, useCache }
    );

    return res.json({
      success: status.success,
      data: status,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('❌ Error searching flight:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v2/flight-monitoring/start
 * Inicia monitoramento contínuo de um voo
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const {
      bookingReference,
      lastName,
      intervalMinutes,
      notifyOnChange,
      notifyOnDelay,
      notifyOnGateChange,
      notifyChannels,
      autoStopAfterDeparture,
      autoStopAfterMinutes,
    } = startMonitoringSchema.parse(req.body);

    console.log(`🚀 Starting monitoring: ${bookingReference} - ${lastName}`);

    const service = getFlightMonitoringService();

    const job = await service.monitorFlightContinuous(
      bookingReference,
      lastName,
      {
        intervalMinutes,
        notifyOnChange,
        notifyOnDelay,
        notifyOnGateChange,
        notifyChannels,
        autoStop: {
          afterDeparture: autoStopAfterDeparture,
          afterMinutes: autoStopAfterMinutes,
        },
      }
    );

    return res.json({
      success: true,
      message: 'Monitoramento iniciado com sucesso',
      data: {
        jobId: job.id,
        status: job.status,
        intervalMinutes: job.intervalMinutes,
        startedAt: job.startedAt,
        nextCheckAt: job.nextCheckAt,
        options: job.options,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('❌ Error starting monitoring:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start monitoring',
    });
  }
});

/**
 * POST /api/v2/flight-monitoring/stop
 * Para monitoramento de um voo
 */
router.post('/stop', async (req: Request, res: Response) => {
  try {
    const { bookingReference, lastName } = stopMonitoringSchema.parse(req.body);

    console.log(`⏹️ Stopping monitoring: ${bookingReference} - ${lastName}`);

    const service = getFlightMonitoringService();

    const success = await service.stopMonitoring(bookingReference, lastName);

    if (success) {
      return res.json({
        success: true,
        message: 'Monitoramento parado com sucesso',
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Monitoramento não encontrado ou já estava parado',
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('❌ Error stopping monitoring:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop monitoring',
    });
  }
});

/**
 * GET /api/v2/flight-monitoring/status/:bookingReference/:lastName
 * Obtém status atual de um monitoramento
 */
router.get('/status/:bookingReference/:lastName', async (req: Request, res: Response) => {
  try {
    const { bookingReference, lastName } = req.params;

    const service = getFlightMonitoringService();

    const job = await service.getMonitoringJob(`${bookingReference}:${lastName}`);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Monitoramento não encontrado',
      });
    }

    return res.json({
      success: true,
      data: job,
    });

  } catch (error) {
    console.error('❌ Error getting monitoring status:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get status',
    });
  }
});

/**
 * GET /api/v2/flight-monitoring/history/:bookingReference/:lastName
 * Obtém histórico de verificações de um voo
 */
router.get('/history/:bookingReference/:lastName', async (req: Request, res: Response) => {
  try {
    const { bookingReference, lastName } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const service = getFlightMonitoringService();

    const history = await service.getFlightHistory(bookingReference, lastName, limit);

    return res.json({
      success: true,
      data: {
        bookingReference,
        lastName,
        totalRecords: history.length,
        history,
      },
    });

  } catch (error) {
    console.error('❌ Error getting history:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get history',
    });
  }
});

/**
 * GET /api/v2/flight-monitoring/active
 * Lista todos os monitoramentos ativos
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const service = getFlightMonitoringService();

    const activeMonitors = await service.listActiveMonitors();

    return res.json({
      success: true,
      data: {
        total: activeMonitors.length,
        monitors: activeMonitors,
      },
    });

  } catch (error) {
    console.error('❌ Error listing active monitors:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list monitors',
    });
  }
});

/**
 * POST /api/v2/flight-monitoring/parse
 * Parse reservation details from raw data
 */
router.post('/parse', async (req: Request, res: Response) => {
  try {
    const { bookingData } = req.body;

    if (!bookingData) {
      return res.status(400).json({
        success: false,
        error: 'bookingData is required',
      });
    }

    const service = getFlightMonitoringService();

    const parsed = service.parseReservationDetails(bookingData);

    return res.json({
      success: true,
      data: parsed,
    });

  } catch (error) {
    console.error('❌ Error parsing reservation:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse reservation',
    });
  }
});

/**
 * GET /api/v2/flight-monitoring/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const service = getFlightMonitoringService();

    const activeMonitors = await service.listActiveMonitors();

    return res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date(),
      stats: {
        activeMonitors: activeMonitors.length,
        totalChecks: activeMonitors.reduce((sum, m) => sum + m.checksPerformed, 0),
        totalChanges: activeMonitors.reduce((sum, m) => sum + m.changesDetected, 0),
      },
    });

  } catch (error) {
    console.error('❌ Health check failed:', error);

    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Service unavailable',
    });
  }
});

export default router;
