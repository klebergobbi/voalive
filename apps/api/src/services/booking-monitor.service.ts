/**
 * 📊 BOOKING MONITOR SERVICE
 * Serviço de monitoramento de reservas com detecção de mudanças
 */

import { PrismaClient } from '@reservasegura/database';
import { getAdvancedScraperService, BookingData, ScraperSession } from './advanced-scraper.service';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface MonitorConfig {
  checkInterval: number; // minutos
  notifyOnChange: boolean;
  autoSync: boolean;
}

export class BookingMonitorService {
  private scraper = getAdvancedScraperService();
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;

  /**
   * Conecta conta de companhia aérea
   */
  async connectAirlineAccount(
    userId: string,
    airline: 'GOL' | 'LATAM' | 'AZUL',
    email: string,
    password: string
  ) {
    console.log(`🔗 Conectando conta ${airline} para usuário ${userId}...`);

    // Fazer login e obter sessão
    const session = await this.scraper.loginAirline(airline, email, password);

    if (!session) {
      throw new Error(`Falha ao fazer login na ${airline}`);
    }

    // Criptografar senha
    const encryptedPassword = this.encryptPassword(password);

    // Salvar no banco
    const account = await prisma.connectedAirlineAccount.create({
      data: {
        userId,
        airline,
        accountEmail: email,
        encryptedPassword,
        sessionCookies: JSON.stringify(session.cookies),
        sessionToken: crypto.randomBytes(32).toString('hex'),
        sessionExpiresAt: session.expiresAt,
        lastLoginAt: new Date(),
        isActive: true,
        autoMonitor: true,
        notifyChanges: true
      }
    });

    console.log(`✅ Conta ${airline} conectada com sucesso!`);

    // Iniciar monitoramento automático
    await this.syncAccountBookings(account.id);

    return account;
  }

  /**
   * Sincroniza reservas de uma conta
   */
  async syncAccountBookings(accountId: string) {
    console.log(`🔄 Sincronizando reservas da conta ${accountId}...`);

    const account = await prisma.connectedAirlineAccount.findUnique({
      where: { id: accountId },
      include: { user: true }
    });

    if (!account) {
      throw new Error('Conta não encontrada');
    }

    // Restaurar sessão
    const session: ScraperSession = {
      airline: account.airline as any,
      email: account.accountEmail,
      cookies: JSON.parse(account.sessionCookies || '[]'),
      userAgent: 'Mozilla/5.0...',
      viewport: { width: 1920, height: 1080 },
      createdAt: account.lastLoginAt || new Date(),
      expiresAt: account.sessionExpiresAt || new Date()
    };

    // Buscar todas as reservas ativas
    const existingMonitors = await prisma.bookingMonitor.findMany({
      where: { accountId, currentStatus: 'ACTIVE' }
    });

    console.log(`  📋 ${existingMonitors.length} reservas sendo monitoradas`);

    // Para cada reserva, fazer scraping e detectar mudanças
    for (const monitor of existingMonitors) {
      try {
        const bookingData = await this.scraper.scrapeBookingWithSession(
          session,
          monitor.bookingCode
        );

        if (bookingData) {
          await this.detectAndSaveChanges(monitor.id, bookingData);
        }
      } catch (error) {
        console.error(`  ❌ Erro ao sincronizar ${monitor.bookingCode}:`, error);
      }
    }

    // Atualizar última sincronização
    await prisma.connectedAirlineAccount.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date() }
    });

    console.log(`✅ Sincronização concluída`);
  }

  /**
   * Adiciona reserva para monitoramento
   */
  async addBookingToMonitor(
    accountId: string,
    bookingCode: string
  ) {
    console.log(`➕ Adicionando reserva ${bookingCode} para monitoramento...`);

    const account = await prisma.connectedAirlineAccount.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      throw new Error('Conta não encontrada');
    }

    // Fazer scraping inicial
    const session = this.scraper.getSession(account.airline, account.accountEmail);

    if (!session) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    const bookingData = await this.scraper.scrapeBookingWithSession(session, bookingCode);

    if (!bookingData) {
      throw new Error('Reserva não encontrada');
    }

    // Criar monitor
    const monitor = await prisma.bookingMonitor.create({
      data: {
        accountId,
        userId: account.userId,
        bookingCode,
        airline: account.airline,
        passengerName: bookingData.passengerName,
        currentFlightNumber: bookingData.flightNumber,
        currentOrigin: bookingData.origin,
        currentDestination: bookingData.destination,
        currentDepartureTime: bookingData.departureTime,
        currentArrivalTime: bookingData.arrivalTime,
        currentSeat: bookingData.seat,
        currentGate: bookingData.gate,
        currentTerminal: bookingData.terminal,
        currentClass: bookingData.class,
        currentStatus: 'ACTIVE',
        monitoringEnabled: true,
        nextCheckAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
        checkInterval: 15,
        rawData: JSON.stringify(bookingData.rawData)
      }
    });

    console.log(`✅ Reserva ${bookingCode} adicionada ao monitoramento`);

    return monitor;
  }

  /**
   * Detecta mudanças em uma reserva
   */
  private async detectAndSaveChanges(monitorId: string, newData: BookingData) {
    const monitor = await prisma.bookingMonitor.findUnique({
      where: { id: monitorId }
    });

    if (!monitor) return;

    const changes: any[] = [];

    // Detectar mudança de voo
    if (monitor.currentFlightNumber !== newData.flightNumber) {
      changes.push({
        changeType: 'FLIGHT_CHANGED',
        oldFlightNumber: monitor.currentFlightNumber,
        newFlightNumber: newData.flightNumber,
        severity: 'CRITICAL'
      });
    }

    // Detectar mudança de horário
    if (monitor.currentDepartureTime.getTime() !== newData.departureTime.getTime()) {
      changes.push({
        changeType: 'TIME_CHANGED',
        oldDepartureTime: monitor.currentDepartureTime,
        newDepartureTime: newData.departureTime,
        severity: 'WARNING'
      });
    }

    // Detectar mudança de assento
    if (monitor.currentSeat && monitor.currentSeat !== newData.seat) {
      changes.push({
        changeType: 'SEAT_CHANGED',
        oldSeat: monitor.currentSeat,
        newSeat: newData.seat,
        severity: 'INFO'
      });
    }

    // Detectar mudança de portão
    if (monitor.currentGate && monitor.currentGate !== newData.gate) {
      changes.push({
        changeType: 'GATE_CHANGED',
        oldGate: monitor.currentGate,
        newGate: newData.gate,
        severity: 'WARNING'
      });
    }

    // Salvar mudanças detectadas
    if (changes.length > 0) {
      console.log(`🚨 ${changes.length} mudança(s) detectada(s) em ${monitor.bookingCode}!`);

      for (const change of changes) {
        await prisma.bookingChange.create({
          data: {
            monitorId,
            ...change,
            detectedAt: new Date(),
            notified: false
          }
        });

        // Criar notificação
        await this.createNotification(monitor.userId, monitor.id, change);
      }

      // Atualizar monitor
      await prisma.bookingMonitor.update({
        where: { id: monitorId },
        data: {
          currentFlightNumber: newData.flightNumber,
          currentDepartureTime: newData.departureTime,
          currentArrivalTime: newData.arrivalTime,
          currentSeat: newData.seat,
          currentGate: newData.gate,
          currentTerminal: newData.terminal,
          hasChanges: true,
          lastChangeDetectedAt: new Date(),
          changesNotified: false
        }
      });
    }

    // Atualizar última checagem
    await prisma.bookingMonitor.update({
      where: { id: monitorId },
      data: {
        lastCheckedAt: new Date(),
        nextCheckAt: new Date(Date.now() + monitor.checkInterval * 60 * 1000),
        checksCount: monitor.checksCount + 1
      }
    });
  }

  /**
   * Cria notificação de mudança
   */
  private async createNotification(userId: string, monitorId: string, change: any) {
    const messages: Record<string, string> = {
      FLIGHT_CHANGED: `🛫 Seu voo foi alterado de ${change.oldFlightNumber} para ${change.newFlightNumber}!`,
      TIME_CHANGED: `⏰ Horário do voo alterado!`,
      SEAT_CHANGED: `💺 Seu assento foi alterado de ${change.oldSeat} para ${change.newSeat}`,
      GATE_CHANGED: `🚪 Portão de embarque alterado: ${change.newGate}`
    };

    await prisma.notification.create({
      data: {
        userId,
        monitorId,
        type: change.changeType,
        title: 'Mudança na sua reserva',
        message: messages[change.changeType] || 'Sua reserva foi alterada',
        priority: change.severity === 'CRITICAL' ? 'URGENT' : 'HIGH',
        status: 'PENDING'
      }
    });
  }

  /**
   * Inicia worker de monitoramento automático
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ Monitoramento já está ativo');
      return;
    }

    console.log('🚀 Iniciando worker de monitoramento automático...');
    this.isMonitoring = true;

    // Executar a cada 5 minutos
    this.monitorInterval = setInterval(async () => {
      await this.runMonitoringCycle();
    }, 5 * 60 * 1000);

    // Executar imediatamente na primeira vez
    this.runMonitoringCycle();

    console.log('✅ Worker de monitoramento iniciado');
  }

  /**
   * Ciclo de monitoramento
   */
  private async runMonitoringCycle() {
    console.log('🔄 Executando ciclo de monitoramento...');

    try {
      // Buscar monitores que precisam ser verificados
      const monitorsToCheck = await prisma.bookingMonitor.findMany({
        where: {
          monitoringEnabled: true,
          nextCheckAt: { lte: new Date() }
        },
        include: { account: true }
      });

      console.log(`  📋 ${monitorsToCheck.length} reservas para verificar`);

      for (const monitor of monitorsToCheck) {
        try {
          await this.checkMonitor(monitor.id);
        } catch (error) {
          console.error(`  ❌ Erro ao verificar ${monitor.bookingCode}:`, error);
        }
      }

      console.log('✅ Ciclo concluído');
    } catch (error) {
      console.error('❌ Erro no ciclo de monitoramento:', error);
    }
  }

  /**
   * Verifica um monitor específico
   */
  private async checkMonitor(monitorId: string) {
    const monitor = await prisma.bookingMonitor.findUnique({
      where: { id: monitorId },
      include: { account: true }
    });

    if (!monitor || !monitor.account) return;

    const session = this.scraper.getSession(
      monitor.account.airline,
      monitor.account.accountEmail
    );

    if (!session) {
      console.log(`  ⚠️ Sessão expirada para ${monitor.account.airline}`);
      return;
    }

    const bookingData = await this.scraper.scrapeBookingWithSession(
      session,
      monitor.bookingCode
    );

    if (bookingData) {
      await this.detectAndSaveChanges(monitorId, bookingData);
    }
  }

  /**
   * Para o monitoramento
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Monitoramento parado');
  }

  /**
   * Criptografa senha
   */
  private encryptPassword(password: string): string {
    const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Descriptografa senha
   */
  private decryptPassword(encryptedPassword: string): string {
    const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// Singleton
let bookingMonitorService: BookingMonitorService;

export function getBookingMonitorService(): BookingMonitorService {
  if (!bookingMonitorService) {
    bookingMonitorService = new BookingMonitorService();
  }
  return bookingMonitorService;
}
