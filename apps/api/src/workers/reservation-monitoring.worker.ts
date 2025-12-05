/**
 * RESERVATION MONITORING WORKER
 * Worker para monitoramento automatico de reservas
 *
 * Features:
 * - Execucao a cada 30 minutos (configuravel)
 * - Intervalos dinamicos por reserva
 * - Logs detalhados
 * - Tratamento de erros robusto
 */

import cron from 'node-cron';
import { getReservationMonitoringService } from '../services/reservation-monitoring.service';

export class ReservationMonitoringWorker {
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;
  private monitoringService = getReservationMonitoringService();

  // Intervalo padrao: a cada 30 minutos
  private readonly CRON_SCHEDULE = '*/30 * * * *';

  /**
   * Inicia o worker de monitoramento
   */
  start(): void {
    if (this.isRunning) {
      console.log('[MonitoringWorker] Worker ja esta rodando');
      return;
    }

    console.log('=============================================');
    console.log('[MonitoringWorker] Iniciando worker de monitoramento');
    console.log(`[MonitoringWorker] Schedule: ${this.CRON_SCHEDULE}`);
    console.log('=============================================');

    this.cronJob = cron.schedule(this.CRON_SCHEDULE, async () => {
      await this.runCycle();
    });

    this.isRunning = true;
    console.log('[MonitoringWorker] Worker iniciado com sucesso');

    // Executar primeira vez apos 1 minuto
    setTimeout(() => {
      console.log('[MonitoringWorker] Executando ciclo inicial...');
      this.runCycle();
    }, 60000);
  }

  /**
   * Para o worker
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('[MonitoringWorker] Worker parado');
  }

  /**
   * Executa um ciclo de monitoramento
   */
  async runCycle(): Promise<void> {
    const startTime = Date.now();
    console.log('---------------------------------------------');
    console.log(`[MonitoringWorker] Ciclo iniciado em ${new Date().toISOString()}`);

    try {
      const result = await this.monitoringService.runMonitoringCycle();

      const duration = Date.now() - startTime;
      console.log(`[MonitoringWorker] Ciclo concluido em ${duration}ms`);
      console.log(`[MonitoringWorker] Resultados: ${result.checked} verificadas, ${result.changes} mudancas, ${result.errors} erros`);

    } catch (error: any) {
      console.error('[MonitoringWorker] Erro no ciclo:', error.message);
    }

    console.log('---------------------------------------------');
  }

  /**
   * Executa ciclo manualmente (para testes)
   */
  async triggerManually(): Promise<any> {
    console.log('[MonitoringWorker] Ciclo manual solicitado');
    return this.monitoringService.runMonitoringCycle();
  }

  /**
   * Retorna status do worker
   */
  getStatus(): { isRunning: boolean; schedule: string; nextRun: string | null } {
    let nextRun: string | null = null;

    if (this.isRunning) {
      // Calcular proximo horario baseado no cron
      const now = new Date();
      const minutes = now.getMinutes();
      const nextMinutes = Math.ceil(minutes / 30) * 30;
      const next = new Date(now);
      next.setMinutes(nextMinutes, 0, 0);
      if (next <= now) {
        next.setMinutes(next.getMinutes() + 30);
      }
      nextRun = next.toISOString();
    }

    return {
      isRunning: this.isRunning,
      schedule: this.CRON_SCHEDULE,
      nextRun,
    };
  }
}

// Singleton
let worker: ReservationMonitoringWorker;

export function getReservationMonitoringWorker(): ReservationMonitoringWorker {
  if (!worker) {
    worker = new ReservationMonitoringWorker();
  }
  return worker;
}

// Auto-start quando o modulo for carregado (se configurado)
if (process.env.AUTO_START_MONITORING === 'true') {
  console.log('[MonitoringWorker] Auto-start habilitado');
  getReservationMonitoringWorker().start();
}

export default ReservationMonitoringWorker;
