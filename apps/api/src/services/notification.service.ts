/**
 * 🔔 NOTIFICATION SERVICE
 * Gerencia notificações e alertas para usuários sobre reservas
 */

import { PrismaClient } from '@prisma/client';
import { getWhatsAppService } from './whatsapp.service';

const prisma = new PrismaClient();

export interface NotificationData {
  userId?: string;
  bookingId: string;
  bookingCode: string;
  type: 'SCRAPING_FAILED' | 'MANUAL_CHECK_REQUIRED' | 'STATUS_CHANGED' | 'INFO';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private whatsappService = getWhatsAppService();

  /**
   * Criar notificação no banco de dados
   */
  async createNotification(data: NotificationData) {
    try {
      // Verificar se já existe notificação similar recente (últimas 24h)
      const existingNotification = await prisma.notification.findFirst({
        where: {
          bookingCode: data.bookingCode,
          type: data.type,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      if (existingNotification) {
        console.log(`[Notification] Notificação similar já existe para ${data.bookingCode}`);
        return existingNotification;
      }

      // Criar nova notificação
      const notification = await prisma.notification.create({
        data: {
          bookingCode: data.bookingCode,
          type: data.type,
          priority: data.priority,
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          readAt: null,
        }
      });

      console.log(`✅ [Notification] Criada para ${data.bookingCode}: ${data.title}`);

      // Enviar via WhatsApp se configurado e prioritário
      if (data.priority === 'HIGH' || data.priority === 'URGENT') {
        await this.sendWhatsAppNotification(data);
      }

      return notification;

    } catch (error) {
      console.error('[Notification] Erro ao criar notificação:', error);
      throw error;
    }
  }

  /**
   * Enviar notificação via WhatsApp
   */
  private async sendWhatsAppNotification(data: NotificationData) {
    try {
      // Buscar usuário e telefone
      if (!data.userId) {
        console.log('[WhatsApp] userId não fornecido, pulando envio');
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { phone: true, name: true }
      });

      if (!user?.phone) {
        console.log('[WhatsApp] Usuário sem telefone cadastrado');
        return;
      }

      const message = `${data.title}\n\n${data.message}`;
      await this.whatsappService.sendMessage(user.phone, message);
      console.log(`✅ [WhatsApp] Notificação enviada para ${user.phone}`);

    } catch (error) {
      console.error('[WhatsApp] Erro ao enviar notificação:', error);
      // Não falha a operação principal se WhatsApp falhar
    }
  }

  /**
   * Criar alerta de scraping falhou
   */
  async createScrapingFailedAlert(
    bookingCode: string,
    airline: string,
    failureCount: number,
    errorMessage: string
  ) {
    const priority = this.getPriorityByFailureCount(failureCount);

    return this.createNotification({
      bookingId: bookingCode,
      bookingCode,
      type: 'SCRAPING_FAILED',
      priority,
      title: `⚠️ Não foi possível verificar reserva ${bookingCode}`,
      message: `A verificação automática da reserva ${bookingCode} (${airline}) falhou ${failureCount}x. ${this.getActionMessage(failureCount)}`,
      actionUrl: this.getAirlineUrl(airline),
      metadata: {
        airline,
        failureCount,
        errorMessage: errorMessage.substring(0, 200), // Limitar tamanho
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Criar alerta de verificação manual necessária
   */
  async createManualCheckAlert(
    bookingCode: string,
    airline: string,
    reason: string,
    departureDate?: Date
  ) {
    const isUrgent = departureDate && this.isDepartureSoon(departureDate);
    const priority = isUrgent ? 'URGENT' : 'HIGH';

    return this.createNotification({
      bookingId: bookingCode,
      bookingCode,
      type: 'MANUAL_CHECK_REQUIRED',
      priority,
      title: `🔍 Verificação manual necessária - ${bookingCode}`,
      message: `Por favor, verifique manualmente o status da sua reserva ${bookingCode} (${airline}). ${reason}${isUrgent ? ' ⚠️ Voo nas próximas 24 horas!' : ''}`,
      actionUrl: this.getAirlineUrl(airline),
      metadata: {
        airline,
        reason,
        departureDate: departureDate?.toISOString(),
        isUrgent
      }
    });
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date()
      }
    });
  }

  /**
   * Buscar notificações não lidas
   */
  async getUnreadNotifications(limit: number = 50) {
    return prisma.notification.findMany({
      where: { readAt: null },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });
  }

  /**
   * Buscar notificações por código de reserva
   */
  async getNotificationsByBooking(bookingCode: string) {
    return prisma.notification.findMany({
      where: { bookingCode },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Limpar notificações antigas (mais de 30 dias)
   */
  async cleanOldNotifications() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        readAt: { not: null }
      }
    });

    console.log(`🧹 [Notification] ${result.count} notificações antigas removidas`);
    return result;
  }

  // ========== HELPER METHODS ==========

  /**
   * Determinar prioridade baseada no número de falhas
   */
  private getPriorityByFailureCount(failureCount: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (failureCount >= 10) return 'URGENT';
    if (failureCount >= 5) return 'HIGH';
    if (failureCount >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Mensagem de ação baseada no número de falhas
   */
  private getActionMessage(failureCount: number): string {
    if (failureCount >= 10) {
      return 'Por favor, verifique manualmente no site da companhia aérea.';
    }
    if (failureCount >= 5) {
      return 'Recomendamos verificar manualmente.';
    }
    if (failureCount >= 3) {
      return 'O sistema continuará tentando automaticamente.';
    }
    return 'Nova tentativa em breve.';
  }

  /**
   * Verificar se o voo está próximo (24h)
   */
  private isDepartureSoon(departureDate: Date): boolean {
    const now = Date.now();
    const departure = departureDate.getTime();
    const hoursUntilDeparture = (departure - now) / (60 * 60 * 1000);
    return hoursUntilDeparture > 0 && hoursUntilDeparture <= 24;
  }

  /**
   * Obter URL da companhia aérea para verificação manual
   */
  private getAirlineUrl(airline: string): string {
    const urls: Record<string, string> = {
      'GOL': 'https://www.voegol.com.br/gerenciar-reserva',
      'LATAM': 'https://www.latam.com/pt_br/minhas-viagens/',
      'AZUL': 'https://www.voeazul.com.br/br/pt/minhas-viagens',
      'CVC': 'https://www.cvc.com.br/minha-conta/minhas-reservas',
    };

    return urls[airline.toUpperCase()] || '#';
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

export default NotificationService;
