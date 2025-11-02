'use client';

import { useState, useEffect } from 'react';
import { Button } from '@reservasegura/ui';
import { BookingRegisterModal } from '../../components/dashboard/booking-register-modal';
import { BookingSearchModal } from '../../components/dashboard/booking-search-modal';
import Link from 'next/link';

interface ExternalBooking {
  id: string;
  bookingCode: string;
  lastName: string;
  firstName?: string;
  fullName: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureDate: string;
  arrivalDate?: string;
  seat?: string;
  class?: string;
  gate?: string;
  terminal?: string;
  checkInStatus: string;
  bookingStatus: string;
  email?: string;
  phone?: string;
  document?: string;
  source: string;
  purchaseDate?: string;
  totalAmount?: number;
  lastUpdated: string;
  createdAt: string;
}

export default function ReservasPage() {
  const [bookings, setBookings] = useState<ExternalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<ExternalBooking | null>(null);

  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAirline, setSelectedAirline] = useState('');

  useEffect(() => {
    loadBookings();
  }, [page, pageSize]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError('');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/v2/external-booking/list?page=${page}&pageSize=${pageSize}`);
      const result = await response.json();

      if (result.success && result.data) {
        setBookings(result.data);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotal(result.pagination.total);
        }
      } else {
        setError(result.message || 'Erro ao carregar reservas');
      }
    } catch (err) {
      console.error('❌ Erro ao carregar reservas:', err);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta reserva?')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/v2/external-booking/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Reserva deletada com sucesso');
        loadBookings();
      } else {
        alert(result.message || 'Erro ao deletar reserva');
      }
    } catch (err) {
      console.error('❌ Erro ao deletar reserva:', err);
      alert('Erro ao deletar reserva');
    }
  };

  const handleBookingFound = async (bookingData: any) => {
    console.log('✅ Reserva encontrada pela busca:', bookingData);

    // Não precisa fazer nada aqui, pois o modal de busca já cadastra automaticamente
    // Apenas recarregar a lista
    loadBookings();

    alert(`Reserva ${bookingData.localizador} encontrada e cadastrada com sucesso!`);
  };

  const handleMonitor = async (booking: ExternalBooking) => {
    // Verificar se há contas conectadas
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/booking-monitor/accounts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (!result.success || !result.data || result.data.length === 0) {
        const goToAccounts = confirm(
          '❌ Você precisa conectar uma conta de companhia aérea primeiro.\n\n' +
          'Deseja ir para a página de contas agora?'
        );

        if (goToAccounts) {
          window.location.href = '/airline-accounts';
        }
        return;
      }

      // Filtrar contas da mesma companhia
      const airlineAccounts = result.data.filter((acc: any) =>
        acc.airline === booking.airline && acc.isActive
      );

      if (airlineAccounts.length === 0) {
        alert(`❌ Você não possui uma conta conectada da ${booking.airline}.\n\nVá em "Contas de Companhias" para conectar.`);
        return;
      }

      // Se tem apenas uma conta, usar automaticamente
      let accountId = airlineAccounts[0].id;

      // Se tem múltiplas contas, perguntar qual usar
      if (airlineAccounts.length > 1) {
        const accountEmails = airlineAccounts.map((acc: any) => acc.email).join('\n');
        const selectedEmail = prompt(
          `Você possui ${airlineAccounts.length} contas ${booking.airline}.\n\n` +
          `Contas disponíveis:\n${accountEmails}\n\n` +
          `Digite o email da conta que deseja usar:`
        );

        if (!selectedEmail) return;

        const selectedAccount = airlineAccounts.find((acc: any) =>
          acc.email === selectedEmail.trim()
        );

        if (!selectedAccount) {
          alert('❌ Conta não encontrada.');
          return;
        }

        accountId = selectedAccount.id;
      }

      // Adicionar reserva ao monitoramento
      const monitorResponse = await fetch(`${apiUrl}/api/booking-monitor/add-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          accountId,
          bookingCode: booking.bookingCode
        })
      });

      const monitorResult = await monitorResponse.json();

      if (monitorResult.success) {
        alert(
          `✅ Reserva ${booking.bookingCode} adicionada ao monitoramento!\n\n` +
          `O sistema verificará automaticamente a cada hora e notificará sobre qualquer mudança.`
        );
      } else {
        alert(`❌ Erro ao adicionar monitoramento: ${monitorResult.error}`);
      }
    } catch (err) {
      console.error('Erro ao monitorar:', err);
      alert('❌ Erro ao conectar com o servidor');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = !searchTerm ||
      booking.bookingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.flightNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAirline = !selectedAirline || booking.airline === selectedAirline;

    return matchesSearch && matchesAirline;
  });

  const airlines = Array.from(new Set(bookings.map(b => b.airline))).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <button className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors">
                  Dashboard
                </button>
              </Link>
              <h1 className="text-2xl font-bold">📋 Gerenciamento de Reservas Externas</h1>
            </div>
            <div className="flex gap-3">
              <Link href="/airline-accounts">
                <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                  <span className="mr-2">🔗</span>
                  Contas de Companhias
                </Button>
              </Link>
              <Button
                onClick={() => setShowSearchModal(true)}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <span className="mr-2">🔍</span>
                Buscar Reserva Externa
              </Button>
              <Button
                onClick={() => setShowRegisterModal(true)}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <span className="mr-2">📝</span>
                Cadastrar Manualmente
              </Button>
            </div>
          </div>

          <p className="text-gray-600">
            Total de reservas cadastradas: <strong>{total}</strong>
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Buscar</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Localizador, Nome, Voo..."
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Companhia Aérea</label>
              <select
                value={selectedAirline}
                onChange={(e) => setSelectedAirline(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Todas</option>
                {airlines.map(airline => (
                  <option key={airline} value={airline}>{airline}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedAirline('');
                }}
                className="w-full px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Mensagens */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-lg">Carregando reservas...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">❌ {error}</p>
          </div>
        )}

        {/* Tabela de Reservas */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localizador</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passageiro</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Companhia</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rota</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partida</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                        Nenhuma reserva encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-bold">
                          {booking.bookingCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium">{booking.fullName}</div>
                          {booking.email && (
                            <div className="text-xs text-gray-500">{booking.email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                            {booking.airline}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono">
                          {booking.flightNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono">{booking.origin}</span>
                          <span className="mx-1">→</span>
                          <span className="font-mono">{booking.destination}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatDate(booking.departureDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono">
                          {booking.seat || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            booking.bookingStatus === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                            booking.bookingStatus === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {booking.bookingStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleMonitor(booking)}
                              className="text-green-600 hover:text-green-800"
                              title="Monitorar Mudanças"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => {
                                setEditingBooking(booking);
                                setShowRegisterModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(booking.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Deletar"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="border-t px-6 py-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Página {page} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BookingSearchModal
        open={showSearchModal}
        onOpenChange={setShowSearchModal}
        onBookingFound={handleBookingFound}
      />

      <BookingRegisterModal
        open={showRegisterModal}
        onOpenChange={(open) => {
          setShowRegisterModal(open);
          if (!open) {
            setEditingBooking(null);
          }
        }}
        onBookingRegistered={() => {
          loadBookings();
          setEditingBooking(null);
        }}
      />
    </div>
  );
}
