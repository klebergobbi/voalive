/**
 * Flight Controller
 * Controlador REST para operações de voo
 *
 * Endpoints:
 * - GET  /api/flights/status - Buscar status de voo
 * - POST /api/flights/monitor - Iniciar monitoramento contínuo
 * - GET  /api/flights/monitor/:monitoringId - Obter histórico de monitoramento
 * - WS   /ws/flights/:monitoringId - Stream de atualizações em tempo real
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { getFlightMonitoringService } from '../services/flightMonitoring';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const getStatusSchema = z.object({
  bookingReference: z.string()
    .min(5, 'Código de reserva deve ter no mínimo 5 caracteres')
    .max(8, 'Código de reserva deve ter no máximo 8 caracteres')
    .transform(val => val.toUpperCase()),
  lastName: z.string()
    .min(2, 'Sobrenome deve ter no mínimo 2 caracteres')
    .transform(val => val.toUpperCase()),
  airline: z.string()
    .length(2, 'Código da companhia deve ter 2 caracteres')
    .optional(),
  useCache: z.string()
    .transform(val => val === 'true')
    .optional()
    .default('true'),
});

const startMonitoringSchema = z.object({
  bookingReference: z.string()
    .min(5)
    .max(8)
    .transform(val => val.toUpperCase()),
  lastName: z.string()
    .min(2)
    .transform(val => val.toUpperCase()),
  pollingIntervalMinutes: z.number()
    .min(5, 'Intervalo mínimo de 5 minutos')
    .max(120, 'Intervalo máximo de 120 minutos')
    .default(15),
  notifyOnChange: z.boolean().optional().default(true),
  notifyOnDelay: z.boolean().optional().default(true),
  notifyOnGateChange: z.boolean().optional().default(true),
  notifyChannels: z.array(z.enum(['email', 'sms', 'push', 'webhook'])).optional(),
});

// ============================================================================
// CONTROLLER CLASS
// ============================================================================

export class FlightController {
  /**
   * GET /api/flights/status
   * Busca status atual de um voo por referência de reserva
   *
   * Query params:
   * - bookingReference: string (required)
   * - lastName: string (required)
   * - airline: string (optional)
   * - useCache: boolean (optional, default: true)
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     flightNumber: "G31234",
   *     status: "SCHEDULED",
   *     gate: "12",
   *     terminal: "2",
   *     departure: {
   *       airport: "GRU",
   *       scheduledTime: "2025-01-15T10:30:00Z",
   *       estimatedTime: "2025-01-15T10:30:00Z",
   *       actualTime: null,
   *       gate: "12",
   *       terminal: "2"
   *     },
   *     arrival: {
   *       airport: "SDU",
   *       scheduledTime: "2025-01-15T12:45:00Z",
   *       estimatedTime: "2025-01-15T12:45:00Z",
   *       actualTime: null,
   *       gate: "5",
   *       terminal: "1"
   *     },
   *     delay: null,
   *     airline: "GOL",
   *     aircraft: "Boeing 737-800",
   *     bookingReference: "PDCDX",
   *     source: "CACHE" | "API" | "SCRAPING"
   *   }
   * }
   */
  async getStatus(req: Request, res: Response): Promise<Response> {
    try {
      // Validate query params
      const params = getStatusSchema.parse(req.query);

      console.log(`🔍 [FlightController] Getting status for ${params.bookingReference} - ${params.lastName}`);

      // Get client IP for rate limiting
      const clientIp = this.getClientIp(req);

      // Get service instance
      const service = getFlightMonitoringService();

      // Search flight status
      const result = await service.getFlightStatusByReservation(
        params.bookingReference,
        params.lastName,
        {
          airline: params.airline,
          useCache: params.useCache,
          ip: clientIp,
        }
      );

      // Handle rate limiting
      if (result.status === 'RATE_LIMITED') {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: result.error,
        });
      }

      // Handle not found
      if (!result.success || !result.flight) {
        return res.status(404).json({
          success: false,
          error: 'Flight not found',
          message: result.error || 'Voo não encontrado. Verifique os dados da reserva.',
          bookingReference: params.bookingReference,
          lastName: params.lastName,
        });
      }

      // Success response
      return res.json({
        success: true,
        data: {
          flightNumber: result.flight.flightNumber,
          status: result.flight.status,
          gate: result.flight.departure.gate,
          terminal: result.flight.departure.terminal,
          departure: result.flight.departure,
          arrival: result.flight.arrival,
          delay: result.flight.delay,
          airline: result.flight.airline,
          airlineName: result.flight.airlineName,
          aircraft: result.flight.aircraft,
          bookingReference: result.bookingReference,
          lastName: result.lastName,
          source: result.source,
          lastUpdated: result.flight.lastUpdated,
          timestamp: result.timestamp,
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

      console.error('❌ [FlightController] Error getting status:', error);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/flights/monitor
   * Inicia monitoramento contínuo de um voo
   *
   * Body:
   * {
   *   bookingReference: string,
   *   lastName: string,
   *   pollingIntervalMinutes: number (5-120, default: 15),
   *   notifyOnChange: boolean (default: true),
   *   notifyOnDelay: boolean (default: true),
   *   notifyOnGateChange: boolean (default: true),
   *   notifyChannels: ['email', 'sms', 'push', 'webhook'] (optional)
   * }
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     monitoringId: "PDCDX:DINIZ",
   *     bookingReference: "PDCDX",
   *     lastName: "DINIZ",
   *     status: "ACTIVE",
   *     intervalMinutes: 15,
   *     nextCheck: "2025-01-15T10:45:00Z",
   *     startedAt: "2025-01-15T10:30:00Z",
   *     currentStatus: {...}
   *   }
   * }
   */
  async startMonitoring(req: Request, res: Response): Promise<Response> {
    try {
      // Validate body
      const body = startMonitoringSchema.parse(req.body);

      console.log(`🚀 [FlightController] Starting monitoring for ${body.bookingReference} - ${body.lastName}`);

      // Get service instance
      const service = getFlightMonitoringService();

      // Start monitoring
      const job = await service.monitorFlightContinuous(
        body.bookingReference,
        body.lastName,
        {
          intervalMinutes: body.pollingIntervalMinutes,
          notifyOnChange: body.notifyOnChange,
          notifyOnDelay: body.notifyOnDelay,
          notifyOnGateChange: body.notifyOnGateChange,
          notifyChannels: body.notifyChannels,
        }
      );

      // Success response
      return res.status(201).json({
        success: true,
        message: 'Monitoring started successfully',
        data: {
          monitoringId: job.id,
          bookingReference: job.bookingReference,
          lastName: job.lastName,
          status: job.status,
          intervalMinutes: job.intervalMinutes,
          nextCheck: job.nextCheckAt,
          startedAt: job.startedAt,
          currentStatus: job.currentFlightStatus,
          websocketUrl: `/ws/flights/${job.id}`,
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

      // Handle already monitoring error
      if (error instanceof Error && error.message.includes('já está sendo monitorado')) {
        return res.status(409).json({
          success: false,
          error: 'Conflict',
          message: error.message,
        });
      }

      console.error('❌ [FlightController] Error starting monitoring:', error);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/flights/monitor/:monitoringId
   * Obtém detalhes e histórico de um monitoramento ativo
   *
   * Params:
   * - monitoringId: string (formato: BOOKINGREF:LASTNAME)
   *
   * Query params:
   * - includeHistory: boolean (default: true)
   * - historyLimit: number (default: 20)
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     monitoringId: "PDCDX:DINIZ",
   *     bookingReference: "PDCDX",
   *     lastName: "DINIZ",
   *     status: "ACTIVE",
   *     intervalMinutes: 15,
   *     startedAt: "2025-01-15T10:30:00Z",
   *     lastCheckAt: "2025-01-15T11:00:00Z",
   *     nextCheckAt: "2025-01-15T11:15:00Z",
   *     checksPerformed: 3,
   *     changesDetected: 1,
   *     currentStatus: {...},
   *     history: [
   *       {
   *         timestamp: "2025-01-15T11:00:00Z",
   *         status: {...},
   *         changes: ["Portão alterado de 12 para 15"],
   *         source: "SCRAPING"
   *       },
   *       ...
   *     ]
   *   }
   * }
   */
  async getMonitoring(req: Request, res: Response): Promise<Response> {
    try {
      const { monitoringId } = req.params;
      const includeHistory = req.query.includeHistory !== 'false';
      const historyLimit = parseInt(req.query.historyLimit as string, 10) || 20;

      console.log(`📊 [FlightController] Getting monitoring details for ${monitoringId}`);

      // Validate monitoringId format
      if (!monitoringId || !monitoringId.includes(':')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid monitoring ID format',
          message: 'Monitoring ID deve estar no formato BOOKINGREF:LASTNAME',
        });
      }

      const [bookingReference, lastName] = monitoringId.split(':');

      // Get service instance
      const service = getFlightMonitoringService();

      // Get monitoring job details
      const job = await service.getMonitoringStatus(bookingReference, lastName);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Monitoring not found',
          message: `Nenhum monitoramento encontrado para ${monitoringId}`,
        });
      }

      // Build response
      const response: any = {
        success: true,
        data: {
          monitoringId: job.id,
          bookingReference: job.bookingReference,
          lastName: job.lastName,
          status: job.status,
          intervalMinutes: job.intervalMinutes,
          startedAt: job.startedAt,
          lastCheckAt: job.lastCheckAt,
          nextCheckAt: job.nextCheckAt,
          checksPerformed: job.checksPerformed,
          changesDetected: job.changesDetected,
          currentStatus: job.currentFlightStatus,
          options: job.options,
          websocketUrl: `/ws/flights/${job.id}`,
        },
      };

      // Include history if requested
      if (includeHistory) {
        const history = await service.getFlightHistory(
          bookingReference,
          lastName,
          historyLimit
        );

        response.data.history = history;

        // Include detected changes
        const changes = await service.getFlightChanges(bookingReference, lastName);
        response.data.recentChanges = changes;
      }

      return res.json(response);

    } catch (error) {
      console.error('❌ [FlightController] Error getting monitoring:', error);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/flights/monitor/:monitoringId
   * Para um monitoramento ativo
   *
   * Params:
   * - monitoringId: string (formato: BOOKINGREF:LASTNAME)
   *
   * Response:
   * {
   *   success: true,
   *   message: "Monitoring stopped successfully"
   * }
   */
  async stopMonitoring(req: Request, res: Response): Promise<Response> {
    try {
      const { monitoringId } = req.params;

      console.log(`⏹️ [FlightController] Stopping monitoring for ${monitoringId}`);

      // Validate monitoringId format
      if (!monitoringId || !monitoringId.includes(':')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid monitoring ID format',
          message: 'Monitoring ID deve estar no formato BOOKINGREF:LASTNAME',
        });
      }

      const [bookingReference, lastName] = monitoringId.split(':');

      // Get service instance
      const service = getFlightMonitoringService();

      // Stop monitoring
      await service.stopMonitoring(bookingReference, lastName);

      return res.json({
        success: true,
        message: 'Monitoring stopped successfully',
        monitoringId,
      });

    } catch (error) {
      // Handle not found error
      if (error instanceof Error && error.message.includes('não encontrado')) {
        return res.status(404).json({
          success: false,
          error: 'Monitoring not found',
          message: error.message,
        });
      }

      console.error('❌ [FlightController] Error stopping monitoring:', error);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/flights/monitor
   * Lista todos os monitoramentos ativos
   *
   * Query params:
   * - status: 'ACTIVE' | 'PAUSED' | 'STOPPED' (optional)
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     total: 5,
   *     active: 3,
   *     paused: 2,
   *     monitors: [...]
   *   }
   * }
   */
  async listMonitoring(req: Request, res: Response): Promise<Response> {
    try {
      const statusFilter = req.query.status as string | undefined;

      console.log('📋 [FlightController] Listing all monitoring jobs');

      // Get service instance
      const service = getFlightMonitoringService();

      // Get all monitoring jobs
      const monitors = await service.listAllMonitoring();

      // Filter by status if requested
      const filtered = statusFilter
        ? monitors.filter(m => m.status === statusFilter)
        : monitors;

      // Calculate stats
      const stats = {
        total: monitors.length,
        active: monitors.filter(m => m.status === 'ACTIVE').length,
        paused: monitors.filter(m => m.status === 'PAUSED').length,
        stopped: monitors.filter(m => m.status === 'STOPPED').length,
      };

      return res.json({
        success: true,
        data: {
          stats,
          monitors: filtered.map(m => ({
            monitoringId: m.id,
            bookingReference: m.bookingReference,
            lastName: m.lastName,
            status: m.status,
            intervalMinutes: m.intervalMinutes,
            startedAt: m.startedAt,
            lastCheckAt: m.lastCheckAt,
            nextCheckAt: m.nextCheckAt,
            checksPerformed: m.checksPerformed,
            changesDetected: m.changesDetected,
            websocketUrl: `/ws/flights/${m.id}`,
          })),
        },
      });

    } catch (error) {
      console.error('❌ [FlightController] Error listing monitoring:', error);

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get client IP address from request
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.headers['x-real-ip'] as string ||
      req.socket.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let controllerInstance: FlightController | null = null;

/**
 * Get FlightController singleton instance
 */
export function getFlightController(): FlightController {
  if (!controllerInstance) {
    controllerInstance = new FlightController();
  }
  return controllerInstance;
}

/**
 * Create route handlers (for Express router)
 */
export const flightControllerHandlers = {
  getStatus: (req: Request, res: Response) => {
    return getFlightController().getStatus(req, res);
  },
  startMonitoring: (req: Request, res: Response) => {
    return getFlightController().startMonitoring(req, res);
  },
  getMonitoring: (req: Request, res: Response) => {
    return getFlightController().getMonitoring(req, res);
  },
  stopMonitoring: (req: Request, res: Response) => {
    return getFlightController().stopMonitoring(req, res);
  },
  listMonitoring: (req: Request, res: Response) => {
    return getFlightController().listMonitoring(req, res);
  },
};

export default FlightController;
