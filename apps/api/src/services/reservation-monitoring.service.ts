/**
 * RESERVATION MONITORING SERVICE
 * Sistema de monitoramento de reservas com ScrapingBee
 *
 * Features:
 * - Busca com 3 campos: PNR + Sobrenome + Origem
 * - Intervalos dinamicos baseados na proximidade do voo
 * - Deteccao automatica de mudancas
 * - Historico completo de alteracoes
 */

import { PrismaClient } from '@prisma/client';
import { getScrapingBeeService, ReservationData } from './scrapingbee.service';

const prisma = new PrismaClient();

// Intervalos dinamicos baseados na proximidade do voo
const MONITORING_INTERVALS = {
  MORE_THAN_7_DAYS: 6 * 60,      // 6 horas (360 min)
  BETWEEN_3_AND_7_DAYS: 2 * 60,  // 2 horas (120 min)
  BETWEEN_1_AND_3_DAYS: 60,      // 1 hora (60 min)
  LESS_THAN_24_HOURS: 30,        // 30 minutos
  LESS_THAN_6_HOURS: 15,         // 15 minutos
  LESS_THAN_2_HOURS: 5,          // 5 minutos
};

export interface RegisterReservationInput {
  airline: string;
  pnr: string;
  lastName: string;
  origin?: string;
  departureDate?: Date;
  flightNumber?: string;
  destination?: string;
}

export interface MonitoringStats {
  total: number;
  active: number;
  paused: number;
  byAirline: Record<string, number>;
  totalChangesDetected: number;
  lastCheckAt: Date | null;
}

export interface ReservationChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export class ReservationMonitoringService {
  private scrapingBee = getScrapingBeeService();

  /**
   * Registra uma nova reserva para monitoramento
   */
  async registerReservation(input: RegisterReservationInput): Promise<any> {
    const { airline, pnr, lastName, origin, departureDate, flightNumber, destination } = input;

    console.log(`[ReservationMonitoring] Registrando reserva: ${airline} ${pnr} / ${lastName} / ${origin || 'N/A'}`);

    // Verificar se ja existe
    const existing = await prisma.externalBooking.findFirst({
      where: {
        bookingCode: pnr.toUpperCase(),
        lastName: lastName.toUpperCase(),
        airline: airline.toUpperCase(),
      },
    });

    if (existing) {
      // Atualizar para monitoramento ativo
      const updated = await prisma.externalBooking.update({
        where: { id: existing.id },
        data: {
          autoUpdate: true,
          origin: origin?.toUpperCase() || existing.origin,
          scrapingFailures: 0,
          lastScrapingError: null,
        },
      });

      console.log(`[ReservationMonitoring] Reserva ${pnr} reativada para monitoramento`);
      return this.formatReservationResponse(updated);
    }

    // Fazer primeira busca para obter dados iniciais
    const scrapedData = await this.scrapingBee.search(
      airline,
      pnr,
      lastName,
      origin
    );

    // Criar registro mesmo se scraping falhar (para tentar novamente depois)
    const reservation = await prisma.externalBooking.create({
      data: {
        bookingCode: pnr.toUpperCase(),
        lastName: lastName.toUpperCase(),
        fullName: lastName.toUpperCase(),
        airline: airline.toUpperCase(),
        origin: (origin || scrapedData.origin || 'N/A').toUpperCase(),
        destination: (destination || scrapedData.destination || 'N/A').toUpperCase(),
        flightNumber: flightNumber || scrapedData.flightNumber || `${airline.substring(0, 2)}0000`,
        departureDate: departureDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        autoUpdate: true,
        bookingStatus: scrapedData.status || 'CONFIRMED',
        scrapingFailures: scrapedData.success ? 0 : 1,
        lastScrapingError: scrapedData.success ? null : scrapedData.error,
        lastChecked: new Date(),
        rawData: JSON.stringify(scrapedData),
      },
    });

    console.log(`[ReservationMonitoring] Reserva ${pnr} registrada com sucesso`);

    // Agendar proximo check
    const nextInterval = this.calculateNextInterval(reservation.departureDate);
    console.log(`[ReservationMonitoring] Proximo check em ${nextInterval} minutos`);

    return this.formatReservationResponse(reservation, scrapedData);
  }

  /**
   * Busca reservas monitoradas
   */
  async getMonitoredReservations(filters?: {
    airline?: string;
    status?: string;
    activeOnly?: boolean;
  }): Promise<any[]> {
    const where: any = {};

    if (filters?.airline) {
      where.airline = filters.airline.toUpperCase();
    }

    if (filters?.status) {
      where.bookingStatus = filters.status;
    }

    if (filters?.activeOnly) {
      where.autoUpdate = true;
      where.departureDate = { gte: new Date() };
    }

    const reservations = await prisma.externalBooking.findMany({
      where,
      orderBy: { departureDate: 'asc' },
    });

    return reservations.map(r => this.formatReservationResponse(r));
  }

  /**
   * Verifica uma reserva especifica
   */
  async checkReservation(id: string): Promise<any> {
    const reservation = await prisma.externalBooking.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new Error('Reserva nao encontrada');
    }

    console.log(`[ReservationMonitoring] Verificando reserva ${reservation.bookingCode}...`);

    // Buscar dados atualizados
    const scrapedData = await this.scrapingBee.search(
      reservation.airline,
      reservation.bookingCode,
      reservation.lastName,
      reservation.origin
    );

    if (!scrapedData.success) {
      // Incrementar contador de falhas
      await prisma.externalBooking.update({
        where: { id },
        data: {
          scrapingFailures: reservation.scrapingFailures + 1,
          lastScrapingError: scrapedData.error,
          lastChecked: new Date(),
        },
      });

      console.log(`[ReservationMonitoring] Falha ao verificar ${reservation.bookingCode}: ${scrapedData.error}`);
      return { success: false, error: scrapedData.error };
    }

    // Detectar mudancas
    const changes = this.detectChanges(reservation, scrapedData);

    if (changes.length > 0) {
      console.log(`[ReservationMonitoring] ${changes.length} mudanca(s) detectada(s) em ${reservation.bookingCode}`);

      // Salvar mudancas no historico
      for (const change of changes) {
        await this.saveChange(reservation.id, reservation.bookingCode, change);
      }

      // Criar notificacoes
      await this.createChangeNotifications(reservation, changes);
    }

    // Atualizar reserva
    await prisma.externalBooking.update({
      where: { id },
      data: {
        flightNumber: scrapedData.flightNumber || reservation.flightNumber,
        origin: scrapedData.origin || reservation.origin,
        destination: scrapedData.destination || reservation.destination,
        gate: scrapedData.gate,
        terminal: scrapedData.terminal,
        seat: scrapedData.seat,
        bookingStatus: scrapedData.status || reservation.bookingStatus,
        lastChecked: new Date(),
        lastUpdated: changes.length > 0 ? new Date() : reservation.lastUpdated,
        scrapingFailures: 0,
        lastScrapingError: null,
        rawData: JSON.stringify(scrapedData),
      },
    });

    return {
      success: true,
      reservation: reservation.bookingCode,
      changes,
      nextCheckIn: this.calculateNextInterval(reservation.departureDate),
    };
  }

  /**
   * Executa ciclo de monitoramento de todas as reservas ativas
   */
  async runMonitoringCycle(): Promise<{
    checked: number;
    changes: number;
    errors: number;
  }> {
    console.log('[ReservationMonitoring] Iniciando ciclo de monitoramento...');

    const reservations = await prisma.externalBooking.findMany({
      where: {
        autoUpdate: true,
        bookingStatus: { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] },
        departureDate: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Ate 24h apos o voo
        },
      },
      orderBy: { departureDate: 'asc' },
    });

    console.log(`[ReservationMonitoring] ${reservations.length} reservas para verificar`);

    let checked = 0;
    let changesCount = 0;
    let errors = 0;

    for (const reservation of reservations) {
      try {
        // Verificar se esta na hora de checar
        const shouldCheck = this.shouldCheckNow(reservation);

        if (!shouldCheck) {
          continue;
        }

        const result = await this.checkReservation(reservation.id);

        if (result.success) {
          checked++;
          changesCount += result.changes?.length || 0;
        } else {
          errors++;
        }

        // Delay entre requisicoes para evitar rate limiting
        await this.delay(2000, 5000);

      } catch (error: any) {
        console.error(`[ReservationMonitoring] Erro ao verificar ${reservation.bookingCode}:`, error.message);
        errors++;
      }
    }

    console.log(`[ReservationMonitoring] Ciclo concluido: ${checked} verificadas, ${changesCount} mudancas, ${errors} erros`);

    return { checked, changes: changesCount, errors };
  }

  /**
   * Retorna estatisticas gerais
   */
  async getStats(): Promise<MonitoringStats> {
    const total = await prisma.externalBooking.count({
      where: { autoUpdate: true },
    });

    const active = await prisma.externalBooking.count({
      where: {
        autoUpdate: true,
        departureDate: { gte: new Date() },
      },
    });

    const paused = await prisma.externalBooking.count({
      where: { autoUpdate: false },
    });

    const byAirlineRaw = await prisma.externalBooking.groupBy({
      by: ['airline'],
      where: { autoUpdate: true },
      _count: true,
    });

    const byAirline: Record<string, number> = {};
    byAirlineRaw.forEach(item => {
      byAirline[item.airline] = item._count;
    });

    const totalChangesDetected = await prisma.notification.count({
      where: {
        type: { contains: 'CHANGED' },
      },
    });

    const lastCheck = await prisma.externalBooking.findFirst({
      where: { lastChecked: { not: null } },
      orderBy: { lastChecked: 'desc' },
      select: { lastChecked: true },
    });

    return {
      total,
      active,
      paused,
      byAirline,
      totalChangesDetected,
      lastCheckAt: lastCheck?.lastChecked || null,
    };
  }

  /**
   * Pausa monitoramento de uma reserva
   */
  async pauseMonitoring(id: string): Promise<void> {
    await prisma.externalBooking.update({
      where: { id },
      data: { autoUpdate: false },
    });
    console.log(`[ReservationMonitoring] Monitoramento pausado para ${id}`);
  }

  /**
   * Retoma monitoramento de uma reserva
   */
  async resumeMonitoring(id: string): Promise<void> {
    await prisma.externalBooking.update({
      where: { id },
      data: { autoUpdate: true, scrapingFailures: 0 },
    });
    console.log(`[ReservationMonitoring] Monitoramento retomado para ${id}`);
  }

  /**
   * Remove reserva do monitoramento
   */
  async removeReservation(id: string): Promise<void> {
    await prisma.externalBooking.delete({
      where: { id },
    });
    console.log(`[ReservationMonitoring] Reserva ${id} removida`);
  }

  /**
   * Retorna historico de mudancas de uma reserva
   */
  async getChangeHistory(bookingCode: string): Promise<any[]> {
    const notifications = await prisma.notification.findMany({
      where: {
        bookingCode: bookingCode.toUpperCase(),
        type: { contains: 'CHANGED' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return notifications.map(n => ({
      type: n.type,
      title: n.title,
      message: n.message,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
      createdAt: n.createdAt,
    }));
  }

  // =====================
  // METODOS PRIVADOS
  // =====================

  private detectChanges(reservation: any, scrapedData: ReservationData): ReservationChange[] {
    const changes: ReservationChange[] = [];

    // Mudanca de numero do voo
    if (scrapedData.flightNumber && reservation.flightNumber !== scrapedData.flightNumber) {
      changes.push({
        field: 'flightNumber',
        oldValue: reservation.flightNumber,
        newValue: scrapedData.flightNumber,
        severity: 'CRITICAL',
      });
    }

    // Mudanca de origem
    if (scrapedData.origin && reservation.origin !== scrapedData.origin) {
      changes.push({
        field: 'origin',
        oldValue: reservation.origin,
        newValue: scrapedData.origin,
        severity: 'CRITICAL',
      });
    }

    // Mudanca de destino
    if (scrapedData.destination && reservation.destination !== scrapedData.destination) {
      changes.push({
        field: 'destination',
        oldValue: reservation.destination,
        newValue: scrapedData.destination,
        severity: 'CRITICAL',
      });
    }

    // Mudanca de portao
    if (scrapedData.gate && reservation.gate !== scrapedData.gate) {
      changes.push({
        field: 'gate',
        oldValue: reservation.gate,
        newValue: scrapedData.gate,
        severity: 'WARNING',
      });
    }

    // Mudanca de terminal
    if (scrapedData.terminal && reservation.terminal !== scrapedData.terminal) {
      changes.push({
        field: 'terminal',
        oldValue: reservation.terminal,
        newValue: scrapedData.terminal,
        severity: 'WARNING',
      });
    }

    // Mudanca de assento
    if (scrapedData.seat && reservation.seat !== scrapedData.seat) {
      changes.push({
        field: 'seat',
        oldValue: reservation.seat,
        newValue: scrapedData.seat,
        severity: 'INFO',
      });
    }

    // Mudanca de status
    if (scrapedData.status && reservation.bookingStatus !== scrapedData.status) {
      const severity = scrapedData.status === 'CANCELLED' ? 'CRITICAL' : 'WARNING';
      changes.push({
        field: 'status',
        oldValue: reservation.bookingStatus,
        newValue: scrapedData.status,
        severity,
      });
    }

    return changes;
  }

  private async saveChange(reservationId: string, bookingCode: string, change: ReservationChange): Promise<void> {
    await prisma.notification.create({
      data: {
        bookingCode,
        type: `${change.field.toUpperCase()}_CHANGED`,
        title: `Alteracao detectada: ${change.field}`,
        message: `${change.field}: ${change.oldValue || 'N/A'} -> ${change.newValue}`,
        priority: change.severity === 'CRITICAL' ? 'URGENT' : change.severity === 'WARNING' ? 'HIGH' : 'MEDIUM',
        status: 'PENDING',
        metadata: JSON.stringify({
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          severity: change.severity,
          detectedAt: new Date().toISOString(),
        }),
      },
    });
  }

  private async createChangeNotifications(reservation: any, changes: ReservationChange[]): Promise<void> {
    const criticalChanges = changes.filter(c => c.severity === 'CRITICAL');

    if (criticalChanges.length > 0) {
      console.log(`[ReservationMonitoring] ALERTA CRITICO: ${criticalChanges.length} mudancas criticas em ${reservation.bookingCode}`);
      // Aqui poderia enviar email, SMS, push notification, etc.
    }
  }

  private calculateNextInterval(departureDate: Date): number {
    const now = new Date();
    const hoursUntilDeparture = (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeparture <= 2) return MONITORING_INTERVALS.LESS_THAN_2_HOURS;
    if (hoursUntilDeparture <= 6) return MONITORING_INTERVALS.LESS_THAN_6_HOURS;
    if (hoursUntilDeparture <= 24) return MONITORING_INTERVALS.LESS_THAN_24_HOURS;
    if (hoursUntilDeparture <= 72) return MONITORING_INTERVALS.BETWEEN_1_AND_3_DAYS;
    if (hoursUntilDeparture <= 168) return MONITORING_INTERVALS.BETWEEN_3_AND_7_DAYS;

    return MONITORING_INTERVALS.MORE_THAN_7_DAYS;
  }

  private shouldCheckNow(reservation: any): boolean {
    if (!reservation.lastChecked) return true;

    const interval = this.calculateNextInterval(reservation.departureDate);
    const nextCheckAt = new Date(reservation.lastChecked.getTime() + interval * 60 * 1000);

    return new Date() >= nextCheckAt;
  }

  private formatReservationResponse(reservation: any, scrapedData?: ReservationData): any {
    return {
      id: reservation.id,
      airline: reservation.airline,
      pnr: reservation.bookingCode,
      lastName: reservation.lastName,
      origin: reservation.origin,
      destination: reservation.destination,
      flightNumber: reservation.flightNumber,
      departureDate: reservation.departureDate,
      status: reservation.bookingStatus,
      gate: reservation.gate,
      terminal: reservation.terminal,
      seat: reservation.seat,
      autoUpdate: reservation.autoUpdate,
      lastChecked: reservation.lastChecked,
      scrapingFailures: reservation.scrapingFailures,
      nextCheckIn: this.calculateNextInterval(reservation.departureDate),
      scrapingResult: scrapedData ? {
        success: scrapedData.success,
        error: scrapedData.error,
      } : undefined,
    };
  }

  private async delay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton
let reservationMonitoringService: ReservationMonitoringService;

export function getReservationMonitoringService(): ReservationMonitoringService {
  if (!reservationMonitoringService) {
    reservationMonitoringService = new ReservationMonitoringService();
  }
  return reservationMonitoringService;
}

export default ReservationMonitoringService;
