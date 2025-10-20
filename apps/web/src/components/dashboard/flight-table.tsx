'use client';

import { useState } from 'react';
import { Checkbox, Badge, Button, Input } from '@reservasegura/ui';
import { Trash2, Plane, Edit } from 'lucide-react';
import { AirlineLogo } from '../flights/airline-logo';
import { Flight, AIRLINES, AIRPORTS } from '@reservasegura/types';

interface FlightTableProps {
  flights: Flight[];
  onDeleteFlight: (id: string) => void;
  onUpdateFlight: (id: string, updates: Partial<Flight>) => void;
  onEditFlight?: (flight: Flight) => void;
}

export function FlightTable({ flights, onDeleteFlight, onUpdateFlight, onEditFlight }: FlightTableProps) {
  const [selectedFlights, setSelectedFlights] = useState<string[]>([]);
  const [editingName, setEditingName] = useState<string | null>(null);

  const handleSelectAll = () => {
    if (selectedFlights.length === flights.length) {
      setSelectedFlights([]);
    } else {
      setSelectedFlights(flights.map(f => f.id));
    }
  };

  const handleSelectFlight = (id: string) => {
    setSelectedFlights(prev =>
      prev.includes(id)
        ? prev.filter(fId => fId !== id)
        : [...prev, id]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMADO':
        return 'success';
      case 'SCHEDULED':
        return 'info';
      case 'DELAYED':
        return 'warning';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getCheckInStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'OPEN':
        return 'success';
      case 'CLOSED':
        return 'destructive';
      case 'COMPLETED':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="w-full overflow-auto">
      <table className="w-full table-auto">
        <thead>
          <tr className="border-b text-left text-sm font-medium text-gray-500">
            <th className="p-4">
              <Checkbox
                checked={selectedFlights.length === flights.length && flights.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </th>
            <th className="p-4">EMPRESA</th>
            <th className="p-4">STATUS</th>
            <th className="p-4">NOME</th>
            <th className="p-4">LOCALIZADOR</th>
            <th className="p-4">SOBRENOME</th>
            <th className="p-4">CHECK-IN</th>
            <th className="p-4">ROTA</th>
            <th className="p-4">EMBARQUE</th>
            <th className="p-4">AÇÕES</th>
          </tr>
        </thead>
        <tbody>
          {flights.map((flight) => (
            <tr key={flight.id} className="border-b hover:bg-gray-50">
              <td className="p-4">
                <Checkbox
                  checked={selectedFlights.includes(flight.id)}
                  onCheckedChange={() => handleSelectFlight(flight.id)}
                />
              </td>
              <td className="p-4">
                {flight.airline && AIRLINES[flight.airline as keyof typeof AIRLINES] && (
                  <AirlineLogo airline={flight.airline as keyof typeof AIRLINES} />
                )}
              </td>
              <td className="p-4">
                <Badge variant={getStatusColor(flight.status)}>
                  {flight.status}
                </Badge>
              </td>
              <td className="p-4">
                {editingName === flight.id ? (
                  <Input
                    value={flight.passengerFirstName || ''}
                    onChange={(e) => onUpdateFlight(flight.id, { passengerFirstName: e.target.value })}
                    onBlur={() => setEditingName(null)}
                    autoFocus
                    className="h-8"
                  />
                ) : (
                  <span
                    onClick={() => setEditingName(flight.id)}
                    className="cursor-pointer hover:text-primary"
                  >
                    {flight.passengerFirstName || '-'}
                  </span>
                )}
              </td>
              <td className="p-4 font-mono">
                {flight.locator || '-'}
              </td>
              <td className="p-4">
                {flight.passengerLastName || '-'}
              </td>
              <td className="p-4">
                <Badge variant={getCheckInStatusColor(flight.checkInStatus)}>
                  {flight.checkInStatus === 'CLOSED' ? 'FECHADO' :
                   flight.checkInStatus === 'OPEN' ? 'ABERTO' :
                   flight.checkInStatus || 'N/A'}
                </Badge>
              </td>
              <td className="p-4">
                <div className="flex items-center space-x-1">
                  <span className="font-mono text-sm font-semibold">
                    {flight.origin}
                  </span>
                  <Plane className="h-4 w-4 text-gray-400" />
                  <span className="font-mono text-sm font-semibold">
                    {flight.destination}
                  </span>
                </div>
              </td>
              <td className="p-4 text-sm">
                {formatDate(flight.departureTime)}
              </td>
              <td className="p-4">
                <div className="flex space-x-1">
                  {onEditFlight && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditFlight(flight)}
                      className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteFlight(flight.id)}
                    className="h-8 w-8 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}