/**
 * Flight Routes
 * Rotas REST para operações de voo
 *
 * Base path: /api/flights
 */

import { Router } from 'express';
import { flightControllerHandlers } from '../controllers/flightController';

const router = Router();

// ============================================================================
// FLIGHT STATUS
// ============================================================================

/**
 * GET /api/flights/status
 * Busca status atual de um voo
 *
 * Query params:
 * - bookingReference: string (required)
 * - lastName: string (required)
 * - airline: string (optional)
 * - useCache: boolean (optional, default: true)
 *
 * Example:
 * GET /api/flights/status?bookingReference=PDCDX&lastName=DINIZ&airline=G3
 */
router.get('/status', flightControllerHandlers.getStatus);

// ============================================================================
// MONITORING
// ============================================================================

/**
 * POST /api/flights/monitor
 * Inicia monitoramento contínuo de um voo
 *
 * Body:
 * {
 *   bookingReference: string,
 *   lastName: string,
 *   pollingIntervalMinutes: number (5-120, default: 15),
 *   notifyOnChange: boolean,
 *   notifyOnDelay: boolean,
 *   notifyOnGateChange: boolean,
 *   notifyChannels: ['email', 'sms', 'push', 'webhook']
 * }
 */
router.post('/monitor', flightControllerHandlers.startMonitoring);

/**
 * GET /api/flights/monitor
 * Lista todos os monitoramentos ativos
 *
 * Query params:
 * - status: 'ACTIVE' | 'PAUSED' | 'STOPPED' (optional)
 */
router.get('/monitor', flightControllerHandlers.listMonitoring);

/**
 * GET /api/flights/monitor/:monitoringId
 * Obtém detalhes e histórico de um monitoramento
 *
 * Params:
 * - monitoringId: string (formato: BOOKINGREF:LASTNAME)
 *
 * Query params:
 * - includeHistory: boolean (default: true)
 * - historyLimit: number (default: 20)
 */
router.get('/monitor/:monitoringId', flightControllerHandlers.getMonitoring);

/**
 * DELETE /api/flights/monitor/:monitoringId
 * Para um monitoramento ativo
 *
 * Params:
 * - monitoringId: string (formato: BOOKINGREF:LASTNAME)
 */
router.delete('/monitor/:monitoringId', flightControllerHandlers.stopMonitoring);

export default router;
