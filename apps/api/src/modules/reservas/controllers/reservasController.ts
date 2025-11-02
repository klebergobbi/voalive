/**
 * Controller de reservas - Endpoints REST
 * @module reservasController
 */

import { Request, Response } from 'express';
import * as reservasQueue from '../queues/reservasQueue';
import * as scraperService from '../services/scraperService';
import { encrypt } from '../../shared/utils/encryption';
import {
  ValidationError,
  NotFoundError,
  asyncHandler,
} from '../../shared/utils/errorHandler';

/**
 * POST /api/reservas/monitorar
 * Inicia monitoramento de uma reserva
 */
export const monitorarReserva = asyncHandler(async (req: Request, res: Response) => {
  const { codigoReserva, email, senha, companhiaAerea } = req.body;

  // Validações
  if (!codigoReserva || !email || !senha || !companhiaAerea) {
    throw new ValidationError('Campos obrigatórios: codigoReserva, email, senha, companhiaAerea');
  }

  if (!scraperService.isCompanhiaSuportada(companhiaAerea)) {
    throw new ValidationError(
      `Companhia aérea não suportada. Suportadas: ${scraperService.listarCompanhiasSuportadas().join(', ')}`
    );
  }

  // Criptografa senha
  const senhaEncriptada = encrypt(senha);

  // Adiciona à fila
  const jobId = await reservasQueue.adicionarReserva({
    codigoReserva,
    email,
    senhaEncriptada,
    companhiaAerea,
  });

  // Calcula próxima verificação (imediato + 10 minutos)
  const proximaVerificacao = new Date(Date.now() + 10 * 60 * 1000);

  res.status(201).json({
    sucesso: true,
    mensagem: 'Monitoramento iniciado com sucesso',
    dados: {
      jobId,
      codigoReserva,
      companhiaAerea,
      status: 'MONITORANDO',
      proximaVerificacao,
    },
  });
});

/**
 * GET /api/reservas/:codigoReserva/status
 * Obtém status atual de uma reserva
 */
export const obterStatus = asyncHandler(async (req: Request, res: Response) => {
  const { codigoReserva } = req.params;

  if (!codigoReserva) {
    throw new ValidationError('Código da reserva é obrigatório');
  }

  // Busca no Redis
  const resultado = await reservasQueue.obterStatus(codigoReserva);

  if (!resultado) {
    throw new NotFoundError('Reserva não encontrada ou nunca foi monitorada');
  }

  // Busca mudanças recentes (últimas 5)
  const historicoCompleto = await reservasQueue.obterHistorico(codigoReserva);
  const mudancasRecentes = historicoCompleto.slice(0, 5);

  res.json({
    sucesso: true,
    dados: {
      codigoReserva,
      reserva: resultado.reserva,
      ultimaAtualizacao: resultado.timestamp,
      mudancasRecentes,
      totalMudancas: historicoCompleto.length,
    },
  });
});

/**
 * DELETE /api/reservas/:codigoReserva/monitorar
 * Para e remove monitoramento de uma reserva
 */
export const pararMonitoramento = asyncHandler(async (req: Request, res: Response) => {
  const { codigoReserva } = req.params;

  if (!codigoReserva) {
    throw new ValidationError('Código da reserva é obrigatório');
  }

  await reservasQueue.removerReserva(codigoReserva);

  res.json({
    sucesso: true,
    mensagem: `Monitoramento da reserva ${codigoReserva} foi interrompido`,
  });
});

/**
 * GET /api/reservas/:codigoReserva/historico
 * Obtém histórico completo de mudanças
 */
export const obterHistorico = asyncHandler(async (req: Request, res: Response) => {
  const { codigoReserva } = req.params;
  const { limite = 50 } = req.query;

  if (!codigoReserva) {
    throw new ValidationError('Código da reserva é obrigatório');
  }

  const historicoCompleto = await reservasQueue.obterHistorico(codigoReserva);

  if (historicoCompleto.length === 0) {
    throw new NotFoundError('Nenhum histórico encontrado para esta reserva');
  }

  // Limita resultado
  const limiteNum = parseInt(limite as string, 10);
  const historico = historicoCompleto.slice(0, limiteNum);

  res.json({
    sucesso: true,
    dados: {
      codigoReserva,
      historico,
      total: historicoCompleto.length,
      limite: limiteNum,
    },
  });
});

/**
 * POST /api/reservas/:codigoReserva/parar
 * Pausa temporariamente o monitoramento (sem remover dados)
 */
export const pausarMonitoramento = asyncHandler(async (req: Request, res: Response) => {
  const { codigoReserva } = req.params;

  if (!codigoReserva) {
    throw new ValidationError('Código da reserva é obrigatório');
  }

  await reservasQueue.pausarReserva(codigoReserva);

  res.json({
    sucesso: true,
    mensagem: `Monitoramento da reserva ${codigoReserva} foi pausado`,
  });
});

/**
 * POST /api/reservas/:codigoReserva/retomar
 * Retoma monitoramento pausado
 */
export const retomarMonitoramento = asyncHandler(async (req: Request, res: Response) => {
  const { codigoReserva } = req.params;
  const { email, senha, companhiaAerea } = req.body;

  // Validações
  if (!codigoReserva) {
    throw new ValidationError('Código da reserva é obrigatório');
  }

  if (!email || !senha || !companhiaAerea) {
    throw new ValidationError(
      'Para retomar o monitoramento, forneça: email, senha, companhiaAerea'
    );
  }

  // Busca reserva anterior
  const resultado = await reservasQueue.obterStatus(codigoReserva);

  // Criptografa senha
  const senhaEncriptada = encrypt(senha);

  // Retoma monitoramento
  await reservasQueue.retomarReserva({
    codigoReserva,
    email,
    senhaEncriptada,
    companhiaAerea,
    reservaAnterior: resultado?.reserva,
  });

  const proximaVerificacao = new Date(Date.now() + 10 * 60 * 1000);

  res.json({
    sucesso: true,
    mensagem: `Monitoramento da reserva ${codigoReserva} foi retomado`,
    proximaVerificacao,
  });
});

/**
 * GET /api/reservas/estatisticas
 * Obtém estatísticas da fila de monitoramento
 */
export const obterEstatisticas = asyncHandler(async (req: Request, res: Response) => {
  const stats = await reservasQueue.obterEstatisticas();

  if (!stats) {
    throw new Error('Não foi possível obter estatísticas');
  }

  // Taxa de erro
  const taxaErro =
    stats.completados + stats.falhados > 0
      ? (stats.falhados / (stats.completados + stats.falhados)) * 100
      : 0;

  res.json({
    sucesso: true,
    dados: {
      fila: stats,
      metricas: {
        taxaErro: `${taxaErro.toFixed(2)}%`,
        alertaAlto: taxaErro > 10,
      },
    },
  });
});

/**
 * GET /api/reservas/companhias
 * Lista companhias aéreas suportadas
 */
export const listarCompanhias = asyncHandler(async (req: Request, res: Response) => {
  const companhias = scraperService.listarCompanhiasSuportadas();

  res.json({
    sucesso: true,
    dados: {
      companhias,
      total: companhias.length,
      urls: scraperService.URLS_COMPANHIAS,
    },
  });
});

/**
 * POST /api/reservas/testar-conexao
 * Testa conexão com uma companhia aérea
 */
export const testarConexao = asyncHandler(async (req: Request, res: Response) => {
  const { companhiaAerea } = req.body;

  if (!companhiaAerea) {
    throw new ValidationError('Campo companhiaAerea é obrigatório');
  }

  if (!scraperService.isCompanhiaSuportada(companhiaAerea)) {
    throw new ValidationError(`Companhia ${companhiaAerea} não é suportada`);
  }

  const sucesso = await scraperService.testarConexao(companhiaAerea);

  res.json({
    sucesso,
    mensagem: sucesso
      ? `Conexão com ${companhiaAerea} estabelecida com sucesso`
      : `Falha ao conectar com ${companhiaAerea}`,
    companhiaAerea,
  });
});

/**
 * POST /api/reservas/limpar
 * Limpa jobs antigos (admin)
 */
export const limparJobs = asyncHandler(async (req: Request, res: Response) => {
  await reservasQueue.limparJobs();

  res.json({
    sucesso: true,
    mensagem: 'Jobs antigos foram limpos',
  });
});

export default {
  monitorarReserva,
  obterStatus,
  pararMonitoramento,
  obterHistorico,
  pausarMonitoramento,
  retomarMonitoramento,
  obterEstatisticas,
  listarCompanhias,
  testarConexao,
  limparJobs,
};
