/**
 * Webhook Notification Service
 * Serviço de envio de notificações via webhooks
 */

import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { PrismaClient } from '@reservasegura/database';
import { Logger } from '../utils/logger.util';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    pnr: string;
    airline: string;
    flightNumber?: string;
    route?: string;
    departureDate?: string;
    oldStatus?: string;
    newStatus?: string;
    statusName?: string;
    passengers?: string[];
    details?: any;
  };
}

export class WebhookNotificationService {
  private readonly logger = new Logger('WebhookNotificationService');
  private readonly prisma: PrismaClient;
  private readonly webhookUrl: string;
  private readonly webhookSecret: string;
  private readonly timeout: number = 10000;
  private readonly maxRetries: number = 3;

  constructor() {
    this.prisma = new PrismaClient();
    this.webhookUrl = process.env.WEBHOOK_URL || '';
    this.webhookSecret = process.env.WEBHOOK_SECRET || '';

    if (!this.webhookUrl) {
      this.logger.warn('WEBHOOK_URL não configurado - notificações webhook desabilitadas');
    }
  }

  /**
   * Envia notificação de mudança de status
   */
  async sendStatusChangeNotification(data: {
    booking: any;
    oldStatus: string;
    newStatus: string;
    details: any;
  }): Promise<void> {
    if (!this.webhookUrl) {
      this.logger.warn('Webhook não configurado, pulando notificação');
      return;
    }

    const payload: WebhookPayload = {
      event: 'booking.status.changed',
      timestamp: new Date().toISOString(),
      data: {
        pnr: data.booking.bookingCode,
        airline: data.booking.airline,
        flightNumber: data.booking.flightNumber,
        route: `${data.booking.origin}-${data.booking.destination}`,
        departureDate: data.booking.departureDate?.toISOString(),
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        statusName: this.getStatusName(data.newStatus),
        details: data.details,
      },
    };

    await this.sendWebhook(payload, data.booking.bookingCode);
  }

  /**
   * Envia notificação genérica
   */
  async sendNotification(eventType: string, bookingCode: string, eventData: any): Promise<void> {
    if (!this.webhookUrl) {
      this.logger.warn('Webhook não configurado, pulando notificação');
      return;
    }

    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: {
        pnr: bookingCode,
        ...eventData,
      },
    };

    await this.sendWebhook(payload, bookingCode);
  }

  /**
   * Envia webhook com retry automático
   */
  private async sendWebhook(payload: WebhookPayload, bookingCode: string): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.info(`Enviando webhook (tentativa ${attempt}/${this.maxRetries}): ${payload.event}`);

        // Gerar assinatura HMAC
        const signature = this.generateSignature(payload);

        // Enviar requisição
        const startTime = Date.now();

        const response = await axios.post(this.webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': this.webhookSecret,
            'X-Webhook-Signature': signature,
            'User-Agent': 'ReservaSegura-Webhook/1.0',
          },
          timeout: this.timeout,
          validateStatus: (status) => status >= 200 && status < 300,
        });

        const responseTime = Date.now() - startTime;

        this.logger.info(`Webhook enviado com sucesso em ${responseTime}ms - Status: ${response.status}`);

        // Registrar notificação bem-sucedida
        await this.saveNotificationLog(bookingCode, payload, true, response.data, responseTime);

        return;
      } catch (error: any) {
        lastError = error;

        const responseTime = error.response?.config?.startTime
          ? Date.now() - error.response.config.startTime
          : null;

        this.logger.error(
          `Erro ao enviar webhook (tentativa ${attempt}/${this.maxRetries}):`,
          error.message
        );

        // Se não é a última tentativa, aguardar antes de retry
        if (attempt < this.maxRetries) {
          const backoffDelay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          this.logger.info(`Aguardando ${backoffDelay}ms antes de retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }

    // Todas as tentativas falharam
    this.logger.error(`Falha ao enviar webhook após ${this.maxRetries} tentativas`);

    // Registrar notificação falhada
    await this.saveNotificationLog(
      bookingCode,
      payload,
      false,
      { error: lastError?.message || 'Unknown error' },
      null
    );
  }

  /**
   * Gera assinatura HMAC
   */
  private generateSignature(payload: WebhookPayload): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(payloadString);
    return hmac.digest('hex');
  }

  /**
   * Salva log de notificação
   */
  private async saveNotificationLog(
    bookingCode: string,
    payload: WebhookPayload,
    success: boolean,
    response: any,
    responseTime: number | null
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          bookingCode,
          type: 'webhook',
          title: payload.event,
          message: JSON.stringify(payload),
          status: success ? 'SENT' : 'FAILED',
          metadata: JSON.stringify({
            success,
            response,
            responseTime,
            timestamp: payload.timestamp,
          }),
        },
      });
    } catch (error: any) {
      this.logger.error('Erro ao salvar log de notificação:', error.message);
    }
  }

  /**
   * Mapeia código de status para nome
   */
  private getStatusName(code: string): string {
    const statusMap: Record<string, string> = {
      HK: 'Confirmado',
      HX: 'Cancelado',
      WL: 'Lista de Espera',
      HL: 'Em Espera',
      UC: 'Pendente',
      UN: 'Desconhecido',
    };

    return statusMap[code] || code;
  }

  /**
   * Testa configuração do webhook
   */
  async testWebhook(): Promise<{ success: boolean; message: string; responseTime?: number }> {
    if (!this.webhookUrl) {
      return {
        success: false,
        message: 'WEBHOOK_URL não configurado',
      };
    }

    try {
      const testPayload: WebhookPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          pnr: 'TEST123',
          airline: 'TEST',
          flightNumber: 'TEST001',
        },
      };

      const signature = this.generateSignature(testPayload);
      const startTime = Date.now();

      const response = await axios.post(this.webhookUrl, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': this.webhookSecret,
          'X-Webhook-Signature': signature,
          'User-Agent': 'ReservaSegura-Webhook/1.0',
        },
        timeout: this.timeout,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        message: `Webhook funcionando - Status: ${response.status}`,
        responseTime,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erro ao testar webhook: ${error.message}`,
      };
    }
  }
}

// Singleton
let webhookNotificationService: WebhookNotificationService;

export function getWebhookNotificationService(): WebhookNotificationService {
  if (!webhookNotificationService) {
    webhookNotificationService = new WebhookNotificationService();
  }
  return webhookNotificationService;
}
