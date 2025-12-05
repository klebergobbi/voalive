/**
 * MONITORING ROUTES INDEX
 * Exporta todas as rotas de monitoramento
 */

import { Router } from 'express';
import reservationMonitoringRoutes from './reservation-monitoring.routes';
import { getReservationMonitoringWorker } from '../workers/reservation-monitoring.worker';

const router = Router();

// Montar rotas de monitoramento
router.use('/monitoring', reservationMonitoringRoutes);

// Iniciar worker automaticamente quando as rotas forem carregadas
const worker = getReservationMonitoringWorker();
if (process.env.NODE_ENV === 'production' || process.env.AUTO_START_MONITORING === 'true') {
  console.log('[MonitoringRoutes] Iniciando worker automaticamente...');
  worker.start();
}

export default router;
