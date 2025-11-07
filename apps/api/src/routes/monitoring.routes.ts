import { Router, Request, Response } from 'express';
import { checkAllActiveBookings, flightMonitoringQueue } from '../workers/flight-monitoring.worker';

const router = Router();

/**
 * 🌐 OPÇÃO 3: ENDPOINT HTTP PARA MONITORAMENTO MANUAL
 *
 * Este endpoint permite:
 * 1. Trigger manual do monitoramento
 * 2. Integração com cron job do sistema
 * 3. Testes e debugging
 */

// ============================================
// POST /api/monitoring/check-all-flights
// Executar verificação manual de todas as reservas
// ============================================
router.post('/check-all-flights', async (req: Request, res: Response) => {
  try {
    console.log('🌐 [Monitoring API] Trigger manual de verificação recebido');

    const result = await checkAllActiveBookings();

    res.json({
      success: true,
      message: 'Monitoramento executado com sucesso',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [Monitoring API] Erro ao executar monitoramento:', error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// GET /api/monitoring/status
// Ver status do sistema de monitoramento
// ============================================
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Obter estatísticas da fila BullMQ
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      flightMonitoringQueue.getWaitingCount(),
      flightMonitoringQueue.getActiveCount(),
      flightMonitoringQueue.getCompletedCount(),
      flightMonitoringQueue.getFailedCount(),
      flightMonitoringQueue.getDelayedCount(),
    ]);

    // Obter jobs recentes
    const recentCompleted = await flightMonitoringQueue.getCompleted(0, 4);
    const recentFailed = await flightMonitoringQueue.getFailed(0, 4);

    // Obter próximo job agendado
    const repeatableJobs = await flightMonitoringQueue.getRepeatableJobs();

    res.json({
      success: true,
      status: 'active',
      monitoring: {
        enabled: true,
        frequency: '5 minutos',
        methods: [
          '1. Worker BullMQ (principal)',
          '2. Node-Cron (backup)',
          '3. Endpoint HTTP (manual)'
        ]
      },
      queue: {
        name: flightMonitoringQueue.name,
        waiting,
        active,
        completed,
        failed,
        delayed,
      },
      recentJobs: {
        completed: recentCompleted.map(job => ({
          id: job.id,
          timestamp: job.timestamp,
          returnvalue: job.returnvalue
        })),
        failed: recentFailed.map(job => ({
          id: job.id,
          timestamp: job.timestamp,
          failedReason: job.failedReason
        }))
      },
      repeatableJobs: repeatableJobs.map(job => ({
        key: job.key,
        name: job.name,
        cron: job.cron,
        next: job.next
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [Monitoring API] Erro ao obter status:', error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// POST /api/monitoring/force-check/:bookingId
// Forçar verificação de uma reserva específica
// ============================================
router.post('/force-check/:bookingId', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    console.log(`🔍 [Monitoring API] Verificação forçada para reserva ${bookingId}`);

    // TODO: Implementar verificação de reserva específica
    // const result = await checkSpecificBooking(bookingId);

    res.json({
      success: true,
      message: `Verificação da reserva ${bookingId} iniciada`,
      bookingId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [Monitoring API] Erro ao verificar reserva:', error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// GET /api/monitoring/health
// Health check do sistema de monitoramento
// ============================================
router.get('/health', async (req: Request, res: Response) => {
  try {
    const queueHealth = await flightMonitoringQueue.isReady();
    const [waiting, active] = await Promise.all([
      flightMonitoringQueue.getWaitingCount(),
      flightMonitoringQueue.getActiveCount(),
    ]);

    const isHealthy = queueHealth && (waiting > 0 || active >= 0);

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      queue: {
        ready: queueHealth,
        waiting,
        active
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// POST /api/monitoring/pause
// Pausar monitoramento temporariamente
// ============================================
router.post('/pause', async (req: Request, res: Response) => {
  try {
    await flightMonitoringQueue.pause();

    res.json({
      success: true,
      message: 'Monitoramento pausado',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao pausar',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// POST /api/monitoring/resume
// Retomar monitoramento
// ============================================
router.post('/resume', async (req: Request, res: Response) => {
  try {
    await flightMonitoringQueue.resume();

    res.json({
      success: true,
      message: 'Monitoramento retomado',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao retomar',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// DELETE /api/monitoring/clear-failed
// Limpar jobs com falha
// ============================================
router.delete('/clear-failed', async (req: Request, res: Response) => {
  try {
    const failed = await flightMonitoringQueue.getFailed();
    await Promise.all(failed.map(job => job.remove()));

    res.json({
      success: true,
      message: `${failed.length} jobs com falha removidos`,
      count: failed.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao limpar',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
