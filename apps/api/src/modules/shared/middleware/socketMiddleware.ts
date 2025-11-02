/**
 * Middleware Socket.io para notificações em tempo real
 * @module socketMiddleware
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { reservasEmitter } from '../../reservas/queues/reservasQueue';
import { sanitizeForLog } from '../utils/encryption';

/**
 * Mapeamento de sockets por código de reserva
 */
const reservaSubscriptions = new Map<string, Set<string>>();

/**
 * Configuração Socket.io
 */
const SOCKET_CONFIG = {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
};

/**
 * Instância do Socket.io
 */
let io: SocketIOServer | null = null;

/**
 * Inicializa Socket.io server
 * @param {HTTPServer} httpServer - Servidor HTTP Express
 * @returns {SocketIOServer}
 */
export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, SOCKET_CONFIG);

  console.log('[Socket.io] Servidor inicializado');

  // Connection handler
  io.on('connection', handleConnection);

  // Listeners de eventos da fila
  setupQueueListeners();

  return io;
}

/**
 * Handler de conexão de cliente
 * @private
 */
function handleConnection(socket: Socket) {
  console.log(`[Socket.io] Cliente conectado: ${socket.id}`);

  // Evento: Inscrever em reserva
  socket.on('reserva:inscrever', (data: { codigoReserva: string }) => {
    handleSubscribe(socket, data.codigoReserva);
  });

  // Evento: Desinscrever de reserva
  socket.on('reserva:desinscrever', (data: { codigoReserva: string }) => {
    handleUnsubscribe(socket, data.codigoReserva);
  });

  // Evento: Solicitar status da fila
  socket.on('fila:status', async () => {
    // Será emitido automaticamente pelo timer da fila
    socket.emit('fila:status', { mensagem: 'Status será enviado periodicamente' });
  });

  // Evento: Ping/Pong para keep-alive
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  // Desconexão
  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });

  // Erro
  socket.on('error', (error) => {
    console.error(`[Socket.io] Erro no socket ${socket.id}:`, error);
  });

  // Envia confirmação de conexão
  socket.emit('connected', {
    socketId: socket.id,
    timestamp: new Date(),
    mensagem: 'Conectado ao servidor de notificações',
  });
}

/**
 * Inscreve socket em notificações de uma reserva
 * @private
 */
function handleSubscribe(socket: Socket, codigoReserva: string) {
  if (!codigoReserva) {
    socket.emit('erro', { mensagem: 'Código da reserva é obrigatório' });
    return;
  }

  // Adiciona socket à sala da reserva
  socket.join(`reserva:${codigoReserva}`);

  // Registra inscrição
  if (!reservaSubscriptions.has(codigoReserva)) {
    reservaSubscriptions.set(codigoReserva, new Set());
  }
  reservaSubscriptions.get(codigoReserva)!.add(socket.id);

  console.log(
    `[Socket.io] Socket ${socket.id} inscrito na reserva ${codigoReserva}. Total: ${
      reservaSubscriptions.get(codigoReserva)!.size
    }`
  );

  socket.emit('reserva:inscrito', {
    codigoReserva,
    mensagem: `Inscrito nas atualizações da reserva ${codigoReserva}`,
  });
}

/**
 * Desinscreve socket de notificações de uma reserva
 * @private
 */
function handleUnsubscribe(socket: Socket, codigoReserva: string) {
  if (!codigoReserva) {
    socket.emit('erro', { mensagem: 'Código da reserva é obrigatório' });
    return;
  }

  // Remove socket da sala
  socket.leave(`reserva:${codigoReserva}`);

  // Remove inscrição
  const subscribers = reservaSubscriptions.get(codigoReserva);
  if (subscribers) {
    subscribers.delete(socket.id);

    if (subscribers.size === 0) {
      reservaSubscriptions.delete(codigoReserva);
    }
  }

  console.log(`[Socket.io] Socket ${socket.id} desinscrito da reserva ${codigoReserva}`);

  socket.emit('reserva:desinscrito', {
    codigoReserva,
    mensagem: `Desinscrito das atualizações da reserva ${codigoReserva}`,
  });
}

/**
 * Handler de desconexão
 * @private
 */
function handleDisconnect(socket: Socket) {
  console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);

  // Remove de todas as inscrições
  for (const [codigoReserva, subscribers] of reservaSubscriptions.entries()) {
    if (subscribers.has(socket.id)) {
      subscribers.delete(socket.id);

      if (subscribers.size === 0) {
        reservaSubscriptions.delete(codigoReserva);
      }
    }
  }
}

/**
 * Configura listeners de eventos da fila
 * @private
 */
function setupQueueListeners() {
  // Evento: Reserva atualizada
  reservasEmitter.on('reserva:atualizada', (data) => {
    const { codigoReserva, companhiaAerea, mudancas, reserva } = data;

    console.log(
      `[Socket.io] Emitindo atualização para reserva ${codigoReserva} (${mudancas.length} mudanças)`
    );

    // Sanitiza dados sensíveis
    const dadosLimpos = sanitizeForLog({
      codigoReserva,
      companhiaAerea,
      mudancas,
      reserva: {
        ...reserva,
        // Remove campos sensíveis se houver
      },
      timestamp: new Date(),
    });

    // Emite para todos inscritos nesta reserva
    io?.to(`reserva:${codigoReserva}`).emit('reserva:atualizada', dadosLimpos);

    // Emite broadcast geral (sem dados sensíveis)
    io?.emit('reserva:notificacao', {
      codigoReserva,
      companhiaAerea,
      totalMudancas: mudancas.length,
      temCriticas: mudancas.some((m) => m.severidade === 'CRÍTICA'),
      timestamp: new Date(),
    });
  });

  // Evento: Erro no monitoramento
  reservasEmitter.on('reserva:erro', (data) => {
    const { codigoReserva, companhiaAerea, erro, tentativas } = data;

    console.warn(`[Socket.io] Erro na reserva ${codigoReserva}:`, erro);

    io?.to(`reserva:${codigoReserva}`).emit('reserva:erro', {
      codigoReserva,
      companhiaAerea,
      erro,
      tentativas,
      timestamp: new Date(),
    });
  });

  // Evento: Falha permanente
  reservasEmitter.on('reserva:falha-permanente', (data) => {
    const { codigoReserva, companhiaAerea, erro, falhasConsecutivas } = data;

    console.error(
      `[Socket.io] Falha permanente na reserva ${codigoReserva} após ${falhasConsecutivas} tentativas`
    );

    io?.to(`reserva:${codigoReserva}`).emit('reserva:falha-permanente', {
      codigoReserva,
      companhiaAerea,
      erro,
      falhasConsecutivas,
      mensagem: 'Monitoramento foi interrompido devido a múltiplas falhas',
      timestamp: new Date(),
    });
  });

  // Evento: Status da fila
  reservasEmitter.on('fila:status', (stats) => {
    // Emite para todos os clientes conectados
    io?.emit('fila:status', {
      ...stats,
      timestamp: new Date(),
    });
  });

  console.log('[Socket.io] Listeners da fila configurados');
}

/**
 * Emite evento para uma reserva específica
 * @param {string} codigoReserva - Código da reserva
 * @param {string} evento - Nome do evento
 * @param {any} data - Dados a enviar
 */
export function emitToReserva(codigoReserva: string, evento: string, data: any) {
  if (!io) {
    console.warn('[Socket.io] Socket.io não inicializado');
    return;
  }

  io.to(`reserva:${codigoReserva}`).emit(evento, data);
}

/**
 * Emite broadcast para todos os clientes
 * @param {string} evento - Nome do evento
 * @param {any} data - Dados a enviar
 */
export function emitBroadcast(evento: string, data: any) {
  if (!io) {
    console.warn('[Socket.io] Socket.io não inicializado');
    return;
  }

  io.emit(evento, data);
}

/**
 * Obtém estatísticas de conexões
 */
export function getConnectionStats() {
  if (!io) {
    return {
      connected: 0,
      subscriptions: 0,
      reservas: 0,
    };
  }

  const allSockets = io.sockets.sockets;

  return {
    connected: allSockets.size,
    subscriptions: Array.from(reservaSubscriptions.values()).reduce(
      (total, set) => total + set.size,
      0
    ),
    reservas: reservaSubscriptions.size,
  };
}

/**
 * Obtém inscrições de uma reserva
 * @param {string} codigoReserva - Código da reserva
 */
export function getReservaSubscribers(codigoReserva: string): number {
  const subscribers = reservaSubscriptions.get(codigoReserva);
  return subscribers ? subscribers.size : 0;
}

/**
 * Força desconexão de todos os clientes (shutdown)
 */
export function disconnectAll() {
  if (!io) return;

  console.log('[Socket.io] Desconectando todos os clientes...');

  io.disconnectSockets(true);
  reservaSubscriptions.clear();

  console.log('[Socket.io] Todos os clientes desconectados');
}

/**
 * Obtém instância do Socket.io
 */
export function getIO(): SocketIOServer | null {
  return io;
}

// Graceful shutdown
process.on('SIGTERM', () => {
  disconnectAll();
});

process.on('SIGINT', () => {
  disconnectAll();
});

export default {
  initializeSocketIO,
  emitToReserva,
  emitBroadcast,
  getConnectionStats,
  getReservaSubscribers,
  disconnectAll,
  getIO,
};
