/**
 * Flight API - Frontend Integration Examples
 * Exemplos práticos de integração com React/Next.js
 */

import React, { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

// =============================================================================
// TYPES
// =============================================================================

interface FlightStatus {
  flightNumber: string;
  status: 'SCHEDULED' | 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'DEPARTED' | 'ARRIVED';
  gate: string;
  terminal: string;
  departure: {
    airport: string;
    scheduledTime: string;
    estimatedTime: string;
    actualTime?: string;
    gate: string;
    terminal: string;
  };
  arrival: {
    airport: string;
    scheduledTime: string;
    estimatedTime: string;
    actualTime?: string;
    gate: string;
    terminal: string;
  };
  delay?: {
    minutes: number;
    reason: string;
  };
  airline: string;
  aircraft?: string;
}

interface MonitoringJob {
  monitoringId: string;
  bookingReference: string;
  lastName: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  intervalMinutes: number;
  nextCheck: string;
  startedAt: string;
  currentStatus: FlightStatus;
  websocketUrl: string;
}

interface FlightChange {
  timestamp: string;
  changes: string[];
  currentStatus: FlightStatus;
  previousStatus: FlightStatus;
}

// =============================================================================
// EXEMPLO 1: Hook para buscar status de voo
// =============================================================================

export function useFlightStatus(bookingReference: string, lastName: string) {
  const [status, setStatus] = useState<FlightStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        bookingReference,
        lastName,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/flights/status?${params}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Voo não encontrado. Verifique os dados da reserva.');
        }
        if (response.status === 429) {
          throw new Error('Muitas requisições. Aguarde um momento.');
        }
        throw new Error('Erro ao buscar status do voo');
      }

      const data = await response.json();
      setStatus(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingReference && lastName) {
      fetchStatus();
    }
  }, [bookingReference, lastName]);

  return { status, loading, error, refetch: fetchStatus };
}

// Exemplo de uso:
export function FlightStatusCard({
  bookingReference,
  lastName,
}: {
  bookingReference: string;
  lastName: string;
}) {
  const { status, loading, error, refetch } = useFlightStatus(
    bookingReference,
    lastName
  );

  if (loading) return <div>Carregando...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!status) return null;

  return (
    <div className="flight-status-card">
      <h2>Voo {status.flightNumber}</h2>

      <div className="status-badge" data-status={status.status}>
        {status.status}
      </div>

      <div className="flight-info">
        <div className="departure">
          <h3>Partida</h3>
          <p>Aeroporto: {status.departure.airport}</p>
          <p>Horário: {new Date(status.departure.scheduledTime).toLocaleString()}</p>
          <p>Portão: {status.departure.gate}</p>
          <p>Terminal: {status.departure.terminal}</p>
        </div>

        <div className="arrival">
          <h3>Chegada</h3>
          <p>Aeroporto: {status.arrival.airport}</p>
          <p>Horário: {new Date(status.arrival.scheduledTime).toLocaleString()}</p>
          <p>Portão: {status.arrival.gate}</p>
          <p>Terminal: {status.arrival.terminal}</p>
        </div>
      </div>

      {status.delay && (
        <div className="delay-warning">
          <strong>Atraso de {status.delay.minutes} minutos</strong>
          <p>{status.delay.reason}</p>
        </div>
      )}

      <button onClick={refetch}>Atualizar Status</button>
    </div>
  );
}

// =============================================================================
// EXEMPLO 2: Hook para monitoramento de voo
// =============================================================================

export function useFlightMonitoring() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startMonitoring = async (
    bookingReference: string,
    lastName: string,
    options?: {
      pollingIntervalMinutes?: number;
      notifyChannels?: Array<'email' | 'sms' | 'push' | 'webhook'>;
    }
  ): Promise<MonitoringJob | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/flights/monitor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingReference,
            lastName,
            pollingIntervalMinutes: options?.pollingIntervalMinutes || 15,
            notifyOnChange: true,
            notifyOnDelay: true,
            notifyOnGateChange: true,
            notifyChannels: options?.notifyChannels || ['email', 'push'],
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('Este voo já está sendo monitorado');
        }
        throw new Error('Erro ao iniciar monitoramento');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const stopMonitoring = async (monitoringId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/flights/monitor/${monitoringId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Monitoramento não encontrado');
        }
        throw new Error('Erro ao parar monitoramento');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getMonitoringDetails = async (
    monitoringId: string
  ): Promise<any | null> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/flights/monitor/${monitoringId}`
      );

      if (!response.ok) {
        throw new Error('Erro ao obter detalhes');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return null;
    }
  };

  return {
    startMonitoring,
    stopMonitoring,
    getMonitoringDetails,
    loading,
    error,
  };
}

// Exemplo de uso:
export function FlightMonitoringControl({
  bookingReference,
  lastName,
}: {
  bookingReference: string;
  lastName: string;
}) {
  const { startMonitoring, stopMonitoring, loading, error } =
    useFlightMonitoring();
  const [monitoringId, setMonitoringId] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const handleStart = async () => {
    const job = await startMonitoring(bookingReference, lastName);

    if (job) {
      setMonitoringId(job.monitoringId);
      setIsMonitoring(true);
      alert(`Monitoramento iniciado! ID: ${job.monitoringId}`);
    }
  };

  const handleStop = async () => {
    if (!monitoringId) return;

    const success = await stopMonitoring(monitoringId);

    if (success) {
      setIsMonitoring(false);
      setMonitoringId(null);
      alert('Monitoramento parado com sucesso!');
    }
  };

  return (
    <div className="monitoring-control">
      <h3>Monitoramento de Voo</h3>

      {error && <div className="error">{error}</div>}

      {!isMonitoring ? (
        <button onClick={handleStart} disabled={loading}>
          {loading ? 'Iniciando...' : 'Iniciar Monitoramento'}
        </button>
      ) : (
        <div>
          <p className="monitoring-active">
            ✅ Monitoramento ativo
            <br />
            ID: {monitoringId}
          </p>
          <button onClick={handleStop} disabled={loading}>
            {loading ? 'Parando...' : 'Parar Monitoramento'}
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXEMPLO 3: Hook WebSocket para atualizações em tempo real
// =============================================================================

export function useFlightWebSocket(monitoringId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<FlightStatus | null>(null);
  const [changes, setChanges] = useState<string[]>([]);

  useEffect(() => {
    // Conectar ao WebSocket
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL!, {
      path: '/ws/flights',
      transports: ['websocket', 'polling'],
    });

    // Event: Conexão estabelecida
    newSocket.on('connected', (data) => {
      console.log('✅ Connected to WebSocket:', data.message);
      setConnected(true);

      // Auto-subscribe ao monitoramento
      newSocket.emit('subscribe', { monitoringId });
    });

    // Event: Inscrição confirmada
    newSocket.on('subscribed', (data) => {
      console.log('✅ Subscribed to:', data.monitoringId);
    });

    // Event: Status atual
    newSocket.on('status', (data) => {
      console.log('📊 Current status received');
      setCurrentStatus(data.status);
    });

    // Event: Atualização (sem mudanças)
    newSocket.on('flight:update', (data) => {
      console.log('🔄 Flight updated');
      setCurrentStatus(data.status);
    });

    // Event: Mudanças detectadas
    newSocket.on('flight:changed', (data: FlightChange) => {
      console.log('🔔 Changes detected:', data.changes);
      setCurrentStatus(data.currentStatus);
      setChanges((prev) => [...data.changes, ...prev]);

      // Mostrar notificação
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Mudança no Voo', {
          body: data.changes.join('\n'),
          icon: '/flight-icon.png',
        });
      }
    });

    // Event: Monitoramento iniciado
    newSocket.on('monitoring:started', (data) => {
      console.log('🚀 Monitoring started:', data.monitoringId);
    });

    // Event: Monitoramento parado
    newSocket.on('monitoring:stopped', (data) => {
      console.log('⏹️ Monitoring stopped:', data.reason);
    });

    // Event: Erro
    newSocket.on('error', (data) => {
      console.error('❌ WebSocket error:', data.message);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.emit('unsubscribe', { monitoringId });
      newSocket.disconnect();
    };
  }, [monitoringId]);

  return {
    socket,
    connected,
    currentStatus,
    changes,
  };
}

// Exemplo de uso:
export function FlightLiveMonitor({ monitoringId }: { monitoringId: string }) {
  const { connected, currentStatus, changes } = useFlightWebSocket(monitoringId);

  // Solicitar permissão para notificações
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (!connected) {
    return (
      <div className="connecting">
        <div className="spinner"></div>
        <p>Conectando ao servidor...</p>
      </div>
    );
  }

  return (
    <div className="flight-live-monitor">
      <div className="connection-status">
        <span className="status-dot connected"></span>
        Monitoramento em tempo real
      </div>

      {currentStatus && (
        <div className="current-status">
          <h3>Status Atual</h3>
          <div className="flight-header">
            <span className="flight-number">{currentStatus.flightNumber}</span>
            <span className={`status-badge ${currentStatus.status.toLowerCase()}`}>
              {currentStatus.status}
            </span>
          </div>

          <div className="flight-details">
            <div className="detail-group">
              <label>Portão:</label>
              <span>{currentStatus.gate}</span>
            </div>
            <div className="detail-group">
              <label>Terminal:</label>
              <span>{currentStatus.terminal}</span>
            </div>
            {currentStatus.delay && (
              <div className="detail-group delay">
                <label>Atraso:</label>
                <span>{currentStatus.delay.minutes} minutos</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="changes-timeline">
        <h3>Histórico de Mudanças</h3>
        {changes.length === 0 ? (
          <p className="no-changes">Nenhuma mudança detectada ainda</p>
        ) : (
          <ul className="changes-list">
            {changes.map((change, idx) => (
              <li key={idx} className="change-item">
                <span className="change-icon">🔔</span>
                <span className="change-text">{change}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// EXEMPLO 4: Componente completo de busca e monitoramento
// =============================================================================

export function FlightSearchAndMonitor() {
  const [bookingReference, setBookingReference] = useState('');
  const [lastName, setLastName] = useState('');
  const [step, setStep] = useState<'search' | 'results' | 'monitoring'>('search');
  const [monitoringId, setMonitoringId] = useState<string | null>(null);

  const { status, loading: statusLoading, error: statusError } = useFlightStatus(
    step === 'results' ? bookingReference : '',
    step === 'results' ? lastName : ''
  );

  const { startMonitoring, loading: monitoringLoading } = useFlightMonitoring();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('results');
  };

  const handleStartMonitoring = async () => {
    const job = await startMonitoring(bookingReference, lastName);

    if (job) {
      setMonitoringId(job.monitoringId);
      setStep('monitoring');
    }
  };

  const handleBackToSearch = () => {
    setBookingReference('');
    setLastName('');
    setStep('search');
    setMonitoringId(null);
  };

  return (
    <div className="flight-search-monitor">
      {step === 'search' && (
        <div className="search-form">
          <h2>Buscar Voo</h2>
          <form onSubmit={handleSearch}>
            <div className="form-group">
              <label>Código da Reserva</label>
              <input
                type="text"
                value={bookingReference}
                onChange={(e) => setBookingReference(e.target.value.toUpperCase())}
                placeholder="Ex: PDCDX"
                minLength={5}
                maxLength={8}
                required
              />
            </div>

            <div className="form-group">
              <label>Sobrenome do Passageiro</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value.toUpperCase())}
                placeholder="Ex: DINIZ"
                minLength={2}
                required
              />
            </div>

            <button type="submit" className="btn-primary">
              Buscar Voo
            </button>
          </form>
        </div>
      )}

      {step === 'results' && (
        <div className="search-results">
          {statusLoading && <div>Buscando voo...</div>}
          {statusError && <div className="error">{statusError}</div>}

          {status && (
            <>
              <FlightStatusCard
                bookingReference={bookingReference}
                lastName={lastName}
              />

              <div className="actions">
                <button
                  onClick={handleStartMonitoring}
                  disabled={monitoringLoading}
                  className="btn-primary"
                >
                  {monitoringLoading
                    ? 'Iniciando...'
                    : 'Iniciar Monitoramento em Tempo Real'}
                </button>

                <button onClick={handleBackToSearch} className="btn-secondary">
                  Nova Busca
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 'monitoring' && monitoringId && (
        <div className="monitoring-view">
          <button onClick={handleBackToSearch} className="btn-back">
            ← Voltar
          </button>

          <FlightLiveMonitor monitoringId={monitoringId} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXEMPLO 5: Dashboard de monitoramentos ativos
// =============================================================================

export function MonitoringDashboard() {
  const [monitors, setMonitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveMonitors();

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchActiveMonitors, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveMonitors = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/flights/monitor`
      );
      const data = await response.json();
      setMonitors(data.data.monitors);
    } catch (error) {
      console.error('Error fetching monitors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="monitoring-dashboard">
      <h2>Monitoramentos Ativos</h2>

      <div className="stats">
        <div className="stat-card">
          <label>Total</label>
          <value>{monitors.length}</value>
        </div>
        <div className="stat-card">
          <label>Ativos</label>
          <value>
            {monitors.filter((m) => m.status === 'ACTIVE').length}
          </value>
        </div>
      </div>

      <div className="monitors-grid">
        {monitors.map((monitor) => (
          <div key={monitor.monitoringId} className="monitor-card">
            <h3>{monitor.monitoringId}</h3>
            <div className="monitor-info">
              <p>
                <strong>Status:</strong> {monitor.status}
              </p>
              <p>
                <strong>Verificações:</strong> {monitor.checksPerformed}
              </p>
              <p>
                <strong>Mudanças:</strong> {monitor.changesDetected}
              </p>
              <p>
                <strong>Próxima verificação:</strong>{' '}
                {new Date(monitor.nextCheckAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FlightSearchAndMonitor;
