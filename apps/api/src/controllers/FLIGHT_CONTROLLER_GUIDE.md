# 🛫 Flight Controller - Guia Completo

Sistema completo de busca e monitoramento de voos com REST API e WebSocket para atualizações em tempo real.

---

## 📋 Índice

- [Endpoints REST](#endpoints-rest)
- [WebSocket API](#websocket-api)
- [Exemplos de Uso](#exemplos-de-uso)
- [Integração Frontend](#integração-frontend)
- [Error Handling](#error-handling)

---

## 🔌 Endpoints REST

### 1. GET /api/flights/status

Busca status atual de um voo por referência de reserva.

**Query Parameters:**
```typescript
{
  bookingReference: string;  // Required, 5-8 caracteres
  lastName: string;          // Required, min 2 caracteres
  airline?: string;          // Optional, 2 caracteres (ex: "G3", "LA")
  useCache?: boolean;        // Optional, default: true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "flightNumber": "G31234",
    "status": "SCHEDULED",
    "gate": "12",
    "terminal": "2",
    "departure": {
      "airport": "GRU",
      "airportName": "Guarulhos",
      "scheduledTime": "2025-01-15T10:30:00Z",
      "estimatedTime": "2025-01-15T10:30:00Z",
      "actualTime": null,
      "gate": "12",
      "terminal": "2"
    },
    "arrival": {
      "airport": "SDU",
      "airportName": "Santos Dumont",
      "scheduledTime": "2025-01-15T12:45:00Z",
      "estimatedTime": "2025-01-15T12:45:00Z",
      "actualTime": null,
      "gate": "5",
      "terminal": "1"
    },
    "delay": null,
    "airline": "G3",
    "airlineName": "GOL",
    "aircraft": "Boeing 737-800",
    "bookingReference": "PDCDX",
    "lastName": "DINIZ",
    "source": "CACHE",
    "lastUpdated": "2025-01-15T10:25:00Z",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
```json
// 404 - Not Found
{
  "success": false,
  "error": "Flight not found",
  "message": "Voo não encontrado. Verifique os dados da reserva.",
  "bookingReference": "INVALID",
  "lastName": "TEST"
}

// 429 - Rate Limited
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Rate limit excedido. Tente novamente em 45 segundos."
}

// 400 - Validation Error
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "code": "too_small",
      "minimum": 5,
      "path": ["bookingReference"],
      "message": "Código de reserva deve ter no mínimo 5 caracteres"
    }
  ]
}
```

---

### 2. POST /api/flights/monitor

Inicia monitoramento contínuo de um voo com polling automático.

**Request Body:**
```json
{
  "bookingReference": "PDCDX",
  "lastName": "DINIZ",
  "pollingIntervalMinutes": 15,
  "notifyOnChange": true,
  "notifyOnDelay": true,
  "notifyOnGateChange": true,
  "notifyChannels": ["email", "push", "webhook"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Monitoring started successfully",
  "data": {
    "monitoringId": "PDCDX:DINIZ",
    "bookingReference": "PDCDX",
    "lastName": "DINIZ",
    "status": "ACTIVE",
    "intervalMinutes": 15,
    "nextCheck": "2025-01-15T10:45:00Z",
    "startedAt": "2025-01-15T10:30:00Z",
    "currentStatus": {
      "flightNumber": "G31234",
      "status": "SCHEDULED",
      ...
    },
    "websocketUrl": "/ws/flights/PDCDX:DINIZ"
  }
}
```

**Error (409 Conflict):**
```json
{
  "success": false,
  "error": "Conflict",
  "message": "Este voo já está sendo monitorado. Use updateMonitoring() para alterar configurações."
}
```

---

### 3. GET /api/flights/monitor/:monitoringId

Obtém detalhes e histórico de um monitoramento ativo.

**URL Parameters:**
- `monitoringId`: string (formato: `BOOKINGREF:LASTNAME`)

**Query Parameters:**
```typescript
{
  includeHistory?: boolean;  // Default: true
  historyLimit?: number;     // Default: 20
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "monitoringId": "PDCDX:DINIZ",
    "bookingReference": "PDCDX",
    "lastName": "DINIZ",
    "status": "ACTIVE",
    "intervalMinutes": 15,
    "startedAt": "2025-01-15T10:30:00Z",
    "lastCheckAt": "2025-01-15T11:00:00Z",
    "nextCheckAt": "2025-01-15T11:15:00Z",
    "checksPerformed": 3,
    "changesDetected": 1,
    "currentStatus": {
      "flightNumber": "G31234",
      "status": "DELAYED",
      ...
    },
    "options": {
      "notifyOnChange": true,
      "notifyOnDelay": true,
      "notifyOnGateChange": true
    },
    "websocketUrl": "/ws/flights/PDCDX:DINIZ",
    "history": [
      {
        "timestamp": "2025-01-15T11:00:00Z",
        "status": {...},
        "changes": [
          "Status mudou de SCHEDULED para DELAYED",
          "Voo atrasado: 30 minutos"
        ],
        "source": "SCRAPING"
      },
      {
        "timestamp": "2025-01-15T10:45:00Z",
        "status": {...},
        "changes": [],
        "source": "CACHE"
      }
    ],
    "recentChanges": {
      "hasChanges": true,
      "changes": [
        "Status mudou de SCHEDULED para DELAYED",
        "Voo atrasado: 30 minutos"
      ],
      "previous": {...},
      "current": {...}
    }
  }
}
```

---

### 4. DELETE /api/flights/monitor/:monitoringId

Para um monitoramento ativo.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Monitoring stopped successfully",
  "monitoringId": "PDCDX:DINIZ"
}
```

---

### 5. GET /api/flights/monitor

Lista todos os monitoramentos ativos.

**Query Parameters:**
```typescript
{
  status?: 'ACTIVE' | 'PAUSED' | 'STOPPED'
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 5,
      "active": 3,
      "paused": 1,
      "stopped": 1
    },
    "monitors": [
      {
        "monitoringId": "PDCDX:DINIZ",
        "bookingReference": "PDCDX",
        "lastName": "DINIZ",
        "status": "ACTIVE",
        "intervalMinutes": 15,
        "startedAt": "2025-01-15T10:30:00Z",
        "lastCheckAt": "2025-01-15T11:00:00Z",
        "nextCheckAt": "2025-01-15T11:15:00Z",
        "checksPerformed": 3,
        "changesDetected": 1,
        "websocketUrl": "/ws/flights/PDCDX:DINIZ"
      },
      ...
    ]
  }
}
```

---

## 🔌 WebSocket API

### Conexão

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3012', {
  path: '/ws/flights',
  transports: ['websocket', 'polling'],
});
```

### Events do Cliente para Servidor

#### 1. subscribe
Inscreve-se para receber atualizações de um monitoramento.

```javascript
socket.emit('subscribe', {
  monitoringId: 'PDCDX:DINIZ'
});

socket.on('subscribed', (data) => {
  console.log('Inscrito:', data);
  // {
  //   monitoringId: 'PDCDX:DINIZ',
  //   message: 'Subscribed to monitoring PDCDX:DINIZ',
  //   timestamp: '2025-01-15T10:30:00Z'
  // }
});
```

#### 2. unsubscribe
Remove inscrição de atualizações.

```javascript
socket.emit('unsubscribe', {
  monitoringId: 'PDCDX:DINIZ'
});

socket.on('unsubscribed', (data) => {
  console.log('Desinscrito:', data);
});
```

#### 3. start-monitoring
Inicia monitoramento diretamente pelo WebSocket.

```javascript
socket.emit('start-monitoring', {
  bookingReference: 'PDCDX',
  lastName: 'DINIZ',
  pollingIntervalMinutes: 15
});

socket.on('monitoring:started', (data) => {
  console.log('Monitoramento iniciado:', data);
  // Auto-subscribed ao monitoramento
});
```

#### 4. stop-monitoring
Para monitoramento.

```javascript
socket.emit('stop-monitoring', {
  monitoringId: 'PDCDX:DINIZ'
});

socket.on('monitoring:stopped', (data) => {
  console.log('Monitoramento parado:', data);
});
```

#### 5. get-status
Obtém status atual do voo.

```javascript
socket.emit('get-status', {
  bookingReference: 'PDCDX',
  lastName: 'DINIZ'
});

socket.on('status', (data) => {
  console.log('Status:', data.status);
});
```

### Events do Servidor para Cliente

#### 1. connected
Recebido ao conectar.

```javascript
socket.on('connected', (data) => {
  console.log('Conectado:', data);
  // {
  //   message: 'Connected to Flight Monitoring WebSocket',
  //   socketId: 'abc123',
  //   timestamp: '2025-01-15T10:30:00Z'
  // }
});
```

#### 2. flight:update
Atualização periódica do status (mesmo sem mudanças).

```javascript
socket.on('flight:update', (data) => {
  console.log('Atualização:', data);
  // {
  //   monitoringId: 'PDCDX:DINIZ',
  //   status: {...},
  //   timestamp: '2025-01-15T10:45:00Z'
  // }
});
```

#### 3. flight:changed
Mudanças detectadas no voo.

```javascript
socket.on('flight:changed', (data) => {
  console.log('Mudanças detectadas!', data);
  // {
  //   monitoringId: 'PDCDX:DINIZ',
  //   previousStatus: {...},
  //   currentStatus: {...},
  //   changes: [
  //     "Status mudou de SCHEDULED para DELAYED",
  //     "Voo atrasado: 30 minutos",
  //     "Portão alterado de 12 para 15"
  //   ],
  //   timestamp: '2025-01-15T11:00:00Z'
  // }

  // Mostrar notificação
  showNotification('Voo atrasado!', data.changes.join('\n'));
});
```

#### 4. monitoring:started
Monitoramento iniciado.

```javascript
socket.on('monitoring:started', (data) => {
  console.log('Monitoramento iniciado:', data);
});
```

#### 5. monitoring:stopped
Monitoramento parado.

```javascript
socket.on('monitoring:stopped', (data) => {
  console.log('Monitoramento parado:', data.reason);
});
```

#### 6. error
Erro no monitoramento.

```javascript
socket.on('error', (data) => {
  console.error('Erro:', data.message);
});
```

---

## 💡 Exemplos de Uso

### Exemplo 1: Busca Simples

```typescript
// Frontend
async function searchFlight() {
  const response = await fetch(
    `/api/flights/status?bookingReference=PDCDX&lastName=DINIZ`,
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );

  const data = await response.json();

  if (data.success) {
    console.log('Voo encontrado:', data.data.flightNumber);
    console.log('Status:', data.data.status);
    console.log('Portão:', data.data.gate);
    console.log('Horário:', data.data.departure.scheduledTime);
  } else {
    console.error('Erro:', data.message);
  }
}
```

### Exemplo 2: Monitoramento com WebSocket

```typescript
import io from 'socket.io-client';

class FlightMonitor {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3012', {
      path: '/ws/flights',
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.socket.on('connected', (data) => {
      console.log('✅ Conectado ao WebSocket');
    });

    this.socket.on('flight:changed', (data) => {
      console.log('🔔 Mudanças detectadas!');
      this.showNotification(data);
    });

    this.socket.on('flight:update', (data) => {
      console.log('📊 Atualização recebida');
      this.updateUI(data.status);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Erro:', error.message);
    });
  }

  async startMonitoring(bookingRef: string, lastName: string) {
    // Opção 1: Iniciar via REST e depois conectar WebSocket
    const response = await fetch('/api/flights/monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingReference: bookingRef,
        lastName: lastName,
        pollingIntervalMinutes: 15,
        notifyOnChange: true,
        notifyOnDelay: true,
        notifyOnGateChange: true,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Inscrever no WebSocket
      this.socket.emit('subscribe', {
        monitoringId: data.data.monitoringId
      });
    }

    // Opção 2: Iniciar diretamente pelo WebSocket
    this.socket.emit('start-monitoring', {
      bookingReference: bookingRef,
      lastName: lastName,
      pollingIntervalMinutes: 15,
    });
  }

  stopMonitoring(monitoringId: string) {
    this.socket.emit('stop-monitoring', { monitoringId });
  }

  private showNotification(data: any) {
    // Mostrar notificação no browser
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Atualização de Voo', {
        body: data.changes.join('\n'),
        icon: '/flight-icon.png',
      });
    }

    // Atualizar UI
    this.updateUI(data.currentStatus);
  }

  private updateUI(status: any) {
    // Atualizar interface com novo status
    document.getElementById('flight-number')!.textContent = status.flight.flightNumber;
    document.getElementById('status')!.textContent = status.flight.status;
    document.getElementById('gate')!.textContent = status.flight.departure.gate || 'N/A';

    // Adicionar classe CSS baseado no status
    const statusElement = document.getElementById('status')!;
    statusElement.className = `status-${status.flight.status.toLowerCase()}`;
  }
}

// Usar
const monitor = new FlightMonitor();
monitor.startMonitoring('PDCDX', 'DINIZ');
```

### Exemplo 3: React Hook para Monitoramento

```typescript
import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

interface FlightStatus {
  flightNumber: string;
  status: string;
  gate: string;
  departure: any;
  arrival: any;
}

export function useFlightMonitoring(
  bookingReference: string,
  lastName: string
) {
  const [status, setStatus] = useState<FlightStatus | null>(null);
  const [changes, setChanges] = useState<string[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3012', {
      path: '/ws/flights',
    });

    newSocket.on('connected', () => {
      console.log('✅ Connected to WebSocket');
    });

    newSocket.on('flight:changed', (data) => {
      setStatus(data.currentStatus.flight);
      setChanges(data.changes);
    });

    newSocket.on('flight:update', (data) => {
      setStatus(data.status.flight);
    });

    newSocket.on('monitoring:started', () => {
      setIsMonitoring(true);
    });

    newSocket.on('monitoring:stopped', () => {
      setIsMonitoring(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const startMonitoring = () => {
    if (socket) {
      socket.emit('start-monitoring', {
        bookingReference,
        lastName,
        pollingIntervalMinutes: 15,
      });
    }
  };

  const stopMonitoring = () => {
    if (socket) {
      socket.emit('stop-monitoring', {
        monitoringId: `${bookingReference}:${lastName}`,
      });
    }
  };

  return {
    status,
    changes,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
  };
}

// Componente
function FlightMonitoringComponent() {
  const {
    status,
    changes,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
  } = useFlightMonitoring('PDCDX', 'DINIZ');

  return (
    <div>
      {!isMonitoring ? (
        <button onClick={startMonitoring}>Iniciar Monitoramento</button>
      ) : (
        <button onClick={stopMonitoring}>Parar Monitoramento</button>
      )}

      {status && (
        <div>
          <h2>{status.flightNumber}</h2>
          <p>Status: {status.status}</p>
          <p>Portão: {status.gate}</p>
        </div>
      )}

      {changes.length > 0 && (
        <div className="changes-alert">
          <h3>Mudanças Detectadas!</h3>
          <ul>
            {changes.map((change, i) => (
              <li key={i}>{change}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Exemplo 4: Dashboard de Monitoramento

```typescript
async function loadMonitoringDashboard() {
  // Buscar todos os monitoramentos ativos
  const response = await fetch('/api/flights/monitor');
  const data = await response.json();

  console.log(`Total: ${data.data.stats.total}`);
  console.log(`Ativos: ${data.data.stats.active}`);

  // Renderizar cada monitoramento
  data.data.monitors.forEach(monitor => {
    renderMonitorCard(monitor);
  });

  // Conectar WebSocket para cada monitoramento
  const socket = io('http://localhost:3012', {
    path: '/ws/flights',
  });

  socket.on('connected', () => {
    // Inscrever em todos os monitoramentos
    data.data.monitors.forEach(monitor => {
      socket.emit('subscribe', {
        monitoringId: monitor.monitoringId
      });
    });
  });

  // Listener de mudanças
  socket.on('flight:changed', (data) => {
    updateMonitorCard(data.monitoringId, data);
    playNotificationSound();
  });
}
```

---

## 🎨 UI/UX Best Practices

### 1. Indicadores Visuais de Status

```css
.status-scheduled { color: blue; }
.status-delayed { color: orange; }
.status-cancelled { color: red; }
.status-boarding { color: green; }
.status-departed { color: gray; }
```

### 2. Notificações de Mudanças

```typescript
function showChangeNotification(changes: string[]) {
  // Desktop notification
  if ('Notification' in window) {
    new Notification('Atualização de Voo', {
      body: changes.join('\n'),
      icon: '/flight-icon.png',
      tag: 'flight-update',
    });
  }

  // Toast notification
  toast.info(changes.join('\n'), {
    duration: 5000,
    position: 'top-right',
  });

  // Play sound
  playNotificationSound();
}
```

### 3. Loading States

```typescript
function FlightSearch() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  async function search() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/flights/status?bookingReference=PDCDX&lastName=DINIZ`
      );
      const data = await response.json();
      setStatus(data.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {loading && <LoadingSpinner />}
      {status && <FlightStatusCard status={status} />}
    </div>
  );
}
```

---

## 🔧 Configuração e Integração

### Setup do Servidor

```typescript
// server.ts
import express from 'express';
import http from 'http';
import flightRoutes from './routes/flights.routes';
import { initializeFlightWebSocket } from './websockets/flightWebSocket';

const app = express();
const httpServer = http.createServer(app);

// REST routes
app.use('/api/flights', flightRoutes);

// WebSocket
initializeFlightWebSocket(httpServer);

httpServer.listen(3012, () => {
  console.log('✅ Server running on http://localhost:3012');
  console.log('✅ WebSocket available at ws://localhost:3012/ws/flights');
});
```

---

## 📊 Monitoring & Analytics

```typescript
// Get WebSocket stats
import { getFlightWebSocketManager } from './websockets/flightWebSocket';

const wsManager = getFlightWebSocketManager();
const stats = wsManager?.getStats();

console.log(`Conexões ativas: ${stats?.connections}`);
console.log(`Monitoramentos: ${stats?.subscriptions}`);
console.log(`IDs: ${stats?.monitorings.join(', ')}`);
```

---

**Criado em:** 01/11/2025
**Versão:** 1.0.0
**Projeto:** VoaLive/ReservaSegura
