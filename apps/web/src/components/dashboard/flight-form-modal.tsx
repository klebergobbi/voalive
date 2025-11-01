'use client';

import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
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
    // Campos de monitoramento
    realDepartureTime: '',
    estimatedDepartureTime: '',
    realArrivalTime: '',
    estimatedArrivalTime: '',
    departureGate: '',
    departureTerminal: '',
    arrivalGate: '',
    arrivalTerminal: '',
    delayMinutes: '',
    currentLatitude: '',
    currentLongitude: '',
    currentAltitude: '',
    currentSpeed: '',
    currentHeading: '',
    trackingEnabled: true,
  });

  // ✅ CORRIGIDO: Atualizar formData quando o modal abrir OU flight mudar
  useEffect(() => {
    console.log('🔍 useEffect disparado:', { open, flight: flight ? 'presente' : 'null', flightNumber: flight?.flightNumber });

    if (open && flight) {
      console.log('✏️ MODO EDIÇÃO: Carregando dados do voo:', {
        id: flight.id,
        flightNumber: flight.flightNumber,
        origin: flight.origin,
        destination: flight.destination,
        airline: flight.airline
      });

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
        // Campos de monitoramento
        realDepartureTime: flight.realDepartureTime ? new Date(flight.realDepartureTime).toISOString().slice(0, 16) : '',
        estimatedDepartureTime: flight.estimatedDepartureTime ? new Date(flight.estimatedDepartureTime).toISOString().slice(0, 16) : '',
        realArrivalTime: flight.realArrivalTime ? new Date(flight.realArrivalTime).toISOString().slice(0, 16) : '',
        estimatedArrivalTime: flight.estimatedArrivalTime ? new Date(flight.estimatedArrivalTime).toISOString().slice(0, 16) : '',
        departureGate: flight.departureGate || '',
        departureTerminal: flight.departureTerminal || '',
        arrivalGate: flight.arrivalGate || '',
        arrivalTerminal: flight.arrivalTerminal || '',
        delayMinutes: flight.delayMinutes?.toString() || '',
        currentLatitude: flight.currentLatitude?.toString() || '',
        currentLongitude: flight.currentLongitude?.toString() || '',
        currentAltitude: flight.currentAltitude?.toString() || '',
        currentSpeed: flight.currentSpeed?.toString() || '',
        currentHeading: flight.currentHeading?.toString() || '',
        trackingEnabled: flight.trackingEnabled ?? true,
      });

      console.log('✅ Dados carregados no formulário');
    } else if (open && !flight) {
      console.log('➕ MODO CRIAÇÃO: Limpando formulário');
      // Limpar formulário quando abre sem flight (modo criação)
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
        realDepartureTime: '',
        estimatedDepartureTime: '',
        realArrivalTime: '',
        estimatedArrivalTime: '',
        departureGate: '',
        departureTerminal: '',
        arrivalGate: '',
        arrivalTerminal: '',
        delayMinutes: '',
        currentLatitude: '',
        currentLongitude: '',
        currentAltitude: '',
        currentSpeed: '',
        currentHeading: '',
        trackingEnabled: true,
      });
    }
  }, [flight, open]); // ✅ Executar quando o modal abrir OU o flight mudar

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

      // Campos de monitoramento em tempo real
      realDepartureTime: formData.realDepartureTime ? new Date(formData.realDepartureTime) : undefined,
      estimatedDepartureTime: formData.estimatedDepartureTime ? new Date(formData.estimatedDepartureTime) : undefined,
      realArrivalTime: formData.realArrivalTime ? new Date(formData.realArrivalTime) : undefined,
      estimatedArrivalTime: formData.estimatedArrivalTime ? new Date(formData.estimatedArrivalTime) : undefined,
      departureGate: formData.departureGate || undefined,
      departureTerminal: formData.departureTerminal || undefined,
      arrivalGate: formData.arrivalGate || undefined,
      arrivalTerminal: formData.arrivalTerminal || undefined,
      delayMinutes: formData.delayMinutes ? parseInt(formData.delayMinutes) : undefined,

      // Posição GPS em tempo real
      currentLatitude: formData.currentLatitude ? parseFloat(formData.currentLatitude) : undefined,
      currentLongitude: formData.currentLongitude ? parseFloat(formData.currentLongitude) : undefined,
      currentAltitude: formData.currentAltitude ? parseInt(formData.currentAltitude) : undefined,
      currentSpeed: formData.currentSpeed ? parseInt(formData.currentSpeed) : undefined,
      currentHeading: formData.currentHeading ? parseInt(formData.currentHeading) : undefined,

      // Metadados
      trackingEnabled: formData.trackingEnabled,
      lastTrackedAt: new Date(),
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
      realDepartureTime: '',
      estimatedDepartureTime: '',
      realArrivalTime: '',
      estimatedArrivalTime: '',
      departureGate: '',
      departureTerminal: '',
      arrivalGate: '',
      arrivalTerminal: '',
      delayMinutes: '',
      currentLatitude: '',
      currentLongitude: '',
      currentAltitude: '',
      currentSpeed: '',
      currentHeading: '',
      trackingEnabled: true,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Buscar dados do voo automaticamente ao digitar o número
  const searchFlightData = async (flightNumber: string) => {
    if (flightNumber.length < 4) return;

    setLoading(true);
    try {
      console.log('🔍 Buscando voo:', flightNumber);

      // Usar a URL relativa para passar pelo nginx
      const response = await fetch(`/api/v1/flight-search/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightNumber: flightNumber.trim().toUpperCase() }),
      });

      const result = await response.json();
      console.log('📦 Resposta da API:', result);

      if (result.success && result.data) {
        const flightData = result.data;

        console.log('✅ Dados do voo:', flightData);

        // Formatar datas
        const formatDateTime = (date?: string, time?: string) => {
          if (!date || !time) return '';
          try {
            const [year, month, day] = date.split('-');
            const dateObj = new Date(`${year}-${month}-${day}T${time}`);
            return dateObj.toISOString().slice(0, 16);
          } catch {
            return '';
          }
        };

        const departureDateTime = formatDateTime(flightData.dataPartida, flightData.horarioPartida);
        const arrivalDateTime = formatDateTime(flightData.dataPartida, flightData.horarioChegada);
        const realDeptTime = formatDateTime(flightData.dataPartida, flightData.horarioPartidaReal);
        const estDeptTime = formatDateTime(flightData.dataPartida, flightData.horarioPartidaEstimado);
        const realArrTime = formatDateTime(flightData.dataPartida, flightData.horarioChegadaReal);
        const estArrTime = formatDateTime(flightData.dataPartida, flightData.horarioChegadaEstimado);

        // Converter status da API para status interno
        const convertStatus = (apiStatus: string): string => {
          const statusMap: { [key: string]: string } = {
            'SCHEDULED': 'SCHEDULED',
            'Em voo': 'DEPARTED',
            'ACTIVE': 'DEPARTED',
            'LANDED': 'ARRIVED',
            'CANCELLED': 'CANCELLED',
            'DELAYED': 'DELAYED',
          };
          return statusMap[apiStatus] || 'SCHEDULED';
        };

        // Preencher todos os campos automaticamente
        const updatedFields = {
          ...prev,
          origin: flightData.origem || prev.origin,
          destination: flightData.destino || prev.destination,
          departureTime: departureDateTime || prev.departureTime,
          arrivalTime: arrivalDateTime || prev.arrivalTime,
          airline: flightData.companhia || prev.airline,
          aircraft: flightData.aeronave || prev.aircraft || 'Não informado',
          status: convertStatus(flightData.status),
          // Campos de monitoramento
          realDepartureTime: realDeptTime || prev.realDepartureTime,
          estimatedDepartureTime: estDeptTime || prev.estimatedDepartureTime,
          realArrivalTime: realArrTime || prev.realArrivalTime,
          estimatedArrivalTime: estArrTime || prev.estimatedArrivalTime,
          departureGate: flightData.portao || prev.departureGate,
          departureTerminal: flightData.terminal || prev.departureTerminal,
          arrivalGate: flightData.portaoChegada || prev.arrivalGate,
          arrivalTerminal: flightData.terminalChegada || prev.terminalChegada,
          delayMinutes: flightData.atrasado?.toString() || prev.delayMinutes,
          currentLatitude: flightData.posicao?.latitude?.toString() || prev.currentLatitude,
          currentLongitude: flightData.posicao?.longitude?.toString() || prev.currentLongitude,
          currentAltitude: flightData.posicao?.altitude?.toString() || prev.currentAltitude,
          currentSpeed: flightData.posicao?.velocidade?.toString() || prev.currentSpeed,
          currentHeading: flightData.posicao?.direcao?.toString() || prev.currentHeading,
          trackingEnabled: true,
        };

        setFormData(updatedFields);

        // Mostrar mensagem de sucesso
        const fieldsCount = [
          flightData.origem,
          flightData.destino,
          flightData.companhia,
          flightData.portao,
          flightData.terminal,
          flightData.posicao
        ].filter(Boolean).length;

        console.log(`✅ ${fieldsCount} campos preenchidos automaticamente`);

        // Alertar usuário se dados importantes estiverem faltando
        if (!flightData.origem || !flightData.destino) {
          console.warn('⚠️ Origem/Destino não disponíveis - preencha manualmente');
        }
      } else {
        console.warn('⚠️ Voo não encontrado ou sem dados');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar dados do voo:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler para o campo de número do voo com debounce
  const handleFlightNumberChange = (value: string) => {
    handleChange('flightNumber', value);

    // Limpar timeout anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Criar novo timeout para buscar após 800ms
    if (value.length >= 4) {
      const timeout = setTimeout(() => {
        searchFlightData(value);
      }, 800);
      setSearchTimeout(timeout);
    }
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
              <Label htmlFor="flightNumber" className="flex items-center gap-2">
                Número do Voo
                {loading && <span className="text-xs text-blue-600">🔍 Buscando...</span>}
              </Label>
              <Input
                id="flightNumber"
                value={formData.flightNumber}
                onChange={(e) => handleFlightNumberChange(e.target.value.toUpperCase())}
                placeholder="Ex: LA3789, G31234, AD4567"
                required
                className={loading ? 'border-blue-400' : ''}
              />
              <p className="text-xs text-gray-500">
                💡 Digite o número do voo e os campos serão preenchidos automaticamente
              </p>
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

          {/* ======== CAMPOS DE MONITORAMENTO EM TEMPO REAL ======== */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
              <span>📊</span>
              Monitoramento em Tempo Real
            </h3>

            {/* Horários Reais e Estimados */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <span>⏰</span>
                Horários Atualizados
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="realDepartureTime">Partida Real</Label>
                  <Input
                    id="realDepartureTime"
                    type="datetime-local"
                    value={formData.realDepartureTime}
                    onChange={(e) => handleChange('realDepartureTime', e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedDepartureTime">Partida Estimada</Label>
                  <Input
                    id="estimatedDepartureTime"
                    type="datetime-local"
                    value={formData.estimatedDepartureTime}
                    onChange={(e) => handleChange('estimatedDepartureTime', e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="realArrivalTime">Chegada Real</Label>
                  <Input
                    id="realArrivalTime"
                    type="datetime-local"
                    value={formData.realArrivalTime}
                    onChange={(e) => handleChange('realArrivalTime', e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedArrivalTime">Chegada Estimada</Label>
                  <Input
                    id="estimatedArrivalTime"
                    type="datetime-local"
                    value={formData.estimatedArrivalTime}
                    onChange={(e) => handleChange('estimatedArrivalTime', e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Portões e Terminais */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                <span>🚪</span>
                Portões e Terminais
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="departureGate">Portão Partida</Label>
                  <Input
                    id="departureGate"
                    value={formData.departureGate}
                    onChange={(e) => handleChange('departureGate', e.target.value)}
                    placeholder="Ex: A12"
                    className="bg-white font-bold text-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="departureTerminal">Terminal Partida</Label>
                  <Input
                    id="departureTerminal"
                    value={formData.departureTerminal}
                    onChange={(e) => handleChange('departureTerminal', e.target.value)}
                    placeholder="Ex: 2"
                    className="bg-white font-bold text-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="arrivalGate">Portão Chegada</Label>
                  <Input
                    id="arrivalGate"
                    value={formData.arrivalGate}
                    onChange={(e) => handleChange('arrivalGate', e.target.value)}
                    placeholder="Ex: B5"
                    className="bg-white font-bold text-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="arrivalTerminal">Terminal Chegada</Label>
                  <Input
                    id="arrivalTerminal"
                    value={formData.arrivalTerminal}
                    onChange={(e) => handleChange('arrivalTerminal', e.target.value)}
                    placeholder="Ex: 1"
                    className="bg-white font-bold text-lg"
                  />
                </div>
              </div>
            </div>

            {/* Posição GPS */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                <span>📍</span>
                Posição GPS em Tempo Real
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="currentLatitude">Latitude</Label>
                  <Input
                    id="currentLatitude"
                    type="number"
                    step="0.0001"
                    value={formData.currentLatitude}
                    onChange={(e) => handleChange('currentLatitude', e.target.value)}
                    placeholder="-23.4356"
                    className="bg-white font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="currentLongitude">Longitude</Label>
                  <Input
                    id="currentLongitude"
                    type="number"
                    step="0.0001"
                    value={formData.currentLongitude}
                    onChange={(e) => handleChange('currentLongitude', e.target.value)}
                    placeholder="-46.4731"
                    className="bg-white font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="currentAltitude">Altitude (pés)</Label>
                  <Input
                    id="currentAltitude"
                    type="number"
                    value={formData.currentAltitude}
                    onChange={(e) => handleChange('currentAltitude', e.target.value)}
                    placeholder="35000"
                    className="bg-white font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="currentSpeed">Velocidade (km/h)</Label>
                  <Input
                    id="currentSpeed"
                    type="number"
                    value={formData.currentSpeed}
                    onChange={(e) => handleChange('currentSpeed', e.target.value)}
                    placeholder="850"
                    className="bg-white font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="currentHeading">Direção (°)</Label>
                  <Input
                    id="currentHeading"
                    type="number"
                    min="0"
                    max="360"
                    value={formData.currentHeading}
                    onChange={(e) => handleChange('currentHeading', e.target.value)}
                    placeholder="180"
                    className="bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Atraso */}
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-3 flex items-center gap-2">
                <span>⚠️</span>
                Atraso
              </h4>
              <div>
                <Label htmlFor="delayMinutes">Tempo de Atraso (minutos)</Label>
                <Input
                  id="delayMinutes"
                  type="number"
                  min="0"
                  value={formData.delayMinutes}
                  onChange={(e) => handleChange('delayMinutes', e.target.value)}
                  placeholder="0"
                  className="bg-white font-bold text-xl"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
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