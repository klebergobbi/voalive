/**
 * 🛣️ BOOKING MONITOR ROUTES
 * Rotas para monitoramento de reservas via web scraping
 */

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getBookingMonitorService } from '../services/booking-monitor.service';

const router = Router();
const monitorService = getBookingMonitorService();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * POST /api/booking-monitor/connect-account
 * Conecta conta de companhia aérea
 */
router.post('/connect-account', async (req, res) => {
  try {
    const { airline, email, password } = req.body;
    const userId = (req as any).user.id;

    if (!airline || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'airline, email e password são obrigatórios'
      });
    }

    if (!['GOL', 'LATAM', 'AZUL'].includes(airline)) {
      return res.status(400).json({
        success: false,
        error: 'Companhia inválida. Use: GOL, LATAM ou AZUL'
      });
    }

    const account = await monitorService.connectAirlineAccount(
      userId,
      airline,
      email,
      password
    );

    res.json({
      success: true,
      data: {
        id: account.id,
        airline: account.airline,
        email: account.accountEmail,
        isActive: account.isActive,
        lastLoginAt: account.lastLoginAt
      }
    });
  } catch (error: any) {
    console.error('Erro ao conectar conta:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao conectar conta'
    });
  }
});

/**
 * POST /api/booking-monitor/add-booking
 * Adiciona reserva para monitoramento
 */
router.post('/add-booking', async (req, res) => {
  try {
    const { accountId, bookingCode } = req.body;

    if (!accountId || !bookingCode) {
      return res.status(400).json({
        success: false,
        error: 'accountId e bookingCode são obrigatórios'
      });
    }

    const monitor = await monitorService.addBookingToMonitor(accountId, bookingCode);

    res.json({
      success: true,
      data: {
        id: monitor.id,
        bookingCode: monitor.bookingCode,
        flightNumber: monitor.currentFlightNumber,
        route: `${monitor.currentOrigin} → ${monitor.currentDestination}`,
        departureTime: monitor.currentDepartureTime,
        passenger: monitor.passengerName,
        status: monitor.currentStatus
      }
    });
  } catch (error: any) {
    console.error('Erro ao adicionar reserva:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao adicionar reserva'
    });
  }
});

/**
 * POST /api/booking-monitor/sync/:accountId
 * Sincroniza reservas de uma conta
 */
router.post('/sync/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    await monitorService.syncAccountBookings(accountId);

    res.json({
      success: true,
      message: 'Sincronização iniciada com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao sincronizar:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao sincronizar reservas'
    });
  }
});

/**
 * GET /api/booking-monitor/accounts
 * Lista contas conectadas do usuário
 */
router.get('/accounts', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { PrismaClient } = await import('@reservasegura/database');
    const prisma = new PrismaClient();

    const accounts = await prisma.connectedAirlineAccount.findMany({
      where: { userId },
      select: {
        id: true,
        airline: true,
        accountEmail: true,
        isActive: true,
        lastLoginAt: true,
        lastSyncAt: true,
        autoMonitor: true
      }
    });

    res.json({
      success: true,
      data: accounts.map(acc => ({
        id: acc.id,
        airline: acc.airline,
        email: acc.accountEmail,
        isActive: acc.isActive,
        lastSyncAt: acc.lastSyncAt
      }))
    });
  } catch (error: any) {
    console.error('Erro ao listar contas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao listar contas'
    });
  }
});

/**
 * GET /api/booking-monitor/bookings
 * Lista reservas monitoradas do usuário
 */
router.get('/bookings', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { PrismaClient } = await import('@reservasegura/database');
    const prisma = new PrismaClient();

    const monitors = await prisma.bookingMonitor.findMany({
      where: { userId },
      include: {
        account: {
          select: { airline: true }
        },
        changes: {
          orderBy: { detectedAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: monitors.map(m => ({
        id: m.id,
        bookingCode: m.bookingCode,
        airline: m.account.airline,
        flightNumber: m.currentFlightNumber,
        route: `${m.currentOrigin} → ${m.currentDestination}`,
        departureTime: m.currentDepartureTime,
        passenger: m.passengerName,
        status: m.currentStatus,
        hasChanges: m.hasChanges,
        lastCheckedAt: m.lastCheckedAt,
        recentChanges: m.changes
      }))
    });
  } catch (error: any) {
    console.error('Erro ao listar reservas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao listar reservas'
    });
  }
});

/**
 * GET /api/booking-monitor/notifications
 * Lista notificações do usuário
 */
router.get('/notifications', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { PrismaClient } = await import('@reservasegura/database');
    const prisma = new PrismaClient();

    const notifications = await prisma.bookingNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error: any) {
    console.error('Erro ao listar notificações:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message || 'Erro ao listar notificações'
    });
  }
});

/**
 * GET /api/booking-monitor/changes
 * Lista todas as mudanças de reservas do usuário
 */
router.get('/changes', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { PrismaClient } = await import('@reservasegura/database');
    const prisma = new PrismaClient();

    const changes = await prisma.bookingChange.findMany({
      where: {
        monitor: { userId }
      },
      include: {
        monitor: {
          select: {
            bookingCode: true,
            passengerName: true
          }
        }
      },
      orderBy: { detectedAt: 'desc' },
      take: 100
    });

    res.json({
      success: true,
      data: changes.map(c => ({
        id: c.id,
        bookingCode: c.monitor.bookingCode,
        passengerName: c.monitor.passengerName,
        changeType: c.changeType,
        oldValue: c.oldValue,
        newValue: c.newValue,
        detectedAt: c.detectedAt
      }))
    });
  } catch (error: any) {
    console.error('Erro ao listar mudanças:', error);
    res.status(500).json({
      success: false,
      data: [],
      error: error.message || 'Erro ao listar mudanças'
    });
  }
});

/**
 * GET /api/booking-monitor/changes/:monitorId
 * Lista mudanças de uma reserva específica
 */
router.get('/changes/:monitorId', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const { PrismaClient } = await import('@reservasegura/database');
    const prisma = new PrismaClient();

    const changes = await prisma.bookingChange.findMany({
      where: { monitorId },
      orderBy: { detectedAt: 'desc' }
    });

    res.json({
      success: true,
      data: changes
    });
  } catch (error: any) {
    console.error('Erro ao listar mudanças:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao listar mudanças'
    });
  }
});

/**
 * POST /api/booking-monitor/start-monitoring
 * Inicia worker de monitoramento automático
 */
router.post('/start-monitoring', async (req, res) => {
  try {
    monitorService.startMonitoring();

    res.json({
      success: true,
      message: 'Monitoramento automático iniciado'
    });
  } catch (error: any) {
    console.error('Erro ao iniciar monitoramento:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao iniciar monitoramento'
    });
  }
});

/**
 * POST /api/booking-monitor/stop-monitoring
 * Para worker de monitoramento
 */
router.post('/stop-monitoring', async (req, res) => {
  try {
    monitorService.stopMonitoring();

    res.json({
      success: true,
      message: 'Monitoramento automático parado'
    });
  } catch (error: any) {
    console.error('Erro ao parar monitoramento:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao parar monitoramento'
    });
  }
});

export default router;
