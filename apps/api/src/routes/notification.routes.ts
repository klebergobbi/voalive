/**
 * 🔔 NOTIFICATION ROUTES
 * Rotas para gerenciar notificações de usuários
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@reservasegura/database';
import { getNotificationService } from '../services/notification.service';

const router = Router();
const notificationService = getNotificationService();

/**
 * GET /api/notifications
 * Listar todas as notificações não lidas
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const notifications = await notificationService.getUnreadNotifications(limit);

    // Adicionar campo 'read' computado para compatibilidade com frontend
    const notificationsWithRead = notifications.map(n => ({
      ...n,
      read: n.readAt !== null
    }));

    res.json({
      success: true,
      count: notifications.length,
      data: notificationsWithRead
    });
  } catch (error: any) {
    console.error('[NotificationRoutes] Erro ao listar notificações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar notificações',
      message: error.message
    });
  }
});

/**
 * GET /api/notifications/booking/:bookingCode
 * Listar notificações de uma reserva específica
 */
router.get('/booking/:bookingCode', async (req: Request, res: Response) => {
  try {
    const { bookingCode } = req.params;
    const notifications = await notificationService.getNotificationsByBooking(bookingCode);

    res.json({
      success: true,
      bookingCode,
      count: notifications.length,
      notifications
    });
  } catch (error: any) {
    console.error('[NotificationRoutes] Erro ao buscar notificações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar notificações da reserva',
      message: error.message
    });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Marcar notificação como lida
 */
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id);

    res.json({
      success: true,
      notification
    });
  } catch (error: any) {
    console.error('[NotificationRoutes] Erro ao marcar como lida:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar notificação',
      message: error.message
    });
  }
});

/**
 * DELETE /api/notifications/cleanup
 * Limpar notificações antigas (mais de 30 dias e já lidas)
 */
router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
    const result = await notificationService.cleanOldNotifications();

    res.json({
      success: true,
      message: `${result.count} notificações antigas removidas`
    });
  } catch (error: any) {
    console.error('[NotificationRoutes] Erro ao limpar notificações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao limpar notificações',
      message: error.message
    });
  }
});

/**
 * GET /api/notifications/stats
 * Estatísticas de notificações
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const total = await prisma.notification.count();
    const unread = await prisma.notification.count({ where: { readAt: null } });
    const byPriority = await prisma.notification.groupBy({
      by: ['priority'],
      _count: true,
      where: { readAt: null }
    });
    const byType = await prisma.notification.groupBy({
      by: ['type'],
      _count: true,
      where: { readAt: null }
    });

    res.json({
      success: true,
      stats: {
        total,
        unread,
        read: total - unread,
        byPriority,
        byType
      }
    });
  } catch (error: any) {
    console.error('[NotificationRoutes] Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas',
      message: error.message
    });
  }
});

export default router;
