/**
 * Modelo de dados de Reserva
 * @module Reserva
 */

/**
 * Interface base de Reserva
 */
export interface IReserva {
  id?: string;
  codigoReserva: string;
  companhiaAerea: string;
  email: string;
  senhaEncriptada: string;

  // Dados da reserva (JSON)
  dados: {
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
  };

  // Metadados
  hash: string;
  ultimaAtualizacao: Date;
  criadoEm: Date;
  atualizadoEm?: Date;
  ativo: boolean;
}

/**
 * Interface para criação de reserva
 */
export interface IReservaCreate {
  codigoReserva: string;
  companhiaAerea: string;
  email: string;
  senhaEncriptada: string;
}

/**
 * Interface para atualização de reserva
 */
export interface IReservaUpdate {
  dados?: IReserva['dados'];
  hash?: string;
  ultimaAtualizacao?: Date;
  ativo?: boolean;
}

/**
 * Status de monitoramento
 */
export enum StatusMonitoramento {
  ATIVO = 'ATIVO',
  PAUSADO = 'PAUSADO',
  ERRO = 'ERRO',
  FALHA_PERMANENTE = 'FALHA_PERMANENTE',
}

/**
 * Classe de modelo de Reserva
 * (Implementação simplificada - pode ser expandida para usar Prisma/TypeORM)
 */
export class Reserva {
  constructor(public data: IReserva) {}

  /**
   * Valida dados da reserva
   */
  static validate(data: Partial<IReserva>): boolean {
    if (!data.codigoReserva || !data.companhiaAerea || !data.email) {
      return false;
    }

    return true;
  }

  /**
   * Cria uma nova instância de reserva
   */
  static create(data: IReservaCreate): IReserva {
    return {
      ...data,
      dados: {
        status: 'PENDENTE',
        voo: 'N/A',
        dataVoo: 'N/A',
        origem: 'N/A',
        destino: 'N/A',
        passageiros: [],
      },
      hash: '',
      ultimaAtualizacao: new Date(),
      criadoEm: new Date(),
      ativo: true,
    };
  }

  /**
   * Serializa para JSON
   */
  toJSON() {
    return {
      ...this.data,
      // Remove senha do output
      senhaEncriptada: undefined,
    };
  }

  /**
   * Serializa para armazenamento seguro
   */
  toStorage() {
    return this.data;
  }
}

/**
 * Utilitários de consulta (mock - implementar com banco real)
 */
export class ReservaRepository {
  /**
   * Encontra reserva por código
   */
  static async findByCodigoReserva(codigoReserva: string): Promise<IReserva | null> {
    // Implementação mock - substituir por query real no banco
    console.log(`[Reserva Repository] Buscando reserva: ${codigoReserva}`);
    return null;
  }

  /**
   * Cria nova reserva
   */
  static async create(data: IReservaCreate): Promise<IReserva> {
    // Implementação mock
    const reserva = Reserva.create(data);
    console.log(`[Reserva Repository] Criando reserva: ${data.codigoReserva}`);
    return reserva;
  }

  /**
   * Atualiza reserva
   */
  static async update(
    codigoReserva: string,
    data: IReservaUpdate
  ): Promise<IReserva | null> {
    // Implementação mock
    console.log(`[Reserva Repository] Atualizando reserva: ${codigoReserva}`);
    return null;
  }

  /**
   * Deleta reserva
   */
  static async delete(codigoReserva: string): Promise<boolean> {
    // Implementação mock
    console.log(`[Reserva Repository] Deletando reserva: ${codigoReserva}`);
    return true;
  }

  /**
   * Lista todas as reservas ativas
   */
  static async findAllAtivas(): Promise<IReserva[]> {
    // Implementação mock
    console.log('[Reserva Repository] Listando reservas ativas');
    return [];
  }
}

export default {
  Reserva,
  ReservaRepository,
  StatusMonitoramento,
};
