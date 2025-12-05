/**
 * RESERVATION MONITORING CONTROLLER
 * API REST para gerenciamento de reservas monitoradas
 *
 * Endpoints:
 * POST   /api/v2/monitoring/register         - Cadastrar reserva
 * GET    /api/v2/monitoring/my-reservations  - Listar reservas
 * GET    /api/v2/monitoring/:id              - Detalhes de uma reserva
 * POST   /api/v2/monitoring/:id/check        - Verificar reserva manualmente
 * POST   /api/v2/monitoring/:id/pause        - Pausar monitoramento
 * POST   /api/v2/monitoring/:id/resume       - Retomar monitoramento
 * DELETE /api/v2/monitoring/:id              - Remover reserva
 * GET    /api/v2/monitoring/:pnr/history     - Historico de mudancas
 * GET    /api/v2/monitoring/stats/general    - Estatisticas gerais
 * POST   /api/v2/monitoring/trigger-cycle    - Executar ciclo manualmente
 * GET    /api/v2/monitoring/worker/status    - Status do worker
 */

import { Router, Request, Response } from 'express';
import { getReservationMonitoringService } from '../services/reservation-monitoring.service';
import { getReservationMonitoringWorker } from '../workers/reservation-monitoring.worker';

const router = Router();
const monitoringService = getReservationMonitoringService();
const monitoringWorker = getReservationMonitoringWorker();

/**
 * POST /api/v2/monitoring/register
 * Cadastra uma nova reserva para monitoramento
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { airline, pnr, lastName, origin, departureDate, flightNumber, destination } = req.body;

    // Validacao
    if (!airline || !pnr || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatorios: airline, pnr, lastName',
      });
    }

    // Validar companhia aerea
    const validAirlines = ['GOL', 'G3', 'LATAM', 'LA', 'JJ', 'AZUL', 'AD'];
    if (!validAirlines.includes(airline.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Companhia aerea invalida. Validas: ${validAirlines.join(', ')}`,
      });
    }

    const result = await monitoringService.registerReservation({
      airline: airline.toUpperCase(),
      pnr: pnr.toUpperCase(),
      lastName: lastName.toUpperCase(),
      origin: origin?.toUpperCase(),
      departureDate: departureDate ? new Date(departureDate) : undefined,
      flightNumber,
      destination: destination?.toUpperCase(),
    });

    res.json({
      success: true,
      message: 'Reserva cadastrada para monitoramento',
      data: result,
    });

  } catch (error: any) {
    console.error('[MonitoringController] Erro ao registrar:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v2/monitoring/my-reservations
 * Lista todas as reservas monitoradas
 */
router.get('/my-reservations', async (req: Request, res: Response) => {
  try {
    const { airline, status, activeOnly } = req.query;

    const reservations = await monitoringService.getMonitoredReservations({
      airline: airline as string,
      status: status as string,
      activeOnly: activeOnly === 'true',
    });

    res.json({
      success: true,
      count: reservations.length,
      data: reservations,
    });

  } catch (error: any) {
    console.error('[MonitoringController] Erro ao listar:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v2/monitoring/:id
 * Retorna detalhes de uma reserva especifica
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reservations = await monitoringService.getMonitoredReservations();
    const reservation = reservations.find(r => r.id === id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reserva nao encontrada',
      });
    }

    res.json({
      success: true,
      data: reservation,
    });

  } catch (error: any) {
    console.error('[MonitoringController] Erro ao buscar:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v2/monitoring/:id/check
 * Verifica uma reserva manualmente
 */
router.post('/:id/check', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await monitoringService.checkReservation(id);

    res.json({
      success: true,
      message: result.success ? 'Verificacao concluida' : 'Falha na verificacao',
      data: result,
    });

  } catch (error: any) {
    console.error('[MonitoringController] Erro ao verificar:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v2/monitoring/:id/pause
 * Pausa o monitoramento de uma reserva
 */
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await monitoringService.pauseMonitoring(id);

    res.json({
      success: true,
      message: 'Monitoramento pausado',
    });

  } catch (error: any) {
    console.error('[MonitoringController] Erro ao pausar:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v2/monitoring/:id/resume
 * Retoma o monitoramento de uma reserva
 */
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await monitoringService.resumeMonitoring(id);

    res.json({
      success: true,
      message: 'Monitoramento retomado',
    });

  } catch (error: any) {
    console.error('[MonitoringController] Erro ao retomar:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/v2/monitoring/:id
 * Remove uma reserva do monitoramento
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await monitoringService.removeReservation(id);

    res.json({
      success: true,
      message: 'Reserva removida do monitoramento',
    });

  } catch (error: any) {
    console.error('[MonitoringController] Erro ao remover:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v2/monitoring/:pnr/history
 * Retorna historico de mudancas de uma reserva
 */
router.get('/:pnr/history', async (req: Request, res: Response) => {
  try {
    const { pnr } = req.params;

    const history = await monitoringService.getChangeHistory(pnr);

    res.json({
      success: true,
      count: history.length,
      data: history,
    });

  } catch (error: any) {
    console.error('[MonitoringController] Erro ao buscar historico:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v2/monitoring/stats/general
 * Retorna estatisticas gerais do monitoramento
 */
router.get('/stats/general', async (req: Request, res: Response) => {
  try {
    const stats = await monitoringService.getStats();
    const workerStatus = monitoringWorker.getStatus();

    res.json({
      success: true,
      data: {
        ...stats,
        worker: workerStatus,
      },
    });

  } catch (error: any) {
    console.error('[MonitoringController] Erro ao buscar estatisticas:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v2/monitoring/trigger-cycle
 * Executa um ciclo de monitoramento manualmente
 */
router.post('/trigger-cycle', async (req: Request, res: Response) => {
  try {
    console.log('[MonitoringController] Ciclo manual solicitado');

    const result = await monitoringWorker.triggerManually();

    res.json({
      success: true,
      message: 'Ciclo de monitoramento executado',
      data: result,
    });

  } catch (error: any) {
    console.error('[MonitoringController] Erro ao executar ciclo:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v2/monitoring/worker/status
 * Retorna status do worker de monitoramento
 */
router.get('/worker/status', async (req: Request, res: Response) => {
  try {
    const status = monitoringWorker.getStatus();

    res.json({
      success: true,
      data: status,
    });

  } catch (error: any) {
    console.error('[MonitoringController] Erro ao buscar status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v2/monitoring/worker/start
 * Inicia o worker de monitoramento
 */
router.post('/worker/start', async (req: Request, res: Response) => {
  try {
    monitoringWorker.start();

    res.json({
      success: true,
      message: 'Worker iniciado',
      data: monitoringWorker.getStatus(),
    });

  } catch (error: any) {
    console.error('[MonitoringController] Erro ao iniciar worker:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v2/monitoring/worker/stop
 * Para o worker de monitoramento
 */
router.post('/worker/stop', async (req: Request, res: Response) => {
  try {
    monitoringWorker.stop();

    res.json({
      success: true,
      message: 'Worker parado',
      data: monitoringWorker.getStatus(),
    });

  } catch (error: any) {
    console.error('[MonitoringController] Erro ao parar worker:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
