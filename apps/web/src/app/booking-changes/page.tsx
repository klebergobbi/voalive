'use client';

import { useState, useEffect } from 'react';
import { Button } from '@reservasegura/ui';
import Link from 'next/link';

interface BookingChange {
  id: string;
  bookingCode: string;
  passengerName: string;
  changeType: 'FLIGHT_CHANGED' | 'TIME_CHANGED' | 'SEAT_CHANGED' | 'GATE_CHANGED' | 'STATUS_CHANGED';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  oldValue: string;
  newValue: string;
  detectedAt: string;
  notified: boolean;
}

export default function BookingChangesPage() {
  const [changes, setChanges] = useState<BookingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadChanges();
  }, []);

  const loadChanges = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/booking-monitor/changes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setChanges(result.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar mudanças:', err);
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      FLIGHT_CHANGED: '✈️ Voo Alterado',
      TIME_CHANGED: '⏰ Horário Alterado',
      SEAT_CHANGED: '💺 Assento Alterado',
      GATE_CHANGED: '🚪 Portão Alterado',
      STATUS_CHANGED: '📊 Status Alterado'
    };
    return labels[type] || type;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'INFO':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR');
  };

  const filteredChanges = filter === 'all'
    ? changes
    : changes.filter(c => c.changeType === filter);

  const changeTypes = [
    { value: 'all', label: 'Todas', count: changes.length },
    { value: 'FLIGHT_CHANGED', label: 'Voos', count: changes.filter(c => c.changeType === 'FLIGHT_CHANGED').length },
    { value: 'TIME_CHANGED', label: 'Horários', count: changes.filter(c => c.changeType === 'TIME_CHANGED').length },
    { value: 'SEAT_CHANGED', label: 'Assentos', count: changes.filter(c => c.changeType === 'SEAT_CHANGED').length },
    { value: 'GATE_CHANGED', label: 'Portões', count: changes.filter(c => c.changeType === 'GATE_CHANGED').length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <button className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors">
                  ← Dashboard
                </button>
              </Link>
              <h1 className="text-2xl font-bold">📊 Histórico de Alterações</h1>
            </div>
            <Button
              onClick={loadChanges}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              🔄 Atualizar
            </Button>
          </div>

          <p className="text-gray-600 mb-4">
            Todas as mudanças detectadas em suas reservas monitoradas
          </p>

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            {changeTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setFilter(type.value)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  filter === type.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {type.label} ({type.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-lg">Carregando histórico...</p>
            </div>
          </div>
        )}

        {!loading && filteredChanges.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg">
              📭 Nenhuma alteração registrada ainda
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Adicione reservas ao monitoramento para detectar mudanças automaticamente
            </p>
          </div>
        )}

        {!loading && filteredChanges.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reserva
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Passageiro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tipo de Mudança
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Valor Anterior
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Valor Novo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Detectado em
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Severidade
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredChanges.map((change) => (
                    <tr key={change.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold">
                        {change.bookingCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {change.passengerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getChangeTypeLabel(change.changeType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-gray-100 rounded font-mono text-sm">
                          {change.oldValue}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-green-100 rounded font-mono text-sm font-bold">
                          {change.newValue}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(change.detectedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded border ${getSeverityColor(change.severity)}`}>
                          {change.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
