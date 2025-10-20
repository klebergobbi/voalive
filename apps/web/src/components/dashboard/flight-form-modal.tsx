'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@reservasegura/ui';
import { Flight } from '@reservasegura/types';
import { AIRLINES, AIRPORTS } from '@reservasegura/types';

interface FlightFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (flight: Omit<Flight, 'id'>) => void;
  flight?: Flight | null;
}

export function FlightFormModal({ open, onOpenChange, onSubmit, flight }: FlightFormModalProps) {
  const [formData, setFormData] = useState({
    flightNumber: flight?.flightNumber || '',
    origin: flight?.origin || '',
    destination: flight?.destination || '',
    departureTime: flight?.departureTime ? new Date(flight.departureTime).toISOString().slice(0, 16) : '',
    arrivalTime: flight?.arrivalTime ? new Date(flight.arrivalTime).toISOString().slice(0, 16) : '',
    airline: flight?.airline || '',
    aircraft: flight?.aircraft || '',
    status: flight?.status || 'SCHEDULED',
    checkInStatus: flight?.checkInStatus || 'NOT_AVAILABLE',
    locator: flight?.locator || '',
    passengerFirstName: flight?.passengerFirstName || '',
    passengerLastName: flight?.passengerLastName || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newFlight: Omit<Flight, 'id'> = {
      flightNumber: formData.flightNumber,
      origin: formData.origin,
      destination: formData.destination,
      departureTime: new Date(formData.departureTime),
      arrivalTime: new Date(formData.arrivalTime),
      airline: formData.airline,
      aircraft: formData.aircraft,
      status: formData.status as any,
      checkInStatus: formData.checkInStatus as any,
      locator: formData.locator || undefined,
      passengerFirstName: formData.passengerFirstName || undefined,
      passengerLastName: formData.passengerLastName || undefined,
    };

    onSubmit(newFlight);
    onOpenChange(false);

    // Reset form
    setFormData({
      flightNumber: '',
      origin: '',
      destination: '',
      departureTime: '',
      arrivalTime: '',
      airline: '',
      aircraft: '',
      status: 'SCHEDULED',
      checkInStatus: 'NOT_AVAILABLE',
      locator: '',
      passengerFirstName: '',
      passengerLastName: '',
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const airportOptions = Object.entries(AIRPORTS).map(([code, name]) => ({
    code,
    name: `${code} - ${name}`,
  }));

  const airlineOptions = Object.entries(AIRLINES).map(([code, name]) => ({
    code,
    name: `${code} - ${name}`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {flight ? 'Editar Voo' : 'Novo Voo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="flightNumber">Número do Voo</Label>
              <Input
                id="flightNumber"
                value={formData.flightNumber}
                onChange={(e) => handleChange('flightNumber', e.target.value)}
                placeholder="Ex: AD2456"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="airline">Companhia Aérea</Label>
              <Select value={formData.airline} onValueChange={(value) => handleChange('airline', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a companhia" />
                </SelectTrigger>
                <SelectContent>
                  {airlineOptions.map((airline) => (
                    <SelectItem key={airline.code} value={airline.code}>
                      {airline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">Origem</Label>
              <Select value={formData.origin} onValueChange={(value) => handleChange('origin', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Aeroporto de origem" />
                </SelectTrigger>
                <SelectContent>
                  {airportOptions.map((airport) => (
                    <SelectItem key={airport.code} value={airport.code}>
                      {airport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destino</Label>
              <Select value={formData.destination} onValueChange={(value) => handleChange('destination', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Aeroporto de destino" />
                </SelectTrigger>
                <SelectContent>
                  {airportOptions.map((airport) => (
                    <SelectItem key={airport.code} value={airport.code}>
                      {airport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departureTime">Partida</Label>
              <Input
                id="departureTime"
                type="datetime-local"
                value={formData.departureTime}
                onChange={(e) => handleChange('departureTime', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrivalTime">Chegada</Label>
              <Input
                id="arrivalTime"
                type="datetime-local"
                value={formData.arrivalTime}
                onChange={(e) => handleChange('arrivalTime', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aircraft">Aeronave</Label>
              <Input
                id="aircraft"
                value={formData.aircraft}
                onChange={(e) => handleChange('aircraft', e.target.value)}
                placeholder="Ex: A320"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">AGENDADO</SelectItem>
                  <SelectItem value="DELAYED">ATRASADO</SelectItem>
                  <SelectItem value="CANCELLED">CANCELADO</SelectItem>
                  <SelectItem value="BOARDING">EMBARCANDO</SelectItem>
                  <SelectItem value="DEPARTED">PARTIU</SelectItem>
                  <SelectItem value="ARRIVED">CHEGOU</SelectItem>
                  <SelectItem value="CONFIRMADO">CONFIRMADO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkInStatus">Check-in</Label>
              <Select value={formData.checkInStatus} onValueChange={(value) => handleChange('checkInStatus', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_AVAILABLE">NÃO DISPONÍVEL</SelectItem>
                  <SelectItem value="OPEN">ABERTO</SelectItem>
                  <SelectItem value="CLOSED">FECHADO</SelectItem>
                  <SelectItem value="COMPLETED">CONCLUÍDO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locator">Localizador</Label>
              <Input
                id="locator"
                value={formData.locator}
                onChange={(e) => handleChange('locator', e.target.value)}
                placeholder="Ex: ABC123"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passengerFirstName">Nome do Passageiro</Label>
              <Input
                id="passengerFirstName"
                value={formData.passengerFirstName}
                onChange={(e) => handleChange('passengerFirstName', e.target.value)}
                placeholder="Nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passengerLastName">Sobrenome do Passageiro</Label>
              <Input
                id="passengerLastName"
                value={formData.passengerLastName}
                onChange={(e) => handleChange('passengerLastName', e.target.value)}
                placeholder="Sobrenome"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {flight ? 'Atualizar' : 'Criar'} Voo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}