/**
 * Airline Monitoring Routes
 * Rotas REST para o sistema de monitoramento de reservas
 */

import { Router } from 'express';
import { getAirlineMonitoringService } from '../services/airline-monitoring.service';
import { getWebhookNotificationService } from '../services/webhook-notification.service';
import { getQueueManager } from '../queues/queue-manager';
import { ScraperFactory } from '../scrapers/scraper.factory';

const router = Router();

/**
 * POST /api/monitoring/bookings
 * Adiciona reserva ao monitoramento
 */
router.post('/bookings', async (req, res) => {
  try {
    const { pnr, airline, lastName, flightNumber, departureDate, route, checkInterval } = req.body;

    // Validar campos obrigatórios
    if (!pnr || !airline || !lastName || !flightNumber || !departureDate || !route) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: pnr, airline, lastName, flightNumber, departureDate, route',
      });
    }

    // Validar companhia aérea
    if (!ScraperFactory.isSupported(airline)) {
      return res.status(400).json({
        success: false,
        error: `Companhia aérea não suportada: ${airline}. Suportadas: ${ScraperFactory.getSupportedAirlines().join(', ')}`,
      });
    }

    const monitoringService = getAirlineMonitoringService();

    const booking = await monitoringService.addBookingToMonitor({
      pnr,
      airline,
      lastName,
      flightNumber,
      departureDate: new Date(departureDate),
      route,
      checkInterval: checkInterval || 15,
    });

    res.status(201).json({
      success: true,
      data: booking,
      message: 'Reserva adicionada ao monitoramento com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao adicionar reserva ao monitoramento:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao adicionar reserva',
    });
  }
});

/**
 * GET /api/monitoring/bookings/:pnr
 * Consulta histórico de uma reserva
 */
router.get('/bookings/:pnr', async (req, res) => {
  try {
    const { pnr } = req.params;

    const monitoringService = getAirlineMonitoringService();
    const booking = await monitoringService.getBookingHistory(pnr.toUpperCase());

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Reserva não encontrada',
      });
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error: any) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao buscar histórico',
    });
  }
});

/**
 * DELETE /api/monitoring/bookings/:pnr
 * Remove reserva do monitoramento
 */
router.delete('/bookings/:pnr', async (req, res) => {
  try {
    const { pnr } = req.params;

    const monitoringService = getAirlineMonitoringService();
    await monitoringService.stopMonitoring(pnr.toUpperCase());

    res.status(204).send();
  } catch (error: any) {
    console.error('Erro ao parar monitoramento:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao parar monitoramento',
    });
  }
});

/**
 * POST /api/monitoring/bookings/:pnr/check
 * Força verificação imediata de uma reserva
 */
router.post('/bookings/:pnr/check', async (req, res) => {
  try {
    const { pnr } = req.params;

    const { PrismaClient } = await import('@reservasegura/database');
    const prisma = new PrismaClient();

    const booking = await prisma.externalBooking.findFirst({
      where: { bookingCode: pnr.toUpperCase() },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Reserva não encontrada',
      });
    }

    // Adicionar job imediato na fila
    const queueManager = getQueueManager();
    const queue = queueManager.getBookingMonitorQueue();

    await queue.add(
      'check-booking-status',
      {
        bookingId: booking.id,
        pnr: booking.bookingCode,
        lastName: booking.lastName,
        airline: booking.airline,
      },
      {
        delay: 0,
        priority: 1, // Alta prioridade
      }
    );

    res.json({
      success: true,
      message: 'Verificação imediata agendada',
    });
  } catch (error: any) {
    console.error('Erro ao agendar verificação:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao agendar verificação',
    });
  }
});

/**
 * GET /api/monitoring/airlines
 * Lista companhias aéreas suportadas
 */
router.get('/airlines', (req, res) => {
  res.json({
    success: true,
    data: ScraperFactory.getSupportedAirlines(),
  });
});

/**
 * GET /api/monitoring/queue/stats
 * Retorna estatísticas da fila
 */
router.get('/queue/stats', async (req, res) => {
  try {
    const queueManager = getQueueManager();
    const stats = await queueManager.getQueueStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao obter estatísticas',
    });
  }
});

/**
 * POST /api/monitoring/queue/clean
 * Limpa jobs antigos da fila
 */
router.post('/queue/clean', async (req, res) => {
  try {
    const queueManager = getQueueManager();
    await queueManager.cleanQueue();

    res.json({
      success: true,
      message: 'Fila limpa com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao limpar fila:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao limpar fila',
    });
  }
});

/**
 * POST /api/monitoring/webhook/test
 * Testa configuração do webhook
 */
router.post('/webhook/test', async (req, res) => {
  try {
    const webhookService = getWebhookNotificationService();
    const result = await webhookService.testWebhook();

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        responseTime: result.responseTime,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error: any) {
    console.error('Erro ao testar webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao testar webhook',
    });
  }
});

/**
 * GET /api/health
 * Health check
 */
router.get('/health', async (req, res) => {
  try {
    const { PrismaClient } = await import('@reservasegura/database');
    const prisma = new PrismaClient();

    // Testar banco de dados
    await prisma.$queryRaw`SELECT 1`;

    // Testar Redis/Fila
    const queueManager = getQueueManager();
    const stats = await queueManager.getQueueStats();

    res.json({
      status: 'ok',
      database: 'connected',
      redis: 'connected',
      queue: {
        status: 'healthy',
        stats,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/metrics
 * Retorna métricas do sistema
 */
router.get('/metrics', async (req, res) => {
  try {
    const { PrismaClient } = await import('@reservasegura/database');
    const prisma = new PrismaClient();

    const [totalBookings, activeBookings, totalNotifications, pendingNotifications] = await Promise.all([
      prisma.externalBooking.count(),
      prisma.externalBooking.count({ where: { autoUpdate: true } }),
      prisma.notification.count(),
      prisma.notification.count({ where: { status: 'PENDING' } }),
    ]);

    const queueManager = getQueueManager();
    const queueStats = await queueManager.getQueueStats();

    res.json({
      success: true,
      data: {
        bookings: {
          total: totalBookings,
          active: activeBookings,
          inactive: totalBookings - activeBookings,
        },
        notifications: {
          total: totalNotifications,
          pending: pendingNotifications,
          sent: totalNotifications - pendingNotifications,
        },
        queue: queueStats,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao obter métricas',
    });
  }
});

export default router;
