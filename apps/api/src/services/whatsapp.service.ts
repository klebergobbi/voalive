/**
 * WhatsApp Notification Service
 * Serviço para envio de notificações via WhatsApp
 *
 * Suporta múltiplas APIs:
 * - Evolution API (recomendado)
 * - Baileys (open source)
 * - WhatsApp Business API (oficial)
 */

import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger.util';

interface WhatsAppConfig {
  apiUrl: string;
  apiToken: string;
  instance?: string;
  provider: 'evolution' | 'baileys' | 'business' | 'custom';
}

interface FlightChange {
  changeType: 'CANCELLATION' | 'DELAY' | 'GATE_CHANGE' | 'TERMINAL_CHANGE' | 'STATUS_CHANGE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  oldValue?: any;
  newValue?: any;
  detectedAt: Date;
}

interface BookingInfo {
  pnr: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  airline: string;
  passengerName?: string;
}

export class WhatsAppService {
  private readonly logger = new Logger('WhatsAppService');
  private client: AxiosInstance;
  private config: WhatsAppConfig;

  constructor(config?: Partial<WhatsAppConfig>) {
    // Configuração padrão (pode ser sobrescrita por variáveis de ambiente)
    this.config = {
      apiUrl: process.env.WHATSAPP_API_URL || 'http://localhost:8080',
      apiToken: process.env.WHATSAPP_API_TOKEN || '',
      instance: process.env.WHATSAPP_INSTANCE || 'reservasegura',
      provider: (process.env.WHATSAPP_PROVIDER as any) || 'evolution',
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.config.apiToken,
      },
    });

    this.logger.info(`WhatsApp Service initialized with provider: ${this.config.provider}`);
  }

  /**
   * Envia mensagem simples via WhatsApp
   */
  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const formattedPhone = this.formatBrazilianPhone(phoneNumber);
      this.logger.info(`Enviando WhatsApp para: ${formattedPhone}`);

      const endpoint = this.getEndpointByProvider();
      const payload = this.buildPayloadByProvider(formattedPhone, message);

      const response = await this.client.post(endpoint, payload);

      if (response.status === 200 || response.status === 201) {
        this.logger.info(`✅ WhatsApp enviado com sucesso para ${formattedPhone}`);
        return true;
      }

      this.logger.warn(`⚠️ Status inesperado: ${response.status}`);
      return false;

    } catch (error: any) {
      this.logger.error(`❌ Erro ao enviar WhatsApp:`, error.message);
      if (error.response) {
        this.logger.error('Response data:', error.response.data);
      }
      return false;
    }
  }

  /**
   * Envia alerta de mudança de voo via WhatsApp
   */
  async sendFlightAlert(
    phoneNumber: string,
    booking: BookingInfo,
    changes: FlightChange[]
  ): Promise<boolean> {
    const message = this.buildFlightAlertMessage(booking, changes);
    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Envia alerta de cancelamento
   */
  async sendCancellationAlert(
    phoneNumber: string,
    booking: BookingInfo,
    reason?: string
  ): Promise<boolean> {
    const message = this.buildCancellationMessage(booking, reason);
    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Envia alerta de atraso
   */
  async sendDelayAlert(
    phoneNumber: string,
    booking: BookingInfo,
    delayMinutes: number,
    newDepartureTime: string
  ): Promise<boolean> {
    const message = this.buildDelayMessage(booking, delayMinutes, newDepartureTime);
    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Envia alerta de mudança de portão
   */
  async sendGateChangeAlert(
    phoneNumber: string,
    booking: BookingInfo,
    oldGate: string,
    newGate: string
  ): Promise<boolean> {
    const message = this.buildGateChangeMessage(booking, oldGate, newGate);
    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Constrói mensagem de alerta de voo
   */
  private buildFlightAlertMessage(booking: BookingInfo, changes: FlightChange[]): string {
    let message = `🚨 *ALERTA DE VOO - ReservaSegura*\n\n`;
    message += `📋 *PNR:* ${booking.pnr}\n`;
    message += `✈️ *Voo:* ${booking.flightNumber}\n`;
    message += `🛫 *Rota:* ${booking.departure} → ${booking.arrival}\n`;

    if (booking.passengerName) {
      message += `👤 *Passageiro:* ${booking.passengerName}\n`;
    }

    message += `\n━━━━━━━━━━━━━━━━━━\n\n`;

    // Mudanças detectadas
    const criticalChanges = changes.filter(c => c.severity === 'CRITICAL');
    const highChanges = changes.filter(c => c.severity === 'HIGH');
    const otherChanges = changes.filter(c => c.severity !== 'CRITICAL' && c.severity !== 'HIGH');

    // Mudanças críticas primeiro
    if (criticalChanges.length > 0) {
      message += `🔴 *ATENÇÃO - MUDANÇAS CRÍTICAS:*\n\n`;
      criticalChanges.forEach(change => {
        message += this.formatChangeMessage(change);
      });
    }

    // Mudanças importantes
    if (highChanges.length > 0) {
      if (criticalChanges.length > 0) message += `\n`;
      message += `🟠 *MUDANÇAS IMPORTANTES:*\n\n`;
      highChanges.forEach(change => {
        message += this.formatChangeMessage(change);
      });
    }

    // Outras mudanças
    if (otherChanges.length > 0) {
      if (criticalChanges.length > 0 || highChanges.length > 0) message += `\n`;
      message += `🟡 *OUTRAS MUDANÇAS:*\n\n`;
      otherChanges.forEach(change => {
        message += this.formatChangeMessage(change);
      });
    }

    message += `\n━━━━━━━━━━━━━━━━━━\n`;
    message += `⏱️ *Detectado em:* ${new Date().toLocaleString('pt-BR')}\n\n`;
    message += `📱 Acesse: https://www.reservasegura.pro\n`;
    message += `🔔 Sistema de Monitoramento Automático`;

    return message;
  }

  /**
   * Formata mensagem individual de mudança
   */
  private formatChangeMessage(change: FlightChange): string {
    switch (change.changeType) {
      case 'CANCELLATION':
        return `❌ *VOO CANCELADO*\n` +
               `   Seu voo foi cancelado pela companhia aérea.\n` +
               `   Entre em contato urgente para remarcar!\n\n`;

      case 'DELAY':
        const delayMinutes = change.newValue?.delayMinutes || 0;
        const newTime = change.newValue?.departureTime
          ? new Date(change.newValue.departureTime).toLocaleString('pt-BR')
          : 'N/A';
        return `⏰ *ATRASO: ${delayMinutes} minutos*\n` +
               `   Horário anterior: ${change.oldValue?.departureTime || 'N/A'}\n` +
               `   Novo horário: ${newTime}\n\n`;

      case 'GATE_CHANGE':
        return `🚪 *MUDANÇA DE PORTÃO*\n` +
               `   Portão anterior: ${change.oldValue?.gate || 'N/A'}\n` +
               `   Novo portão: *${change.newValue?.gate || 'N/A'}*\n` +
               `   Dirija-se ao novo portão!\n\n`;

      case 'TERMINAL_CHANGE':
        return `🏢 *MUDANÇA DE TERMINAL*\n` +
               `   Terminal anterior: ${change.oldValue?.terminal || 'N/A'}\n` +
               `   Novo terminal: *${change.newValue?.terminal || 'N/A'}*\n` +
               `   Verifique tempo de deslocamento!\n\n`;

      case 'STATUS_CHANGE':
        return `📊 *MUDANÇA DE STATUS*\n` +
               `   Status anterior: ${change.oldValue?.status || 'N/A'}\n` +
               `   Novo status: *${change.newValue?.status || 'N/A'}*\n\n`;

      default:
        return `ℹ️ *Mudança detectada*\n` +
               `   Tipo: ${change.changeType}\n\n`;
    }
  }

  /**
   * Constrói mensagem de cancelamento
   */
  private buildCancellationMessage(booking: BookingInfo, reason?: string): string {
    let message = `🚨 *ALERTA DE CANCELAMENTO*\n\n`;
    message += `❌ *SEU VOO FOI CANCELADO*\n\n`;
    message += `📋 PNR: ${booking.pnr}\n`;
    message += `✈️ Voo: ${booking.flightNumber}\n`;
    message += `🛫 Rota: ${booking.departure} → ${booking.arrival}\n`;
    message += `📅 Data: ${booking.departureTime}\n\n`;

    if (reason) {
      message += `📝 Motivo: ${reason}\n\n`;
    }

    message += `⚠️ *AÇÕES NECESSÁRIAS:*\n`;
    message += `1. Entre em contato com a companhia aérea\n`;
    message += `2. Solicite reacomodação em outro voo\n`;
    message += `3. Ou solicite reembolso integral\n\n`;
    message += `📞 ${booking.airline} - 0800 (verificar site oficial)\n`;
    message += `📱 Acesse: https://www.reservasegura.pro`;

    return message;
  }

  /**
   * Constrói mensagem de atraso
   */
  private buildDelayMessage(
    booking: BookingInfo,
    delayMinutes: number,
    newDepartureTime: string
  ): string {
    let message = `⏰ *ALERTA DE ATRASO*\n\n`;
    message += `📋 PNR: ${booking.pnr}\n`;
    message += `✈️ Voo: ${booking.flightNumber}\n`;
    message += `🛫 Rota: ${booking.departure} → ${booking.arrival}\n\n`;
    message += `⏱️ *Atraso: ${delayMinutes} minutos*\n\n`;
    message += `🕐 Horário original: ${booking.departureTime}\n`;
    message += `🕑 Novo horário: ${new Date(newDepartureTime).toLocaleString('pt-BR')}\n\n`;

    if (delayMinutes > 60) {
      message += `⚠️ Atraso superior a 1 hora!\n`;
      message += `Você pode ter direito a:\n`;
      message += `• Alimentação (a partir de 2h)\n`;
      message += `• Hospedagem (a partir de 4h)\n`;
      message += `• Reacomodação em outro voo\n\n`;
    }

    message += `📱 Acesse: https://www.reservasegura.pro`;
    return message;
  }

  /**
   * Constrói mensagem de mudança de portão
   */
  private buildGateChangeMessage(
    booking: BookingInfo,
    oldGate: string,
    newGate: string
  ): string {
    let message = `🚪 *MUDANÇA DE PORTÃO*\n\n`;
    message += `📋 PNR: ${booking.pnr}\n`;
    message += `✈️ Voo: ${booking.flightNumber}\n`;
    message += `🛫 ${booking.departure} → ${booking.arrival}\n\n`;
    message += `🔄 Portão alterado:\n`;
    message += `   De: ${oldGate || 'N/A'}\n`;
    message += `   Para: *${newGate}*\n\n`;
    message += `⚠️ Dirija-se ao novo portão de embarque!\n`;
    message += `📱 Acesse: https://www.reservasegura.pro`;
    return message;
  }

  /**
   * Formata número de telefone brasileiro
   */
  private formatBrazilianPhone(phone: string): string {
    // Remove todos os caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');

    // Remove código do país se presente
    if (cleaned.startsWith('55')) {
      cleaned = cleaned.substring(2);
    }

    // Adiciona código do país
    const formatted = '55' + cleaned;

    // Valida formato (deve ter 13 dígitos: 55 + DD + 9 + número)
    if (formatted.length < 12 || formatted.length > 13) {
      this.logger.warn(`Número de telefone potencialmente inválido: ${formatted}`);
    }

    return formatted;
  }

  /**
   * Retorna endpoint correto baseado no provider
   */
  private getEndpointByProvider(): string {
    switch (this.config.provider) {
      case 'evolution':
        return `/message/sendText/${this.config.instance}`;

      case 'baileys':
        return `/send-message`;

      case 'business':
        return `/v1/messages`;

      case 'custom':
        return process.env.WHATSAPP_CUSTOM_ENDPOINT || '/send';

      default:
        return '/send-message';
    }
  }

  /**
   * Constrói payload correto baseado no provider
   */
  private buildPayloadByProvider(phoneNumber: string, message: string): any {
    switch (this.config.provider) {
      case 'evolution':
        return {
          number: phoneNumber,
          text: message,
          delay: 1000,
        };

      case 'baileys':
        return {
          phone: phoneNumber,
          message: message,
        };

      case 'business':
        return {
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: {
            body: message,
          },
        };

      case 'custom':
        return {
          to: phoneNumber,
          body: message,
        };

      default:
        return {
          phone: phoneNumber,
          message: message,
        };
    }
  }

  /**
   * Verifica se o serviço está configurado corretamente
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.config.apiUrl || !this.config.apiToken) {
        this.logger.warn('WhatsApp não configurado (missing apiUrl or apiToken)');
        return false;
      }

      // Tenta fazer uma requisição de health check
      const response = await this.client.get('/health').catch(() => ({ status: 0 }));

      if (response.status === 200) {
        this.logger.info('✅ WhatsApp service is healthy');
        return true;
      }

      this.logger.warn('⚠️ WhatsApp service not responding');
      return false;
    } catch (error) {
      this.logger.error('❌ WhatsApp health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
let whatsappService: WhatsAppService | null = null;

export function getWhatsAppService(): WhatsAppService {
  if (!whatsappService) {
    whatsappService = new WhatsAppService();
  }
  return whatsappService;
}

export function initializeWhatsAppService(config?: Partial<WhatsAppConfig>): WhatsAppService {
  whatsappService = new WhatsAppService(config);
  return whatsappService;
}
