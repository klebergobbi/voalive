/**
 * Serviço de detecção de mudanças em reservas
 * @module changeDetectionService
 */

import { createHash } from '../../shared/utils/encryption';

/**
 * Severidade das mudanças detectadas
 */
export enum ChangeSeverity {
  CRITICA = 'CRÍTICA',
  IMPORTANTE = 'IMPORTANTE',
  INFO = 'INFO',
}

/**
 * Interface de mudança detectada
 */
export interface Change {
  campo: string;
  de: any;
  para: any;
  severidade: ChangeSeverity;
  timestamp: Date;
  descricao: string;
}

/**
 * Interface de dados de reserva
 */
export interface ReservaData {
  codigoReserva: string;
  companhiaAerea: string;
  status: string;
  voo: string;
  dataVoo: string;
  origem: string;
  destino: string;
  passageiros: Array<{
    nome: string;
    assento: string;
    status: string;
  }>;
  portao?: string;
  horarioDecolagem?: string;
  horarioPouso?: string;
  duracao?: string;
  aeronave?: string;
  dataAtualizacao: Date;
  hash: string;
}

/**
 * Campos críticos que requerem notificação imediata
 */
const CRITICAL_FIELDS = ['status', 'voo', 'horarioDecolagem', 'dataVoo'];

/**
 * Campos importantes que requerem atenção
 */
const IMPORTANT_FIELDS = ['assento', 'portao', 'horarioPouso', 'aeronave'];

/**
 * Campos informativos
 */
const INFO_FIELDS = ['duracao', 'origem', 'destino'];

/**
 * Detecta mudanças entre duas versões de uma reserva
 * @param {ReservaData} reservaAtual - Dados atuais da reserva
 * @param {ReservaData} reservaAnterior - Dados anteriores da reserva
 * @returns {Change[]} Array de mudanças detectadas
 */
export function detectarMudancas(
  reservaAtual: ReservaData,
  reservaAnterior: ReservaData
): Change[] {
  const mudancas: Change[] = [];

  // Verificação rápida por hash
  if (reservaAtual.hash === reservaAnterior.hash) {
    return mudancas; // Sem mudanças
  }

  // Comparar campos simples
  const camposSimples = [
    'status',
    'voo',
    'dataVoo',
    'origem',
    'destino',
    'portao',
    'horarioDecolagem',
    'horarioPouso',
    'duracao',
    'aeronave',
  ];

  for (const campo of camposSimples) {
    const valorAtual = (reservaAtual as any)[campo];
    const valorAnterior = (reservaAnterior as any)[campo];

    if (valorAtual !== valorAnterior && valorAnterior !== undefined) {
      mudancas.push({
        campo,
        de: valorAnterior,
        para: valorAtual,
        severidade: determinarSeveridade(campo),
        timestamp: new Date(),
        descricao: gerarDescricao(campo, valorAnterior, valorAtual),
      });
    }
  }

  // Comparar passageiros (assentos e status)
  const mudancasPassageiros = detectarMudancasPassageiros(
    reservaAtual.passageiros,
    reservaAnterior.passageiros
  );
  mudancas.push(...mudancasPassageiros);

  return mudancas;
}

/**
 * Detecta mudanças nos dados dos passageiros
 * @private
 */
function detectarMudancasPassageiros(
  passageirosAtuais: ReservaData['passageiros'],
  passageirosAnteriores: ReservaData['passageiros']
): Change[] {
  const mudancas: Change[] = [];

  if (!passageirosAtuais || !passageirosAnteriores) {
    return mudancas;
  }

  // Mapeia passageiros por nome para comparação
  const mapAnterior = new Map(passageirosAnteriores.map((p) => [p.nome, p]));

  for (const passageiroAtual of passageirosAtuais) {
    const passageiroAnterior = mapAnterior.get(passageiroAtual.nome);

    if (!passageiroAnterior) continue;

    // Mudança de assento
    if (passageiroAtual.assento !== passageiroAnterior.assento) {
      mudancas.push({
        campo: `assento_${passageiroAtual.nome}`,
        de: passageiroAnterior.assento,
        para: passageiroAtual.assento,
        severidade: ChangeSeverity.IMPORTANTE,
        timestamp: new Date(),
        descricao: `Assento de ${passageiroAtual.nome} mudou de ${passageiroAnterior.assento} para ${passageiroAtual.assento}`,
      });
    }

    // Mudança de status do passageiro
    if (passageiroAtual.status !== passageiroAnterior.status) {
      mudancas.push({
        campo: `status_passageiro_${passageiroAtual.nome}`,
        de: passageiroAnterior.status,
        para: passageiroAtual.status,
        severidade: ChangeSeverity.CRITICA,
        timestamp: new Date(),
        descricao: `Status de ${passageiroAtual.nome} mudou de ${passageiroAnterior.status} para ${passageiroAtual.status}`,
      });
    }
  }

  return mudancas;
}

/**
 * Determina a severidade de uma mudança baseada no campo
 * @private
 */
function determinarSeveridade(campo: string): ChangeSeverity {
  if (CRITICAL_FIELDS.includes(campo)) {
    return ChangeSeverity.CRITICA;
  }
  if (IMPORTANT_FIELDS.includes(campo)) {
    return ChangeSeverity.IMPORTANTE;
  }
  return ChangeSeverity.INFO;
}

/**
 * Gera descrição legível de uma mudança
 * @private
 */
function gerarDescricao(campo: string, de: any, para: any): string {
  const descricoes: Record<string, string> = {
    status: `Status da reserva mudou de "${de}" para "${para}"`,
    voo: `Número do voo mudou de ${de} para ${para}`,
    dataVoo: `Data do voo mudou de ${de} para ${para}`,
    horarioDecolagem: `Horário de decolagem mudou de ${de} para ${para}`,
    horarioPouso: `Horário de pouso mudou de ${de} para ${para}`,
    portao: `Portão mudou de ${de || 'não definido'} para ${para || 'não definido'}`,
    aeronave: `Aeronave mudou de ${de} para ${para}`,
    duracao: `Duração do voo mudou de ${de} para ${para}`,
    origem: `Origem mudou de ${de} para ${para}`,
    destino: `Destino mudou de ${de} para ${para}`,
  };

  return descricoes[campo] || `Campo "${campo}" mudou de "${de}" para "${para}"`;
}

/**
 * Cria hash de uma reserva para comparação rápida
 * @param {Partial<ReservaData>} reserva - Dados da reserva
 * @returns {string} Hash SHA-256
 */
export function criarHashReserva(reserva: Partial<ReservaData>): string {
  // Remove campos que não devem afetar o hash
  const dadosParaHash = {
    status: reserva.status,
    voo: reserva.voo,
    dataVoo: reserva.dataVoo,
    origem: reserva.origem,
    destino: reserva.destino,
    portao: reserva.portao,
    horarioDecolagem: reserva.horarioDecolagem,
    horarioPouso: reserva.horarioPouso,
    duracao: reserva.duracao,
    aeronave: reserva.aeronave,
    passageiros: reserva.passageiros?.map((p) => ({
      nome: p.nome,
      assento: p.assento,
      status: p.status,
    })),
  };

  return createHash(dadosParaHash);
}

/**
 * Filtra mudanças por severidade
 * @param {Change[]} mudancas - Array de mudanças
 * @param {ChangeSeverity} severidadeMinima - Severidade mínima
 * @returns {Change[]} Mudanças filtradas
 */
export function filtrarPorSeveridade(
  mudancas: Change[],
  severidadeMinima: ChangeSeverity
): Change[] {
  const ordem = {
    [ChangeSeverity.CRITICA]: 3,
    [ChangeSeverity.IMPORTANTE]: 2,
    [ChangeSeverity.INFO]: 1,
  };

  const nivelMinimo = ordem[severidadeMinima];

  return mudancas.filter((mudanca) => ordem[mudanca.severidade] >= nivelMinimo);
}

/**
 * Agrupa mudanças por severidade
 * @param {Change[]} mudancas - Array de mudanças
 * @returns {Record<ChangeSeverity, Change[]>}
 */
export function agruparPorSeveridade(
  mudancas: Change[]
): Record<string, Change[]> {
  const agrupadas: Record<string, Change[]> = {
    [ChangeSeverity.CRITICA]: [],
    [ChangeSeverity.IMPORTANTE]: [],
    [ChangeSeverity.INFO]: [],
  };

  for (const mudanca of mudancas) {
    agrupadas[mudanca.severidade].push(mudanca);
  }

  return agrupadas;
}

/**
 * Formata mudanças para notificação
 * @param {Change[]} mudancas - Array de mudanças
 * @returns {string} Texto formatado
 */
export function formatarMudancasParaNotificacao(mudancas: Change[]): string {
  if (mudancas.length === 0) {
    return 'Nenhuma mudança detectada.';
  }

  const agrupadas = agruparPorSeveridade(mudancas);
  const linhas: string[] = [];

  if (agrupadas[ChangeSeverity.CRITICA].length > 0) {
    linhas.push('🚨 MUDANÇAS CRÍTICAS:');
    agrupadas[ChangeSeverity.CRITICA].forEach((m) => {
      linhas.push(`  • ${m.descricao}`);
    });
  }

  if (agrupadas[ChangeSeverity.IMPORTANTE].length > 0) {
    linhas.push('\n⚠️ MUDANÇAS IMPORTANTES:');
    agrupadas[ChangeSeverity.IMPORTANTE].forEach((m) => {
      linhas.push(`  • ${m.descricao}`);
    });
  }

  if (agrupadas[ChangeSeverity.INFO].length > 0) {
    linhas.push('\nℹ️ INFORMAÇÕES:');
    agrupadas[ChangeSeverity.INFO].forEach((m) => {
      linhas.push(`  • ${m.descricao}`);
    });
  }

  return linhas.join('\n');
}

/**
 * Verifica se há mudanças críticas
 * @param {Change[]} mudancas - Array de mudanças
 * @returns {boolean}
 */
export function temMudancasCriticas(mudancas: Change[]): boolean {
  return mudancas.some((m) => m.severidade === ChangeSeverity.CRITICA);
}

export default {
  detectarMudancas,
  criarHashReserva,
  filtrarPorSeveridade,
  agruparPorSeveridade,
  formatarMudancasParaNotificacao,
  temMudancasCriticas,
  ChangeSeverity,
};
