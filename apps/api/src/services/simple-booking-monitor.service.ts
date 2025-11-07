/**
 * 📊 SIMPLE BOOKING MONITOR SERVICE
 * Serviço de monitoramento de reservas com WEB SCRAPING REAL
 * Monitora reservas com autoUpdate = true usando o scraperService do módulo reservas
 */

import { PrismaClient } from '@prisma/client';
import { monitorarReserva, isCompanhiaSuportada } from '../modules/reservas/services/scraperService';
import type { ReservaData } from '../modules/reservas/services/changeDetectionService';
import { getNotificationService } from './notification.service';

const prisma = new PrismaClient();
const notificationService = getNotificationService();

export class SimpleBookingMonitorService {
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutos

  /**
   * Inicia monitoramento automático
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️  [SimpleBookingMonitor] Monitoramento já está ativo');
      return;
    }

    console.log('🚀 [SimpleBookingMonitor] Iniciando worker de monitoramento automático...');
    this.isMonitoring = true;

    // Executar ciclo a cada 15 minutos
    this.monitorInterval = setInterval(async () => {
      await this.runMonitoringCycle();
    }, this.CHECK_INTERVAL);

    // Executar imediatamente na primeira vez
    this.runMonitoringCycle();

    console.log('✅ [SimpleBookingMonitor] Worker de monitoramento iniciado');
    console.log(`⏱️  [SimpleBookingMonitor] Verificando reservas a cada ${this.CHECK_INTERVAL / 60000} minutos`);
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
    console.log('🛑 [SimpleBookingMonitor] Monitoramento parado');
  }

  /**
   * Ciclo de monitoramento
   */
  private async runMonitoringCycle() {
    console.log('🔄 [SimpleBookingMonitor] Executando ciclo de monitoramento...');

    try {
      // Buscar reservas com autoUpdate = true
      const bookingsToMonitor = await prisma.externalBooking.findMany({
        where: {
          autoUpdate: true,
          bookingStatus: {
            in: ['CONFIRMED', 'PENDING', 'CHECKED_IN']
          },
          // Apenas reservas futuras (até 7 dias após o voo)
          departureDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias no futuro
          }
        }
      });

      console.log(`  📋 [SimpleBookingMonitor] ${bookingsToMonitor.length} reservas para monitorar`);

      if (bookingsToMonitor.length === 0) {
        console.log('  ℹ️  [SimpleBookingMonitor] Nenhuma reserva ativa com monitoramento');
        return;
      }

      // Agrupar por companhia
      const byAirline = bookingsToMonitor.reduce((acc, booking) => {
        if (!acc[booking.airline]) {
          acc[booking.airline] = [];
        }
        acc[booking.airline].push(booking);
        return acc;
      }, {} as Record<string, any[]>);

      // Log estatísticas
      for (const airline in byAirline) {
        console.log(`  ✈️  [SimpleBookingMonitor] ${airline}: ${byAirline[airline]?.length || 0} reservas`);
      }

      // Processar cada reserva com scraping REAL
      let scraped = 0;
      let failed = 0;
      let changes = 0;

      for (const booking of bookingsToMonitor) {
        try {
          // Verificar se a companhia é suportada
          if (!isCompanhiaSuportada(booking.airline)) {
            console.log(`  ⚠️  [SimpleBookingMonitor] Companhia ${booking.airline} não suportada para scraping`);
            continue;
          }

          console.log(`  🔍 [SimpleBookingMonitor] Verificando reserva ${booking.bookingCode} - ${booking.airline}`);

          // Fazer scraping REAL da reserva
          // Nota: O scraperService espera email/senha, mas para consulta pública
          // algumas companhias aceitam apenas código + sobrenome
          // Vamos usar o email (se disponível) ou sobrenome como fallback
          const scrapedData: ReservaData = await monitorarReserva({
            codigoReserva: booking.bookingCode,
            email: booking.email || booking.lastName,
            senha: '', // Consulta pública não requer senha
            companhiaAerea: booking.airline,
            timeout: 30000,
            retries: 3 // Ativa RETRY INTELIGENTE para GOL (3 estratégias)
          });

          // Detectar mudanças comparando dados
          const hasChanges = await this.detectAndHandleChanges(booking, scrapedData);

          if (hasChanges) {
            changes++;
            console.log(`  🔔 [SimpleBookingMonitor] Mudança detectada em ${booking.bookingCode}`);
          }

          scraped++;

          // Atualizar lastChecked e resetar contador de falhas em caso de sucesso
          await prisma.externalBooking.update({
            where: { id: booking.id },
            data: {
              lastChecked: new Date(),
              scrapingFailures: 0, // Reset em caso de sucesso
              lastScrapingError: null
            }
          });

          // Delay entre requisições para evitar bloqueio
          await this.delay(2000, 5000);

        } catch (error: any) {
          failed++;
          console.error(`  ❌ [SimpleBookingMonitor] Erro ao verificar ${booking.bookingCode}:`, error.message);

          // Incrementar contador de falhas
          const currentFailures = booking.scrapingFailures || 0;
          const newFailureCount = currentFailures + 1;

          // Atualizar lastChecked e contador de falhas
          await prisma.externalBooking.update({
            where: { id: booking.id },
            data: {
              lastChecked: new Date(),
              scrapingFailures: newFailureCount,
              lastScrapingError: error.message.substring(0, 500) // Limitar tamanho
            }
          });

          // Criar notificação baseada no número de falhas
          await this.handleScrapingFailure(
            booking.bookingCode,
            booking.airline,
            newFailureCount,
            error.message,
            booking.departureDate
          );
        }
      }

      console.log(`✅ [SimpleBookingMonitor] Ciclo concluído: ${scraped} verificadas, ${changes} mudanças, ${failed} falhas`);
    } catch (error) {
      console.error('❌ [SimpleBookingMonitor] Erro no ciclo de monitoramento:', error);
    }
  }

  /**
   * Detecta e processa mudanças entre dados armazenados e scraped
   */
  private async detectAndHandleChanges(booking: any, scrapedData: ReservaData): Promise<boolean> {
    const changes: string[] = [];

    // Comparar campos importantes
    if (scrapedData.voo && booking.flightNumber !== scrapedData.voo) {
      changes.push(`Número do voo: ${booking.flightNumber} → ${scrapedData.voo}`);
    }

    if (scrapedData.status && booking.bookingStatus !== scrapedData.status) {
      changes.push(`Status: ${booking.bookingStatus} → ${scrapedData.status}`);
    }

    if (scrapedData.portao && booking.gate !== scrapedData.portao) {
      changes.push(`Portão: ${booking.gate || 'N/A'} → ${scrapedData.portao}`);
    }

    if (scrapedData.horarioDecolagem) {
      const oldTime = booking.departureDate.toISOString().slice(11, 16);
      if (oldTime !== scrapedData.horarioDecolagem) {
        changes.push(`Horário de decolagem: ${oldTime} → ${scrapedData.horarioDecolagem}`);
      }
    }

    // Se houver mudanças, atualizar banco e criar log
    if (changes.length > 0) {
      console.log(`  📝 [SimpleBookingMonitor] Mudanças em ${booking.bookingCode}:`, changes);

      // Atualizar reserva com novos dados
      await prisma.externalBooking.update({
        where: { id: booking.id },
        data: {
          ...(scrapedData.voo && { flightNumber: scrapedData.voo }),
          ...(scrapedData.status && { bookingStatus: scrapedData.status }),
          ...(scrapedData.portao && { gate: scrapedData.portao }),
          lastUpdated: new Date(),
          rawData: JSON.stringify(scrapedData)
        }
      });

      // Criar notificação de mudança para o usuário
      if (changes.length > 0) {
        await notificationService.createNotification({
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          type: 'STATUS_CHANGED',
          priority: 'HIGH',
          title: `✈️ Mudança detectada - ${booking.bookingCode}`,
          message: `Alterações na reserva ${booking.bookingCode}: ${changes.join(', ')}`,
          metadata: {
            airline: booking.airline,
            changes,
            timestamp: new Date().toISOString()
          }
        });
      }

      return true;
    }

    return false;
  }

  /**
   * Tratar falha de scraping e criar notificação apropriada
   */
  private async handleScrapingFailure(
    bookingCode: string,
    airline: string,
    failureCount: number,
    errorMessage: string,
    departureDate?: Date
  ) {
    // Criar notificação apenas em certas situações
    // Evitar spam de notificações a cada falha

    if (failureCount === 3) {
      // Primeira notificação após 3 falhas consecutivas
      await notificationService.createScrapingFailedAlert(
        bookingCode,
        airline,
        failureCount,
        errorMessage
      );
    } else if (failureCount === 10) {
      // Segunda notificação após 10 falhas - verificação manual recomendada
      await notificationService.createManualCheckAlert(
        bookingCode,
        airline,
        `Sistema falhou ${failureCount} vezes ao verificar automaticamente.`,
        departureDate
      );
    } else if (failureCount >= 20 && failureCount % 10 === 0) {
      // Notificação a cada 10 falhas após 20
      await notificationService.createManualCheckAlert(
        bookingCode,
        airline,
        `Sistema continua com dificuldades (${failureCount} falhas).`,
        departureDate
      );
    }

    // Se voo está nas próximas 24h e falhou >= 5 vezes: URGENTE
    if (departureDate && failureCount >= 5) {
      const hoursUntilDeparture = (departureDate.getTime() - Date.now()) / (60 * 60 * 1000);
      if (hoursUntilDeparture > 0 && hoursUntilDeparture <= 24) {
        await notificationService.createManualCheckAlert(
          bookingCode,
          airline,
          `⚠️ VOO EM 24H: Por favor, verifique manualmente sua reserva!`,
          departureDate
        );
      }
    }
  }

  /**
   * Delay aleatório para simular comportamento humano
   */
  private async delay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retorna status do monitoramento
   */
  getStatus() {
    return {
      isRunning: this.isMonitoring,
      checkInterval: this.CHECK_INTERVAL,
      checkIntervalMinutes: this.CHECK_INTERVAL / 60000
    };
  }

  /**
   * Retorna estatísticas de reservas monitoradas
   */
  async getStats() {
    const total = await prisma.externalBooking.count({
      where: { autoUpdate: true }
    });

    const active = await prisma.externalBooking.count({
      where: {
        autoUpdate: true,
        bookingStatus: {
          in: ['CONFIRMED', 'PENDING', 'CHECKED_IN']
        },
        departureDate: {
          gte: new Date()
        }
      }
    });

    const byAirline = await prisma.externalBooking.groupBy({
      by: ['airline'],
      where: {
        autoUpdate: true,
        departureDate: {
          gte: new Date()
        }
      },
      _count: true
    });

    return {
      total,
      active,
      byAirline: byAirline.map(a => ({
        airline: a.airline,
        count: a._count
      }))
    };
  }
}

// Singleton
let simpleBookingMonitorService: SimpleBookingMonitorService;

export function getSimpleBookingMonitorService(): SimpleBookingMonitorService {
  if (!simpleBookingMonitorService) {
    simpleBookingMonitorService = new SimpleBookingMonitorService();
  }
  return simpleBookingMonitorService;
}
