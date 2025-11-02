'use client';

import { useState, useMemo, useEffect } from 'react';
import { Flight, FlightCategoryType } from '@reservasegura/types';
import { apiService } from '../../lib/api';
import {
  Plane,
  Calendar,
  Search,
  Filter,
  Plus,
  Bell,
  Settings,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  MapPin,
  Users,
  Link as LinkIcon
} from 'lucide-react';

type ModuleType = 'flights' | 'bookings' | 'monitoring' | 'accounts' | 'notifications' | 'changes';

interface ExternalBooking {
  id: string;
  bookingCode: string;
  lastName: string;
  fullName: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureDate: string;
  seat?: string;
  checkInStatus: string;
  bookingStatus: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  read: boolean;
  createdAt: string;
  bookingCode?: string;
}

interface BookingChange {
  id: string;
  bookingCode: string;
  passengerName: string;
  changeType: string;
  oldValue: string;
  newValue: string;
  detectedAt: string;
}

interface AirlineAccount {
  id: string;
  airline: string;
  email: string;
  isActive: boolean;
  lastSyncAt: string | null;
}

export default function DashboardPage() {
  // Estado principal
  const [activeModule, setActiveModule] = useState<ModuleType>('flights');
  const [activeTab, setActiveTab] = useState<FlightCategoryType>('ALL');

  // Dados
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bookings, setBookings] = useState<ExternalBooking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [changes, setChanges] = useState<BookingChange[]>([]);
  const [accounts, setAccounts] = useState<AirlineAccount[]>([]);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAirline, setSelectedAirline] = useState<string>('');
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<ExternalBooking | null>(null);
  const [showConnectAccountModal, setShowConnectAccountModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    airline: 'GOL',
    email: '',
    password: ''
  });

  // Carregar dados
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadFlights(),
      loadBookings(),
      loadNotifications(),
      loadChanges(),
      loadAccounts()
    ]);
    setIsLoading(false);
  };

  const loadFlights = async () => {
    try {
      const response = await apiService.getAllFlights({ limit: 1000 });
      if (response.success && response.data) {
        setFlights(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar voos:', error);
    }
  };

  const loadBookings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/v2/external-booking/list?page=1&pageSize=1000`);
      const result = await response.json();
      if (result.success && result.data) {
        setBookings(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar reservas:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/booking-monitor/notifications`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setNotifications(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const loadChanges = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/booking-monitor/changes`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setChanges(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar alterações:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/booking-monitor/accounts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      if (result.success) {
        setAccounts(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  const handleConnectAccount = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/booking-monitor/connect-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newAccount)
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Conta conectada com sucesso!');
        setShowConnectAccountModal(false);
        setNewAccount({ airline: 'GOL', email: '', password: '' });
        await loadAccounts();
      } else {
        alert(`❌ Erro: ${result.error || 'Não foi possível conectar a conta'}`);
      }
    } catch (error) {
      console.error('Erro ao conectar conta:', error);
      alert('❌ Erro ao conectar conta');
    }
  };

  // Filtros
  const filteredFlights = useMemo(() => {
    let filtered = [...flights];

    switch (activeTab) {
      case 'UPCOMING':
        filtered = filtered.filter(f =>
          new Date(f.departureTime) > new Date() && f.status === 'SCHEDULED'
        );
        break;
      case 'PENDING':
        filtered = filtered.filter(f => f.status === 'SCHEDULED');
        break;
      case 'CHECKIN_OPEN':
        filtered = filtered.filter(f => f.checkInStatus === 'OPEN');
        break;
      case 'CHECKIN_CLOSED':
        filtered = filtered.filter(f => f.checkInStatus === 'CLOSED');
        break;
      case 'FLOWN':
        filtered = filtered.filter(f => f.status === 'ARRIVED');
        break;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        f.passengerFirstName?.toLowerCase().includes(term) ||
        f.passengerLastName?.toLowerCase().includes(term) ||
        f.locator?.toLowerCase().includes(term) ||
        f.origin.toLowerCase().includes(term) ||
        f.destination.toLowerCase().includes(term)
      );
    }

    if (selectedAirline) {
      filtered = filtered.filter(f => f.airline === selectedAirline);
    }

    return filtered;
  }, [flights, activeTab, searchTerm, selectedAirline]);

  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.bookingCode.toLowerCase().includes(term) ||
        b.fullName.toLowerCase().includes(term) ||
        b.flightNumber.toLowerCase().includes(term)
      );
    }

    if (selectedAirline) {
      filtered = filtered.filter(b => b.airline === selectedAirline);
    }

    return filtered;
  }, [bookings, searchTerm, selectedAirline]);

  // Counts
  const counts = useMemo(() => ({
    all: flights.length,
    upcoming: flights.filter(f => new Date(f.departureTime) > new Date() && f.status === 'SCHEDULED').length,
    pending: flights.filter(f => f.status === 'SCHEDULED').length,
    checkinOpen: flights.filter(f => f.checkInStatus === 'OPEN').length,
    checkinClosed: flights.filter(f => f.checkInStatus === 'CLOSED').length,
    flown: flights.filter(f => f.status === 'ARRIVED').length,
    bookings: bookings.length,
    notifications: notifications.filter(n => !n.read).length,
    changes: changes.length,
    accounts: accounts.filter(a => a.isActive).length
  }), [flights, bookings, notifications, changes, accounts]);

  const airlines = useMemo(() =>
    Array.from(new Set([...flights.map(f => f.airline), ...bookings.map(b => b.airline)])).sort(),
    [flights, bookings]
  );

  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'ARRIVED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCheckInColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Renderizar conteúdo baseado no módulo ativo
  const renderModuleContent = () => {
    switch (activeModule) {
      case 'flights':
        return renderFlightsModule();
      case 'bookings':
        return renderBookingsModule();
      case 'monitoring':
        return renderMonitoringModule();
      case 'accounts':
        return renderAccountsModule();
      case 'notifications':
        return renderNotificationsModule();
      case 'changes':
        return renderChangesModule();
      default:
        return null;
    }
  };

  const renderFlightsModule = () => (
    <div className="space-y-4">
      {/* Tabela de Voos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-500 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">COMPANHIA</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">STATUS</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">PASSAGEIRO</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">LOCALIZADOR</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">CHECK-IN</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">ROTA</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">PARTIDA</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFlights.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Nenhum voo encontrado
                  </td>
                </tr>
              ) : (
                filteredFlights.map((flight) => (
                  <tr key={flight.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-bold text-blue-600">{flight.airline}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(flight.status)}`}>
                        {flight.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="font-medium">{flight.passengerFirstName} {flight.passengerLastName}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold">{flight.locator}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getCheckInColor(flight.checkInStatus)}`}>
                        {flight.checkInStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{flight.origin}</span>
                        <Plane className="w-4 h-4 text-blue-500" />
                        <span className="font-mono font-bold">{flight.destination}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(flight.departureTime)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedFlight(flight)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-green-600 hover:bg-green-50 rounded" title="Editar">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-red-600 hover:bg-red-50 rounded" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderBookingsModule = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-purple-500 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">COMPANHIA</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">LOCALIZADOR</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">PASSAGEIRO</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">VOO</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">ROTA</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">PARTIDA</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">ASSENTO</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">STATUS</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Nenhuma reserva encontrada
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-bold text-purple-600">{booking.airline}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold">{booking.bookingCode}</td>
                    <td className="px-4 py-3 text-sm">{booking.fullName}</td>
                    <td className="px-4 py-3 font-mono">{booking.flightNumber}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{booking.origin}</span>
                        <Plane className="w-4 h-4 text-purple-500" />
                        <span className="font-mono">{booking.destination}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(booking.departureDate)}</td>
                    <td className="px-4 py-3 font-mono">{booking.seat || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(booking.bookingStatus)}`}>
                        {booking.bookingStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-green-600 hover:bg-green-50 rounded" title="Monitorar">
                          <Bell className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderMonitoringModule = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">📊 Status do Monitoramento</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
            <span className="font-medium">Contas Ativas</span>
            <span className="text-2xl font-bold text-blue-600">{counts.accounts}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-green-50 rounded">
            <span className="font-medium">Reservas Monitoradas</span>
            <span className="text-2xl font-bold text-green-600">{counts.bookings}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
            <span className="font-medium">Alterações Detectadas</span>
            <span className="text-2xl font-bold text-yellow-600">{counts.changes}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 rounded">
            <span className="font-medium">Notificações Não Lidas</span>
            <span className="text-2xl font-bold text-red-600">{counts.notifications}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">🔗 Contas Conectadas</h3>
        <div className="space-y-2">
          {accounts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma conta conectada</p>
          ) : (
            accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    ✈️
                  </div>
                  <div>
                    <div className="font-medium">{account.airline}</div>
                    <div className="text-sm text-gray-500">{account.email}</div>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                  account.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {account.isActive ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderAccountsModule = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">🔗 Gerenciar Contas de Companhias</h3>
        <button
          onClick={() => setShowConnectAccountModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Conectar Nova Conta
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <div key={account.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                  ✈️
                </div>
                <div>
                  <h4 className="font-bold">{account.airline}</h4>
                  <p className="text-sm text-gray-500">{account.email}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                account.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {account.isActive ? '✓ Ativa' : '✗ Inativa'}
              </span>
            </div>
            <div className="text-sm text-gray-600 mb-3">
              Última sincronização: {account.lastSyncAt ? formatDate(account.lastSyncAt) : 'Nunca'}
            </div>
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                🔄 Sincronizar
              </button>
              <button className="px-3 py-1 border border-red-500 text-red-600 text-sm rounded hover:bg-red-50">
                🗑️
              </button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            Nenhuma conta conectada. Clique em "Conectar Nova Conta" para começar.
          </div>
        )}
      </div>
    </div>
  );

  const renderNotificationsModule = () => (
    <div className="space-y-4">
      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          📭 Nenhuma notificação
        </div>
      ) : (
        notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white rounded-lg shadow p-4 ${
              !notification.read ? 'border-l-4 border-blue-500' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">
                    {notification.severity === 'CRITICAL' ? '🚨' :
                     notification.severity === 'WARNING' ? '⚠️' : 'ℹ️'}
                  </span>
                  <h4 className="font-bold">{notification.title}</h4>
                  {!notification.read && (
                    <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded">Nova</span>
                  )}
                </div>
                <p className="text-gray-700 mb-2">{notification.message}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>🕐 {formatDate(notification.createdAt)}</span>
                  {notification.bookingCode && (
                    <span className="font-mono">📝 {notification.bookingCode}</span>
                  )}
                </div>
              </div>
              <button className="text-red-600 hover:text-red-800">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderChangesModule = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-orange-500 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">RESERVA</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">PASSAGEIRO</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">TIPO</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">ANTERIOR</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">NOVO</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">DETECTADO EM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {changes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma alteração registrada
                </td>
              </tr>
            ) : (
              changes.map((change) => (
                <tr key={change.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold">{change.bookingCode}</td>
                  <td className="px-4 py-3">{change.passengerName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                      {change.changeType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 rounded font-mono text-sm">
                      {change.oldValue}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-green-100 rounded font-mono text-sm font-bold">
                      {change.newValue}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDate(change.detectedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-lg">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Plane className="w-8 h-8 text-blue-500" />
              <h1 className="text-2xl font-bold">VoaLive Dashboard</h1>
            </div>
            <button
              onClick={() => loadAllData()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
            >
              🔄 Atualizar
            </button>
          </div>

          {/* Módulos - Navegação Principal */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveModule('flights')}
              className={`px-6 py-2 rounded-t-lg font-medium whitespace-nowrap transition-colors ${
                activeModule === 'flights'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              ✈️ Voos ({counts.all})
            </button>
            <button
              onClick={() => setActiveModule('bookings')}
              className={`px-6 py-2 rounded-t-lg font-medium whitespace-nowrap transition-colors ${
                activeModule === 'bookings'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              📋 Reservas ({counts.bookings})
            </button>
            <button
              onClick={() => setActiveModule('monitoring')}
              className={`px-6 py-2 rounded-t-lg font-medium whitespace-nowrap transition-colors ${
                activeModule === 'monitoring'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              📊 Monitoramento
            </button>
            <button
              onClick={() => setActiveModule('accounts')}
              className={`px-6 py-2 rounded-t-lg font-medium whitespace-nowrap transition-colors ${
                activeModule === 'accounts'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              🔗 Contas ({counts.accounts})
            </button>
            <button
              onClick={() => setActiveModule('notifications')}
              className={`px-6 py-2 rounded-t-lg font-medium whitespace-nowrap transition-colors relative ${
                activeModule === 'notifications'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              🔔 Notificações
              {counts.notifications > 0 && (
                <span className="absolute -top-1 -right-1 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                  {counts.notifications}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveModule('changes')}
              className={`px-6 py-2 rounded-t-lg font-medium whitespace-nowrap transition-colors ${
                activeModule === 'changes'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              📊 Alterações ({counts.changes})
            </button>
          </div>

          {/* Sub-abas para Voos */}
          {activeModule === 'flights' && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  activeTab === 'ALL' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Todos {counts.all}
              </button>
              <button
                onClick={() => setActiveTab('UPCOMING')}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  activeTab === 'UPCOMING' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Próximos {counts.upcoming}
              </button>
              <button
                onClick={() => setActiveTab('PENDING')}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  activeTab === 'PENDING' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Pendentes {counts.pending}
              </button>
              <button
                onClick={() => setActiveTab('CHECKIN_OPEN')}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  activeTab === 'CHECKIN_OPEN' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Check-in Aberto {counts.checkinOpen}
              </button>
              <button
                onClick={() => setActiveTab('CHECKIN_CLOSED')}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  activeTab === 'CHECKIN_CLOSED' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Check-in Fechado {counts.checkinClosed}
              </button>
              <button
                onClick={() => setActiveTab('FLOWN')}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  activeTab === 'FLOWN' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Voados {counts.flown}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      {(activeModule === 'flights' || activeModule === 'bookings') && (
        <div className="bg-white border-b px-6 py-4">
          <div className="container mx-auto">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Pesquisar por passageiro, localizador, rota..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="w-64">
                <select
                  value={selectedAirline}
                  onChange={(e) => setSelectedAirline(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas as Companhias</option>
                  {airlines.map(airline => (
                    <option key={airline} value={airline}>{airline}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedAirline('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo do Módulo */}
      <div className="container mx-auto px-6 py-6">
        {renderModuleContent()}
      </div>

      {/* Modal: Conectar Conta de Companhia */}
      {showConnectAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold">🔗 Conectar Conta de Companhia</h3>
              <button
                onClick={() => setShowConnectAccountModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Companhia Aérea</label>
                <select
                  value={newAccount.airline}
                  onChange={(e) => setNewAccount({ ...newAccount, airline: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="GOL">GOL Linhas Aéreas</option>
                  <option value="LATAM">LATAM Airlines</option>
                  <option value="AZUL">Azul Linhas Aéreas</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email / CPF</label>
                <input
                  type="text"
                  value={newAccount.email}
                  onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                  placeholder="Digite seu email ou CPF"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Senha</label>
                <input
                  type="password"
                  value={newAccount.password}
                  onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                  placeholder="Digite sua senha"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Segurança:</strong> Suas credenciais serão armazenadas de forma criptografada
                  e usadas apenas para monitorar suas reservas automaticamente.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setShowConnectAccountModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConnectAccount}
                disabled={!newAccount.email || !newAccount.password}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Conectar Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão Flutuante */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
