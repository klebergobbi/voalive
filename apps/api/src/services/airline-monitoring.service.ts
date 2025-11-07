/**
 * Airline Monitoring Service
 * Serviço principal de monitoramento de reservas aéreas
 *
 * Features:
 * - Detecção automática de mudanças de status
 * - Sistema de agendamento inteligente
 * - Integração com BullMQ para jobs
 * - Notificações via webhooks
 */

import { PrismaClient } from '@reservasegura/database';
import { ScraperFactory } from '../scrapers/scraper.factory';
import { BookingStatus } from '../scrapers/base.scraper';
import { Logger } from '../utils/logger.util';
import Queue from 'bull';

export interface AddBookingRequest {
  pnr: string;
  airline: string;
  lastName: string;
  flightNumber: string;
  departureDate: Date;
  route: string;
  checkInterval?: number; // minutos
}

export class AirlineMonitoringService {
  private readonly logger = new Logger('AirlineMonitoringService');
  private readonly prisma: PrismaClient;
  private monitorQueue: Queue.Queue | null = null;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Define a fila de monitoramento (será injetada pelo sistema)
   */
  setQueue(queue: Queue.Queue): void {
    this.monitorQueue = queue;
  }

  /**
   * Adiciona reserva ao monitoramento
   */
  async addBookingToMonitor(data: AddBookingRequest): Promise<any> {
    this.logger.info(`Adicionando reserva ao monitoramento: ${data.pnr} (${data.airline})`);

    // Validar companhia aérea
    if (!ScraperFactory.isSupported(data.airline)) {
      throw new Error(
        `Companhia aérea não suportada: ${data.airline}. ` +
        `Suportadas: ${ScraperFactory.getSupportedAirlines().join(', ')}`
      );
    }

    // Buscar ou criar ExternalBooking
    let booking = await this.prisma.externalBooking.findFirst({
      where: {
        bookingCode: data.pnr.toUpperCase(),
        lastName: data.lastName.toUpperCase(),
        airline: data.airline.toUpperCase(),
      },
    });

    if (!booking) {
      // Criar novo registro
      const [origin, destination] = data.route.split('-').map(s => s.trim());

      booking = await this.prisma.externalBooking.create({
        data: {
          bookingCode: data.pnr.toUpperCase(),
          lastName: data.lastName.toUpperCase(),
          fullName: data.lastName.toUpperCase(),
          airline: data.airline.toUpperCase(),
          flightNumber: data.flightNumber,
          origin,
          destination,
          departureDate: data.departureDate,
          autoUpdate: true,
          checkInStatus: 'PENDING',
          bookingStatus: 'CONFIRMED',
        },
      });

      this.logger.info(`Reserva criada no banco: ${booking.id}`);
    } else {
      // Atualizar existente
      booking = await this.prisma.externalBooking.update({
        where: { id: booking.id },
        data: {
          autoUpdate: true,
          scrapingFailures: 0, // Resetar contado de falhas
          lastScrapingError: null,
        },
      });

      this.logger.info(`Reserva atualizada: ${booking.id}`);
    }

    // Agendar primeiro check imediatamente
    if (this.monitorQueue) {
      await this.monitorQueue.add(
        'check-booking-status',
        {
          bookingId: booking.id,
          pnr: data.pnr.toUpperCase(),
          lastName: data.lastName.toUpperCase(),
          airline: data.airline.toUpperCase(),
        },
        {
          delay: 0, // Imediato
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        }
      );

      this.logger.info(`Job de monitoramento agendado para ${booking.bookingCode}`);
    }

    return {
      id: booking.id,
      pnr: booking.bookingCode,
      airline: booking.airline,
      flightNumber: booking.flightNumber,
      route: `${booking.origin} → ${booking.destination}`,
      departureDate: booking.departureDate,
      status: booking.bookingStatus,
      autoUpdate: booking.autoUpdate,
    };
  }

  /**
   * Verifica status de uma reserva
   */
  async checkBookingStatus(bookingId: string): Promise<void> {
    this.logger.info(`Verificando status da reserva: ${bookingId}`);

    const booking = await this.prisma.externalBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      this.logger.warn(`Reserva não encontrada: ${bookingId}`);
      return;
    }

    if (!booking.autoUpdate) {
      this.logger.info(`Reserva ${booking.bookingCode} não está configurada para atualização automática`);
      return;
    }

    try {
      // Obter scraper apropriado
      const scraper = ScraperFactory.getScraper(booking.airline);

      // Executar scraping
      this.logger.info(`Executando scraping: ${booking.bookingCode} (${booking.airline})`);

      const currentStatus = await scraper.checkBookingStatus(
        booking.bookingCode,
        booking.lastName
      );

      this.logger.info(`Status obtido: ${currentStatus.statusCode}`, currentStatus);

      // Detectar mudanças
      const hasChanged = await this.detectAndSaveChanges(booking, currentStatus);

      // Atualizar registro
      await this.prisma.externalBooking.update({
        where: { id: bookingId },
        data: {
          lastChecked: new Date(),
          lastUpdated: new Date(),
          scrapingFailures: 0,
          lastScrapingError: null,
          // Atualizar dados se houver mudança
          ...(hasChanged && {
            flightNumber: currentStatus.flightNumber || booking.flightNumber,
            origin: currentStatus.departure || booking.origin,
            destination: currentStatus.arrival || booking.destination,
            gate: currentStatus.gate,
            terminal: currentStatus.terminal,
            seat: currentStatus.seatNumbers?.[0],
            class: currentStatus.class,
            rawData: JSON.stringify(currentStatus.rawData),
          }),
        },
      });

      // Agendar próximo check
      const nextCheckDelay = hasChanged ? 5 : 15; // 5 min se mudou, 15 min se não mudou
      await this.scheduleNextCheck(bookingId, booking, nextCheckDelay);

      this.logger.info(`Verificação concluída: ${booking.bookingCode}`);
    } catch (error: any) {
      this.logger.error(`Erro ao verificar reserva ${booking.bookingCode}:`, error.message);

      // Incrementar contador de falhas
      const failures = booking.scrapingFailures + 1;

      await this.prisma.externalBooking.update({
        where: { id: bookingId },
        data: {
          scrapingFailures: failures,
          lastScrapingError: error.message,
          lastChecked: new Date(),
        },
      });

      // Criar notificação de erro se muitas falhas
      if (failures >= 3) {
        await this.createErrorNotification(booking, error.message, failures);
      }

      // Retry com backoff exponencial (30 min, 60 min, 120 min)
      const retryDelay = Math.min(30 * Math.pow(2, failures - 1), 120);
      await this.scheduleNextCheck(bookingId, booking, retryDelay);
    }
  }

  /**
   * Detecta e salva mudanças
   */
  private async detectAndSaveChanges(
    booking: any,
    currentStatus: BookingStatus
  ): Promise<boolean> {
    const changes: any[] = [];

    // Mudança de número de voo
    if (booking.flightNumber && currentStatus.flightNumber &&
      booking.flightNumber !== currentStatus.flightNumber) {
      changes.push({
        type: 'FLIGHT_NUMBER_CHANGED',
        field: 'flightNumber',
        oldValue: booking.flightNumber,
        newValue: currentStatus.flightNumber,
        severity: 'CRITICAL',
      });
    }

    // Mudança de origem/destino
    if (currentStatus.departure && booking.origin !== currentStatus.departure) {
      changes.push({
        type: 'ORIGIN_CHANGED',
        field: 'origin',
        oldValue: booking.origin,
        newValue: currentStatus.departure,
        severity: 'CRITICAL',
      });
    }

    if (currentStatus.arrival && booking.destination !== currentStatus.arrival) {
      changes.push({
        type: 'DESTINATION_CHANGED',
        field: 'destination',
        oldValue: booking.destination,
        newValue: currentStatus.arrival,
        severity: 'CRITICAL',
      });
    }

    // Mudança de assento
    if (currentStatus.seatNumbers?.[0] && booking.seat &&
      booking.seat !== currentStatus.seatNumbers[0]) {
      changes.push({
        type: 'SEAT_CHANGED',
        field: 'seat',
        oldValue: booking.seat,
        newValue: currentStatus.seatNumbers[0],
        severity: 'MEDIUM',
      });
    }

    // Mudança de portão
    if (currentStatus.gate && booking.gate && booking.gate !== currentStatus.gate) {
      changes.push({
        type: 'GATE_CHANGED',
        field: 'gate',
        oldValue: booking.gate,
        newValue: currentStatus.gate,
        severity: 'HIGH',
      });
    }

    // Mudança de terminal
    if (currentStatus.terminal && booking.terminal && booking.terminal !== currentStatus.terminal) {
      changes.push({
        type: 'TERMINAL_CHANGED',
        field: 'terminal',
        oldValue: booking.terminal,
        newValue: currentStatus.terminal,
        severity: 'HIGH',
      });
    }

    if (changes.length > 0) {
      this.logger.info(`${changes.length} mudança(s) detectada(s) em ${booking.bookingCode}`);

      // Salvar mudanças como notificações
      for (const change of changes) {
        await this.createChangeNotification(booking, change, currentStatus);
      }

      return true;
    }

    this.logger.info(`Nenhuma mudança detectada em ${booking.bookingCode}`);
    return false;
  }

  /**
   * Cria notificação de mudança
   */
  private async createChangeNotification(booking: any, change: any, currentStatus: BookingStatus): Promise<void> {
    const messages: Record<string, string> = {
      FLIGHT_NUMBER_CHANGED: `Número do voo alterado: ${change.oldValue} → ${change.newValue}`,
      ORIGIN_CHANGED: `Origem alterada: ${change.oldValue} → ${change.newValue}`,
      DESTINATION_CHANGED: `Destino alterado: ${change.oldValue} → ${change.newValue}`,
      SEAT_CHANGED: `Assento alterado: ${change.oldValue} → ${change.newValue}`,
      GATE_CHANGED: `Portão alterado: ${change.oldValue} → ${change.newValue}`,
      TERMINAL_CHANGED: `Terminal alterado: ${change.oldValue} → ${change.newValue}`,
    };

    const metadata = {
      airline: booking.airline,
      bookingCode: booking.bookingCode,
      oldValue: change.oldValue,
      newValue: change.newValue,
      statusCode: currentStatus.statusCode,
      ...currentStatus,
    };

    await this.prisma.notification.create({
      data: {
        bookingCode: booking.bookingCode,
        type: change.type,
        title: `Mudança na reserva ${booking.bookingCode}`,
        message: messages[change.type] || `${change.field} alterado`,
        priority: change.severity === 'CRITICAL' ? 'URGENT' : change.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
        status: 'PENDING',
        metadata: JSON.stringify(metadata),
        actionUrl: this.getAirlineUrl(booking.airline, booking.bookingCode),
      },
    });

    this.logger.info(`Notificação criada: ${change.type} para ${booking.bookingCode}`);
  }

  /**
   * Cria notificação de erro
   */
  private async createErrorNotification(booking: any, error: string, failureCount: number): Promise<void> {
    await this.prisma.notification.create({
      data: {
        bookingCode: booking.bookingCode,
        type: 'SCRAPING_ERROR',
        title: `Erro ao atualizar reserva ${booking.bookingCode}`,
        message: `Falha ao consultar status da reserva. Tentativas: ${failureCount}. Erro: ${error}`,
        priority: failureCount >= 5 ? 'URGENT' : 'HIGH',
        status: 'PENDING',
        metadata: JSON.stringify({
          airline: booking.airline,
          bookingCode: booking.bookingCode,
          error,
          failureCount,
        }),
        actionUrl: this.getAirlineUrl(booking.airline, booking.bookingCode),
      },
    });
  }

  /**
   * Agenda próximo check
   */
  private async scheduleNextCheck(bookingId: string, booking: any, delayMinutes: number): Promise<void> {
    if (!this.monitorQueue) {
      this.logger.warn('Fila não configurada, próximo check não agendado');
      return;
    }

    await this.monitorQueue.add(
      'check-booking-status',
      {
        bookingId,
        pnr: booking.bookingCode,
        lastName: booking.lastName,
        airline: booking.airline,
      },
      {
        delay: delayMinutes * 60 * 1000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      }
    );

    this.logger.info(`Próximo check agendado para ${booking.bookingCode} em ${delayMinutes} minutos`);
  }

  /**
   * Para monitoramento de uma reserva
   */
  async stopMonitoring(pnr: string): Promise<void> {
    this.logger.info(`Parando monitoramento de ${pnr}`);

    await this.prisma.externalBooking.updateMany({
      where: { bookingCode: pnr.toUpperCase() },
      data: { autoUpdate: false },
    });

    this.logger.info(`Monitoramento parado: ${pnr}`);
  }

  /**
   * Obtém histórico de uma reserva
   */
  async getBookingHistory(pnr: string): Promise<any> {
    const booking = await this.prisma.externalBooking.findFirst({
      where: { bookingCode: pnr.toUpperCase() },
    });

    if (!booking) {
      return null;
    }

    const notifications = await this.prisma.notification.findMany({
      where: { bookingCode: pnr.toUpperCase() },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      ...booking,
      notifications,
      changeHistory: notifications.filter(n =>
        n.type.includes('CHANGED') || n.type.includes('ERROR')
      ),
    };
  }

  /**
   * Retorna URL da companhia aérea
   */
  private getAirlineUrl(airline: string, pnr: string): string {
    const urls: Record<string, string> = {
      LATAM: `https://www.latamairlines.com/br/pt/minhas-viagens?pnr=${pnr}`,
      GOL: `https://www.voegol.com.br/pt-br/minhas-reservas?localizador=${pnr}`,
      AZUL: `https://www.voeazul.com.br/br/pt/minhas-viagens/gerenciar?pnr=${pnr}`,
    };

    return urls[airline.toUpperCase()] || '#';
  }
}

// Singleton
let airlineMonitoringService: AirlineMonitoringService;

export function getAirlineMonitoringService(): AirlineMonitoringService {
  if (!airlineMonitoringService) {
    airlineMonitoringService = new AirlineMonitoringService();
  }
  return airlineMonitoringService;
}
