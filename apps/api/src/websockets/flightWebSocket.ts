/**
 * Flight WebSocket Handler
 * WebSocket server para streaming de atualizações de voo em tempo real
 *
 * Endpoint: /ws/flights/:monitoringId
 *
 * Events emitted to client:
 * - connected: Conexão estabelecida
 * - flight:update: Atualização de status do voo
 * - flight:changed: Mudanças detectadas no voo
 * - monitoring:started: Monitoramento iniciado
 * - monitoring:stopped: Monitoramento parado
 * - error: Erro no monitoramento
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { getFlightMonitoringService } from '../services/flightMonitoring';

// ============================================================================
// TYPES
// ============================================================================

interface ClientSubscription {
  monitoringId: string;
  bookingReference: string;
  lastName: string;
  socket: Socket;
}

// ============================================================================
// WEBSOCKET MANAGER
// ============================================================================

export class FlightWebSocketManager {
  private io: SocketIOServer;
  private subscriptions: Map<string, Set<Socket>>;
  private eventListenersInitialized: boolean;

  constructor(httpServer: HttpServer) {
    // Initialize Socket.IO
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
      path: '/ws/flights',
      transports: ['websocket', 'polling'],
    });

    this.subscriptions = new Map();
    this.eventListenersInitialized = false;

    this.setupConnectionHandler();
    this.setupFlightMonitoringEvents();
  }

  /**
   * Setup connection handler
   */
  private setupConnectionHandler(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 [WebSocket] Client connected: ${socket.id}`);

      // Handle subscription to monitoring
      socket.on('subscribe', (data: { monitoringId: string }) => {
        this.handleSubscribe(socket, data);
      });

      // Handle unsubscribe
      socket.on('unsubscribe', (data: { monitoringId: string }) => {
        this.handleUnsubscribe(socket, data);
      });

      // Handle start monitoring from WebSocket
      socket.on('start-monitoring', async (data: {
        bookingReference: string;
        lastName: string;
        pollingIntervalMinutes?: number;
      }) => {
        await this.handleStartMonitoring(socket, data);
      });

      // Handle stop monitoring
      socket.on('stop-monitoring', async (data: { monitoringId: string }) => {
        await this.handleStopMonitoring(socket, data);
      });

      // Handle get current status
      socket.on('get-status', async (data: {
        bookingReference: string;
        lastName: string;
      }) => {
        await this.handleGetStatus(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to Flight Monitoring WebSocket',
        socketId: socket.id,
        timestamp: new Date(),
      });
    });
  }

  /**
   * Setup flight monitoring event listeners
   */
  private setupFlightMonitoringEvents(): void {
    if (this.eventListenersInitialized) return;

    const service = getFlightMonitoringService();

    // Listen for flight changes
    service.on('flight:changed', (data: any) => {
      console.log(`📢 [WebSocket] Flight changed event: ${data.job.id}`);
      this.broadcastToMonitoring(data.job.id, 'flight:changed', {
        monitoringId: data.job.id,
        previousStatus: data.previousStatus,
        currentStatus: data.currentStatus,
        changes: data.changes,
        timestamp: new Date(),
      });
    });

    // Listen for flight updates (even without changes)
    service.on('flight:updated', (data: any) => {
      console.log(`📢 [WebSocket] Flight updated event: ${data.monitoringId}`);
      this.broadcastToMonitoring(data.monitoringId, 'flight:update', {
        monitoringId: data.monitoringId,
        status: data.status,
        timestamp: new Date(),
      });
    });

    // Listen for monitoring started
    service.on('monitoring:started', (data: any) => {
      console.log(`📢 [WebSocket] Monitoring started: ${data.monitoringId}`);
      this.broadcastToMonitoring(data.monitoringId, 'monitoring:started', {
        monitoringId: data.monitoringId,
        intervalMinutes: data.intervalMinutes,
        nextCheck: data.nextCheck,
        timestamp: new Date(),
      });
    });

    // Listen for monitoring stopped
    service.on('monitoring:stopped', (data: any) => {
      console.log(`📢 [WebSocket] Monitoring stopped: ${data.monitoringId}`);
      this.broadcastToMonitoring(data.monitoringId, 'monitoring:stopped', {
        monitoringId: data.monitoringId,
        reason: data.reason,
        timestamp: new Date(),
      });
    });

    // Listen for errors
    service.on('monitoring:error', (data: any) => {
      console.error(`❌ [WebSocket] Monitoring error: ${data.monitoringId}`, data.error);
      this.broadcastToMonitoring(data.monitoringId, 'error', {
        monitoringId: data.monitoringId,
        error: data.error,
        timestamp: new Date(),
      });
    });

    this.eventListenersInitialized = true;
  }

  /**
   * Handle client subscription to monitoring
   */
  private handleSubscribe(socket: Socket, data: { monitoringId: string }): void {
    const { monitoringId } = data;

    console.log(`📥 [WebSocket] Client ${socket.id} subscribing to ${monitoringId}`);

    // Add to subscriptions
    if (!this.subscriptions.has(monitoringId)) {
      this.subscriptions.set(monitoringId, new Set());
    }
    this.subscriptions.get(monitoringId)!.add(socket);

    // Join room
    socket.join(monitoringId);

    // Send confirmation
    socket.emit('subscribed', {
      monitoringId,
      message: `Subscribed to monitoring ${monitoringId}`,
      timestamp: new Date(),
    });

    // Send current status
    this.sendCurrentStatus(socket, monitoringId);
  }

  /**
   * Handle client unsubscribe
   */
  private handleUnsubscribe(socket: Socket, data: { monitoringId: string }): void {
    const { monitoringId } = data;

    console.log(`📤 [WebSocket] Client ${socket.id} unsubscribing from ${monitoringId}`);

    // Remove from subscriptions
    const sockets = this.subscriptions.get(monitoringId);
    if (sockets) {
      sockets.delete(socket);
      if (sockets.size === 0) {
        this.subscriptions.delete(monitoringId);
      }
    }

    // Leave room
    socket.leave(monitoringId);

    // Send confirmation
    socket.emit('unsubscribed', {
      monitoringId,
      message: `Unsubscribed from monitoring ${monitoringId}`,
      timestamp: new Date(),
    });
  }

  /**
   * Handle start monitoring from WebSocket
   */
  private async handleStartMonitoring(
    socket: Socket,
    data: {
      bookingReference: string;
      lastName: string;
      pollingIntervalMinutes?: number;
    }
  ): Promise<void> {
    try {
      console.log(`🚀 [WebSocket] Starting monitoring from WebSocket: ${data.bookingReference}`);

      const service = getFlightMonitoringService();

      const job = await service.monitorFlightContinuous(
        data.bookingReference,
        data.lastName,
        {
          intervalMinutes: data.pollingIntervalMinutes || 15,
          notifyOnChange: true,
          notifyOnDelay: true,
          notifyOnGateChange: true,
        }
      );

      // Auto-subscribe client to this monitoring
      this.handleSubscribe(socket, { monitoringId: job.id });

      // Send success
      socket.emit('monitoring:started', {
        monitoringId: job.id,
        bookingReference: job.bookingReference,
        lastName: job.lastName,
        intervalMinutes: job.intervalMinutes,
        nextCheck: job.nextCheckAt,
        currentStatus: job.currentFlightStatus,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error('❌ [WebSocket] Error starting monitoring:', error);
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to start monitoring',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle stop monitoring
   */
  private async handleStopMonitoring(
    socket: Socket,
    data: { monitoringId: string }
  ): Promise<void> {
    try {
      console.log(`⏹️ [WebSocket] Stopping monitoring from WebSocket: ${data.monitoringId}`);

      const [bookingReference, lastName] = data.monitoringId.split(':');

      const service = getFlightMonitoringService();
      await service.stopMonitoring(bookingReference, lastName);

      // Unsubscribe client
      this.handleUnsubscribe(socket, { monitoringId: data.monitoringId });

      // Send success
      socket.emit('monitoring:stopped', {
        monitoringId: data.monitoringId,
        reason: 'Stopped by client',
        timestamp: new Date(),
      });

    } catch (error) {
      console.error('❌ [WebSocket] Error stopping monitoring:', error);
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to stop monitoring',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle get current status
   */
  private async handleGetStatus(
    socket: Socket,
    data: { bookingReference: string; lastName: string }
  ): Promise<void> {
    try {
      console.log(`🔍 [WebSocket] Getting status: ${data.bookingReference}`);

      const service = getFlightMonitoringService();
      const status = await service.getFlightStatusByReservation(
        data.bookingReference,
        data.lastName
      );

      socket.emit('status', {
        bookingReference: data.bookingReference,
        lastName: data.lastName,
        status,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error('❌ [WebSocket] Error getting status:', error);
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to get status',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: Socket): void {
    console.log(`🔌 [WebSocket] Client disconnected: ${socket.id}`);

    // Remove from all subscriptions
    for (const [monitoringId, sockets] of this.subscriptions.entries()) {
      sockets.delete(socket);
      if (sockets.size === 0) {
        this.subscriptions.delete(monitoringId);
      }
    }
  }

  /**
   * Send current status to newly subscribed client
   */
  private async sendCurrentStatus(socket: Socket, monitoringId: string): Promise<void> {
    try {
      const [bookingReference, lastName] = monitoringId.split(':');

      const service = getFlightMonitoringService();

      // Get monitoring job
      const job = await service.getMonitoringStatus(bookingReference, lastName);

      if (job && job.currentFlightStatus) {
        socket.emit('status', {
          monitoringId,
          status: job.currentFlightStatus,
          job: {
            status: job.status,
            checksPerformed: job.checksPerformed,
            changesDetected: job.changesDetected,
            lastCheckAt: job.lastCheckAt,
            nextCheckAt: job.nextCheckAt,
          },
          timestamp: new Date(),
        });
      }

    } catch (error) {
      console.error('❌ [WebSocket] Error sending current status:', error);
    }
  }

  /**
   * Broadcast message to all clients subscribed to a monitoring
   */
  private broadcastToMonitoring(monitoringId: string, event: string, data: any): void {
    const sockets = this.subscriptions.get(monitoringId);

    if (!sockets || sockets.size === 0) {
      console.log(`📭 [WebSocket] No subscribers for ${monitoringId}`);
      return;
    }

    console.log(`📢 [WebSocket] Broadcasting ${event} to ${sockets.size} clients for ${monitoringId}`);

    // Broadcast to room
    this.io.to(monitoringId).emit(event, data);
  }

  /**
   * Get WebSocket server instance
   */
  getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Get active subscriptions count
   */
  getSubscriptionsCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get active connections count
   */
  getConnectionsCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get stats
   */
  getStats(): {
    connections: number;
    subscriptions: number;
    monitorings: string[];
  } {
    return {
      connections: this.getConnectionsCount(),
      subscriptions: this.getSubscriptionsCount(),
      monitorings: Array.from(this.subscriptions.keys()),
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let wsManagerInstance: FlightWebSocketManager | null = null;

/**
 * Initialize WebSocket manager
 */
export function initializeFlightWebSocket(httpServer: HttpServer): FlightWebSocketManager {
  if (!wsManagerInstance) {
    wsManagerInstance = new FlightWebSocketManager(httpServer);
    console.log('✅ [WebSocket] Flight WebSocket initialized');
  }
  return wsManagerInstance;
}

/**
 * Get WebSocket manager instance
 */
export function getFlightWebSocketManager(): FlightWebSocketManager | null {
  return wsManagerInstance;
}

export default FlightWebSocketManager;
