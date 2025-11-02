/**
 * Rotas do módulo de reservas
 * @module reservasRoutes
 */

import { Router } from 'express';
import * as reservasController from './controllers/reservasController';

const router = Router();

/**
 * @route POST /api/reservas/monitorar
 * @description Inicia monitoramento de uma reserva
 * @body {codigoReserva, email, senha, companhiaAerea}
 */
router.post('/monitorar', reservasController.monitorarReserva);

/**
 * @route GET /api/reservas/:codigoReserva/status
 * @description Obtém status atual de uma reserva
 * @param {string} codigoReserva - Código da reserva
 */
router.get('/:codigoReserva/status', reservasController.obterStatus);

/**
 * @route DELETE /api/reservas/:codigoReserva/monitorar
 * @description Para e remove monitoramento de uma reserva
 * @param {string} codigoReserva - Código da reserva
 */
router.delete('/:codigoReserva/monitorar', reservasController.pararMonitoramento);

/**
 * @route GET /api/reservas/:codigoReserva/historico
 * @description Obtém histórico completo de mudanças
 * @param {string} codigoReserva - Código da reserva
 * @query {number} limite - Limite de resultados (padrão: 50)
 */
router.get('/:codigoReserva/historico', reservasController.obterHistorico);

/**
 * @route POST /api/reservas/:codigoReserva/parar
 * @description Pausa temporariamente o monitoramento
 * @param {string} codigoReserva - Código da reserva
 */
router.post('/:codigoReserva/parar', reservasController.pausarMonitoramento);

/**
 * @route POST /api/reservas/:codigoReserva/retomar
 * @description Retoma monitoramento pausado
 * @param {string} codigoReserva - Código da reserva
 * @body {email, senha, companhiaAerea}
 */
router.post('/:codigoReserva/retomar', reservasController.retomarMonitoramento);

/**
 * @route GET /api/reservas/estatisticas
 * @description Obtém estatísticas da fila de monitoramento
 */
router.get('/estatisticas', reservasController.obterEstatisticas);

/**
 * @route GET /api/reservas/companhias
 * @description Lista companhias aéreas suportadas
 */
router.get('/companhias', reservasController.listarCompanhias);

/**
 * @route POST /api/reservas/testar-conexao
 * @description Testa conexão com uma companhia aérea
 * @body {companhiaAerea}
 */
router.post('/testar-conexao', reservasController.testarConexao);

/**
 * @route POST /api/reservas/limpar
 * @description Limpa jobs antigos (admin)
 */
router.post('/limpar', reservasController.limparJobs);

export default router;
