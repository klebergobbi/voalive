'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@reservasegura/ui';
import { Calendar, Plus, Search, Filter, Eye, X, DollarSign, Users } from 'lucide-react';
import { apiService } from '../../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Passenger {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  dateOfBirth: string;
  nationality?: string;
}

interface Booking {
  id: string;
  bookingCode: string;
  flightId: string;
  userId: string;
  passengers: string; // JSON string
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  flight?: {
    flightNumber: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    airline: string;
    status: string;
  };
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
  transaction?: any;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadBookings();
    loadStats();
  }, []);

  const loadBookings = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAllBookings({ limit: 100 });

      if (response.success && response.data) {
        setBookings(response.data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiService.getBookingStats();

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return;

    try {
      const response = await apiService.cancelBooking(id);

      if (response.success) {
        await loadBookings();
        await loadStats();
        alert('Reserva cancelada com sucesso!');
      }
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      alert(error.message || 'Erro ao cancelar reserva');
    }
  };

  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(b => b.status === selectedStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.bookingCode.toLowerCase().includes(term) ||
        b.flight?.flightNumber.toLowerCase().includes(term) ||
        b.flight?.origin.toLowerCase().includes(term) ||
        b.flight?.destination.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [bookings, selectedStatus, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const parsePassengers = (passengersJson: string): Passenger[] => {
    try {
      return JSON.parse(passengersJson);
    } catch {
      return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-lg">Carregando reservas...</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">Reservas</h1>
          <p className="text-muted-foreground">Gerencie todas as reservas de voos</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Total de Reservas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Todas as reservas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Confirmadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.byStatus?.confirmed || 0}</div>
              <p className="text-xs text-muted-foreground">Pagas e confirmadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats?.byStatus?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <X className="h-4 w-4" />
                Canceladas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.byStatus?.cancelled || 0}</div>
              <p className="text-xs text-muted-foreground">Canceladas pelo usuário</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, voo, origem ou destino..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedStatus(null)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedStatus === null
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setSelectedStatus('CONFIRMED')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedStatus === 'CONFIRMED'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Confirmadas
              </button>
              <button
                onClick={() => setSelectedStatus('PENDING')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedStatus === 'PENDING'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setSelectedStatus('CANCELLED')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedStatus === 'CANCELLED'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Canceladas
              </button>
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <Card>
          <CardContent className="p-0">
            {filteredBookings.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma reserva encontrada</p>
                  <p className="text-sm">As reservas aparecerão aqui quando forem criadas</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-700">Código</th>
                      <th className="text-left p-4 font-medium text-gray-700">Voo</th>
                      <th className="text-left p-4 font-medium text-gray-700">Rota</th>
                      <th className="text-left p-4 font-medium text-gray-700">Passageiros</th>
                      <th className="text-left p-4 font-medium text-gray-700">Valor</th>
                      <th className="text-left p-4 font-medium text-gray-700">Status</th>
                      <th className="text-left p-4 font-medium text-gray-700">Pagamento</th>
                      <th className="text-left p-4 font-medium text-gray-700">Data</th>
                      <th className="text-right p-4 font-medium text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => {
                      const passengers = parsePassengers(booking.passengers);
                      return (
                        <tr key={booking.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-mono text-sm">{booking.bookingCode}</td>
                          <td className="p-4 font-semibold">{booking.flight?.flightNumber}</td>
                          <td className="p-4">
                            <div className="text-sm">
                              {booking.flight?.origin} → {booking.flight?.destination}
                            </div>
                            <div className="text-xs text-gray-500">{booking.flight?.airline}</div>
                          </td>
                          <td className="p-4">{passengers.length}</td>
                          <td className="p-4 font-semibold">
                            R$ {booking.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
                              {booking.paymentStatus}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {format(new Date(booking.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowDetailsModal(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Ver detalhes"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {booking.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => handleCancelBooking(booking.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Cancelar reserva"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">Detalhes da Reserva</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Booking Info */}
              <div>
                <h3 className="font-semibold mb-3">Informações da Reserva</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Código:</span>
                    <p className="font-mono font-semibold">{selectedBooking.bookingCode}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBooking.status)}`}>
                        {selectedBooking.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Valor Total:</span>
                    <p className="font-semibold text-lg">
                      R$ {selectedBooking.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Pagamento:</span>
                    <p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedBooking.paymentStatus)}`}>
                        {selectedBooking.paymentStatus}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Flight Info */}
              {selectedBooking.flight && (
                <div>
                  <h3 className="font-semibold mb-3">Informações do Voo</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Voo:</span>
                      <p className="font-semibold">{selectedBooking.flight.flightNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Companhia:</span>
                      <p>{selectedBooking.flight.airline}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Origem:</span>
                      <p>{selectedBooking.flight.origin}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Destino:</span>
                      <p>{selectedBooking.flight.destination}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Partida:</span>
                      <p>{format(new Date(selectedBooking.flight.departureTime), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Chegada:</span>
                      <p>{format(new Date(selectedBooking.flight.arrivalTime), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Passengers */}
              <div>
                <h3 className="font-semibold mb-3">Passageiros ({parsePassengers(selectedBooking.passengers).length})</h3>
                <div className="space-y-3">
                  {parsePassengers(selectedBooking.passengers).map((passenger, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium">
                        {passenger.firstName} {passenger.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {passenger.documentType}: {passenger.documentNumber}
                      </p>
                      {passenger.dateOfBirth && (
                        <p className="text-sm text-gray-600">
                          Data de Nascimento: {format(new Date(passenger.dateOfBirth), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
              {selectedBooking.status !== 'CANCELLED' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleCancelBooking(selectedBooking.id);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Cancelar Reserva
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
