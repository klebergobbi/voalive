/**
 * Flight Monitoring Cache & History Routes
 * Additional endpoints for cache management, history, and rate limiting
 */

import { Router, Request, Response } from 'express';
import { getFlightMonitoringService } from '../services/flightMonitoring';

const router = Router();

// ============================================================================
// CACHE & HISTORY ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/flight-monitoring/history/:bookingReference/:lastName
 * Obtém histórico de mudanças de um voo
 */
router.get('/history/:bookingReference/:lastName', async (req: Request, res: Response) => {
  try {
    const { bookingReference, lastName } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const service = getFlightMonitoringService();
    const history = await service.getFlightHistory(bookingReference, lastName, limit);

    return res.json({
      success: true,
      data: history,
    });

  } catch (error) {
    console.error('❌ Error getting flight history:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v2/flight-monitoring/changes/:bookingReference/:lastName
 * Obtém mudanças detectadas entre os últimos 2 checks
 */
router.get('/changes/:bookingReference/:lastName', async (req: Request, res: Response) => {
  try {
    const { bookingReference, lastName } = req.params;

    const service = getFlightMonitoringService();
    const changes = await service.getFlightChanges(bookingReference, lastName);

    return res.json({
      success: true,
      data: changes,
    });

  } catch (error) {
    console.error('❌ Error getting flight changes:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v2/flight-monitoring/cache/stats
 * Obtém estatísticas do cache
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const service = getFlightMonitoringService();
    const stats = await service.getCacheStats();

    return res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/v2/flight-monitoring/cache/:bookingReference/:lastName
 * Limpa cache de um voo específico
 */
router.delete('/cache/:bookingReference/:lastName', async (req: Request, res: Response) => {
  try {
    const { bookingReference, lastName } = req.params;

    const service = getFlightMonitoringService();
    const deleted = await service.clearCache(bookingReference, lastName);

    return res.json({
      success: true,
      data: { deleted },
      message: deleted ? 'Cache cleared successfully' : 'No cache entry found',
    });

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v2/flight-monitoring/rate-limit/:identifier
 * Verifica status do rate limit para um IP ou usuário
 */
router.get('/rate-limit/:identifier', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const type = (req.query.type as 'ip' | 'user') || 'ip';

    const service = getFlightMonitoringService();
    const rateLimitInfo = await service.checkRateLimit(identifier, type);

    return res.json({
      success: true,
      data: rateLimitInfo,
    });

  } catch (error) {
    console.error('❌ Error checking rate limit:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/v2/flight-monitoring/rate-limit/:identifier
 * Reseta rate limit para um IP ou usuário
 */
router.delete('/rate-limit/:identifier', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const type = (req.query.type as 'ip' | 'user') || 'ip';

    const service = getFlightMonitoringService();
    await service.resetRateLimit(identifier, type);

    return res.json({
      success: true,
      message: `Rate limit reset for ${type}: ${identifier}`,
    });

  } catch (error) {
    console.error('❌ Error resetting rate limit:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
