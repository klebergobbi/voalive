'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@reservasegura/ui';
import { Flight } from '@reservasegura/types';

interface BookingData {
  localizador: string;
  sobrenome: string;
  origem: string;
  destino: string;
  dataPartida: string;
  dataChegada: string;
  horarioPartida: string;
  horarioChegada: string;
  numeroVoo: string;
  companhia: 'GOL' | 'LATAM' | 'AZUL';
  status: string;
  portaoEmbarque?: string;
  terminal?: string;
  assento?: string;
  classe: string;
  passageiro: string;
}

interface AutoFillFlightFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (flight: Omit<Flight, 'id'>) => void;
  bookingData?: BookingData | null;
  flight?: Flight | null;
}

export function AutoFillFlightForm({ open, onOpenChange, onSubmit, bookingData, flight }: AutoFillFlightFormProps) {
  const [formData, setFormData] = useState({
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
    gate: '',
    terminal: '',
    seat: '',
    ticketClass: '',
  });

  const [isAutoFilled, setIsAutoFilled] = useState(false);

  // Auto-preencher formulário quando dados da reserva chegarem
  useEffect(() => {
    if (bookingData) {
      console.log('🔄 Auto-preenchendo formulário com dados da reserva:', bookingData);

      // Converter dados da reserva para o formato do formulário
      const departureDateTime = bookingData.dataPartida && bookingData.horarioPartida
        ? `${bookingData.dataPartida}T${bookingData.horarioPartida.padStart(5, '0')}`
        : '';

      const arrivalDateTime = bookingData.dataChegada && bookingData.horarioChegada
        ? `${bookingData.dataChegada}T${bookingData.horarioChegada.padStart(5, '0')}`
        : '';

      setFormData({
        flightNumber: bookingData.numeroVoo || '',
        origin: bookingData.origem || '',
        destination: bookingData.destino || '',
        departureTime: departureDateTime,
        arrivalTime: arrivalDateTime,
        airline: bookingData.companhia || '',
        aircraft: 'Boeing 737', // Valor padrão
        status: convertStatus(bookingData.status),
        checkInStatus: 'AVAILABLE',
        locator: bookingData.localizador || '',
        passengerFirstName: '', // Não temos nome
        passengerLastName: bookingData.passageiro || bookingData.sobrenome || '',
        gate: bookingData.portaoEmbarque || '',
        terminal: bookingData.terminal || '',
        seat: bookingData.assento || '',
        ticketClass: bookingData.classe || 'ECONÔMICA',
      });

      setIsAutoFilled(true);
    } else if (flight) {
      // Modo edição - preencher com dados do voo existente
      setFormData({
        flightNumber: flight.flightNumber || '',
        origin: flight.origin || '',
        destination: flight.destination || '',
        departureTime: flight.departureTime ? new Date(flight.departureTime).toISOString().slice(0, 16) : '',
        arrivalTime: flight.arrivalTime ? new Date(flight.arrivalTime).toISOString().slice(0, 16) : '',
        airline: flight.airline || '',
        aircraft: flight.aircraft || '',
        status: flight.status || 'SCHEDULED',
        checkInStatus: flight.checkInStatus || 'NOT_AVAILABLE',
        locator: flight.locator || '',
        passengerFirstName: flight.passengerFirstName || '',
        passengerLastName: flight.passengerLastName || '',
        gate: '',
        terminal: '',
        seat: '',
        ticketClass: '',
      });

      setIsAutoFilled(false);
    }
  }, [bookingData, flight]);

  const convertStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'CONFIRMADO': 'SCHEDULED',
      'CHECK_IN': 'BOARDING',
      'EMBARQUE': 'BOARDING',
      'CANCELADO': 'CANCELLED',
      'ATRASADO': 'DELAYED',
    };

    return statusMap[status] || 'SCHEDULED';
  };

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
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSelectChange = (field: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAutoFilled ? (
              <>
                <span className="text-2xl">✨</span>
                Dados Encontrados - Revisar Voo
              </>
            ) : (
              <>
                <span className="text-2xl">✈️</span>
                {flight ? 'Editar' : 'Cadastrar'} Voo
              </>
            )}
          </DialogTitle>
          {isAutoFilled && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-700 flex items-center gap-2">
                <span>✅</span>
                Dados preenchidos automaticamente a partir da reserva <strong>{formData.locator}</strong>
                <br />
                <span className="text-xs">Revise as informações e ajuste se necessário antes de salvar.</span>
              </p>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados básicos do voo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="flightNumber">Número do Voo *</Label>
              <Input
                id="flightNumber"
                value={formData.flightNumber}
                onChange={handleChange('flightNumber')}
                required
                className={isAutoFilled ? 'bg-green-50' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="airline">Companhia Aérea *</Label>
              <Select value={formData.airline || ''} onValueChange={handleSelectChange('airline')}>
                <SelectTrigger className={isAutoFilled ? 'bg-green-50' : ''}>
                  <SelectValue placeholder="Selecione a companhia">
                    {formData.airline === 'GOL' && 'GOL Linhas Aéreas'}
                    {formData.airline === 'LATAM' && 'LATAM Airlines'}
                    {formData.airline === 'AZUL' && 'Azul Linhas Aéreas'}
                    {formData.airline === 'Avianca' && 'Avianca'}
                    {formData.airline === 'TAM' && 'TAM'}
                    {!formData.airline && 'Selecione a companhia'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOL">GOL Linhas Aéreas</SelectItem>
                  <SelectItem value="LATAM">LATAM Airlines</SelectItem>
                  <SelectItem value="AZUL">Azul Linhas Aéreas</SelectItem>
                  <SelectItem value="Avianca">Avianca</SelectItem>
                  <SelectItem value="TAM">TAM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Origem e destino */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">Origem *</Label>
              <Input
                id="origin"
                value={formData.origin}
                onChange={handleChange('origin')}
                placeholder="Ex: GRU"
                required
                className={isAutoFilled ? 'bg-green-50' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destino *</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={handleChange('destination')}
                placeholder="Ex: SDU"
                required
                className={isAutoFilled ? 'bg-green-50' : ''}
              />
            </div>
          </div>

          {/* Horários */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departureTime">Data e Hora de Partida *</Label>
              <Input
                id="departureTime"
                type="datetime-local"
                value={formData.departureTime}
                onChange={handleChange('departureTime')}
                required
                className={isAutoFilled ? 'bg-green-50' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrivalTime">Data e Hora de Chegada *</Label>
              <Input
                id="arrivalTime"
                type="datetime-local"
                value={formData.arrivalTime}
                onChange={handleChange('arrivalTime')}
                required
                className={isAutoFilled ? 'bg-green-50' : ''}
              />
            </div>
          </div>

          {/* Dados do passageiro e localizador */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locator">Localizador</Label>
              <Input
                id="locator"
                value={formData.locator}
                onChange={handleChange('locator')}
                placeholder="Ex: ABC123"
                className={isAutoFilled ? 'bg-green-50' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passengerLastName">Sobrenome do Passageiro</Label>
              <Input
                id="passengerLastName"
                value={formData.passengerLastName}
                onChange={handleChange('passengerLastName')}
                placeholder="Ex: SILVA"
                className={isAutoFilled ? 'bg-green-50' : ''}
              />
            </div>
          </div>

          {/* Detalhes técnicos */}
          <div className="space-y-2">
            <Label htmlFor="aircraft">Aeronave</Label>
            <Input
              id="aircraft"
              value={formData.aircraft}
              onChange={handleChange('aircraft')}
              placeholder="Ex: Boeing 737"
            />
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status do Voo</Label>
              <Select value={formData.status} onValueChange={handleSelectChange('status')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">Programado</SelectItem>
                  <SelectItem value="BOARDING">Embarcando</SelectItem>
                  <SelectItem value="DEPARTED">Partiu</SelectItem>
                  <SelectItem value="ARRIVED">Chegou</SelectItem>
                  <SelectItem value="DELAYED">Atrasado</SelectItem>
                  <SelectItem value="CANCELLED">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkInStatus">Status do Check-in</Label>
              <Select value={formData.checkInStatus} onValueChange={handleSelectChange('checkInStatus')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_AVAILABLE">Não Disponível</SelectItem>
                  <SelectItem value="AVAILABLE">Disponível</SelectItem>
                  <SelectItem value="COMPLETED">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {flight ? 'Atualizar' : 'Cadastrar'} Voo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}