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

  // Detectar se é busca de voo real (para exibir campos adicionais)
  // CORRIGIDO: Verificar TODOS os campos extras possíveis, não apenas alguns
  const isRealFlightSearch = bookingData && (
    bookingData.posicao ||
    bookingData.horarioPartidaReal ||
    bookingData.horarioPartidaEstimado ||
    bookingData.horarioChegadaReal ||
    bookingData.horarioChegadaEstimado ||
    bookingData.portao ||
    bookingData.portaoChegada ||
    bookingData.terminal ||
    bookingData.terminalChegada ||
    bookingData.status ||
    bookingData.atrasado !== undefined
  );

  // Auto-preencher formulário quando dados da reserva OU busca de voo chegarem
  useEffect(() => {
    if (bookingData) {
      console.log('🔄 Auto-preenchendo formulário com dados COMPLETOS:', JSON.stringify(bookingData, null, 2));
      console.log('📋 Campos recebidos:', {
        numeroVoo: bookingData.numeroVoo,
        origem: bookingData.origem,
        destino: bookingData.destino,
        dataPartida: bookingData.dataPartida,
        horarioPartida: bookingData.horarioPartida,
        horarioChegada: bookingData.horarioChegada,
        companhia: bookingData.companhia,
        status: bookingData.status
      });
      console.log('✅ Campos EXTRAS recebidos:', {
        horarioPartidaReal: bookingData.horarioPartidaReal,
        horarioPartidaEstimado: bookingData.horarioPartidaEstimado,
        horarioChegadaReal: bookingData.horarioChegadaReal,
        horarioChegadaEstimado: bookingData.horarioChegadaEstimado,
        portao: bookingData.portao,
        portaoChegada: bookingData.portaoChegada,
        terminal: bookingData.terminal,
        terminalChegada: bookingData.terminalChegada,
        posicao: bookingData.posicao ? 'SIM (GPS disponível)' : 'NÃO',
        atrasado: bookingData.atrasado,
        aeronave: bookingData.aeronave,
        registro: bookingData.registro
      });

      // DETECTAR SE É BUSCA DE VOO REAL ou RESERVA
      const isRealFlightSearch = bookingData.posicao || bookingData.horarioPartidaReal || bookingData.horarioPartidaEstimado;
      console.log(`🎯 isRealFlightSearch = ${isRealFlightSearch} (seção de campos extras ${isRealFlightSearch ? 'SERÁ EXIBIDA ✅' : 'NÃO SERÁ EXIBIDA ❌'})`);

      if (isRealFlightSearch) {
        // ✈️ DADOS DE VOO REAL (da busca online)
        console.log('✅ Dados de VOO REAL detectados - Preenchimento completo automático');

        // Função helper para formatar horário no padrão datetime-local
        const formatDateTime = (date: string, time: string): string => {
          if (!date || !time) return '';

          // Garantir que a data está no formato YYYY-MM-DD
          const dateFormatted = date.includes('T') ? date.split('T')[0] : date;

          // Garantir que o horário está no formato HH:MM (remover segundos se houver)
          const timeParts = time.split(':');
          const timeFormatted = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;

          return `${dateFormatted}T${timeFormatted}`;
        };

        // Usar horários reais se disponíveis, senão usar horários programados
        const departureTime = bookingData.horarioPartidaReal || bookingData.horarioPartidaEstimado || bookingData.horarioPartida;
        const arrivalTime = bookingData.horarioChegadaReal || bookingData.horarioChegadaEstimado || bookingData.horarioChegada;

        const departureDateTime = formatDateTime(bookingData.dataPartida, departureTime);
        const arrivalDateTime = formatDateTime(bookingData.dataPartida, arrivalTime);

        console.log('📅 Datas formatadas:', { departureDateTime, arrivalDateTime });

        // Parse dos horários reais
        const realDeptTime = bookingData.horarioPartidaReal ?
          formatDateTime(bookingData.dataPartida, bookingData.horarioPartidaReal) : '';
        const estDeptTime = bookingData.horarioPartidaEstimado ?
          formatDateTime(bookingData.dataPartida, bookingData.horarioPartidaEstimado) : '';
        const realArrTime = bookingData.horarioChegadaReal ?
          formatDateTime(bookingData.dataPartida, bookingData.horarioChegadaReal) : '';
        const estArrTime = bookingData.horarioChegadaEstimado ?
          formatDateTime(bookingData.dataPartida, bookingData.horarioChegadaEstimado) : '';

        setFormData({
          flightNumber: bookingData.numeroVoo || '',
          origin: bookingData.origem || '',
          destination: bookingData.destino || '',
          departureTime: departureDateTime,
          arrivalTime: arrivalDateTime,
          airline: bookingData.companhia || '',
          aircraft: bookingData.aeronave || 'Não informado',
          status: convertFlightApiStatus(bookingData.status),
          checkInStatus: determineCheckInStatus(bookingData.status),
          locator: '',
          passengerFirstName: '',
          passengerLastName: '',
          gate: bookingData.portao || '',
          terminal: bookingData.terminal || '',
          seat: '',
          ticketClass: '',
          // Campos de monitoramento
          realDepartureTime: realDeptTime,
          estimatedDepartureTime: estDeptTime,
          realArrivalTime: realArrTime,
          estimatedArrivalTime: estArrTime,
          departureGate: bookingData.portao || '',
          departureTerminal: bookingData.terminal || '',
          arrivalGate: bookingData.portaoChegada || '',
          arrivalTerminal: bookingData.terminalChegada || '',
          delayMinutes: bookingData.atrasado?.toString() || '',
          currentLatitude: bookingData.posicao?.latitude?.toString() || '',
          currentLongitude: bookingData.posicao?.longitude?.toString() || '',
          currentAltitude: bookingData.posicao?.altitude?.toString() || '',
          currentSpeed: bookingData.posicao?.velocidade?.toString() || '',
          currentHeading: bookingData.posicao?.direcao?.toString() || '',
          trackingEnabled: true,
        });
      } else {
        // 📋 DADOS DE RESERVA (busca por localizador)
        console.log('✅ Dados de RESERVA detectados');

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
          aircraft: 'Boeing 737',
          status: convertStatus(bookingData.status),
          checkInStatus: 'AVAILABLE',
          locator: bookingData.localizador || '',
          passengerFirstName: '',
          passengerLastName: bookingData.passageiro || bookingData.sobrenome || '',
          gate: bookingData.portaoEmbarque || '',
          terminal: bookingData.terminal || '',
          seat: bookingData.assento || '',
          ticketClass: bookingData.classe || 'ECONÔMICA',
        });
      }

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

  // Converte status da API de voos reais para o formato do sistema
  const convertFlightApiStatus = (status: string): string => {
    if (!status) return 'SCHEDULED';

    const statusUpper = status.toUpperCase();

    // Mapeamento de status das APIs reais
    const statusMap: { [key: string]: string } = {
      // Status em português
      'EM VOO': 'DEPARTED',
      'EM VÔO': 'DEPARTED',
      'PROGRAMADO': 'SCHEDULED',
      'AGENDADO': 'SCHEDULED',
      'NO HORÁRIO': 'SCHEDULED',
      'ATRASADO': 'DELAYED',
      'CANCELADO': 'CANCELLED',
      'POUSOU': 'ARRIVED',
      'CHEGOU': 'ARRIVED',
      'EMBARCANDO': 'BOARDING',
      'DECOLOU': 'DEPARTED',
      'PARTIU': 'DEPARTED',

      // Status em inglês (das APIs)
      'SCHEDULED': 'SCHEDULED',
      'ACTIVE': 'DEPARTED',
      'EN-ROUTE': 'DEPARTED',
      'IN FLIGHT': 'DEPARTED',
      'LANDED': 'ARRIVED',
      'ARRIVED': 'ARRIVED',
      'DELAYED': 'DELAYED',
      'CANCELLED': 'CANCELLED',
      'BOARDING': 'BOARDING',
      'DEPARTED': 'DEPARTED',
    };

    // Procurar correspondência parcial
    for (const [key, value] of Object.entries(statusMap)) {
      if (statusUpper.includes(key)) {
        return value;
      }
    }

    return 'SCHEDULED';
  };

  // Determina o status de check-in baseado no status do voo
  const determineCheckInStatus = (flightStatus: string): string => {
    if (!flightStatus) return 'NOT_AVAILABLE';

    const statusUpper = flightStatus.toUpperCase();

    if (statusUpper.includes('EMBARCANDO') || statusUpper.includes('BOARDING')) {
      return 'COMPLETED';
    }

    if (statusUpper.includes('EM VOO') || statusUpper.includes('DEPARTED') ||
        statusUpper.includes('CHEGOU') || statusUpper.includes('ARRIVED')) {
      return 'COMPLETED';
    }

    if (statusUpper.includes('PROGRAMADO') || statusUpper.includes('SCHEDULED') ||
        statusUpper.includes('NO HORÁRIO')) {
      return 'AVAILABLE';
    }

    return 'NOT_AVAILABLE';
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
                {formData.locator ? (
                  <>
                    Dados preenchidos automaticamente a partir da reserva <strong>{formData.locator}</strong>
                  </>
                ) : (
                  <>
                    Dados preenchidos automaticamente a partir da <strong>busca de voo</strong>
                  </>
                )}
                <br />
                <span className="text-xs">Revise as informações e ajuste se necessário antes de salvar.</span>
              </p>
            </div>
          )}

          {/* Informações adicionais do voo (se disponíveis) */}
          {bookingData && (bookingData.posicao || bookingData.atrasado || bookingData.horarioPartidaReal) && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-3">
              <div className="font-medium text-blue-900 flex items-center gap-2">
                <span>📊</span>
                Informações Adicionais do Voo
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Horários Atualizados */}
                {(bookingData.horarioPartidaReal || bookingData.horarioPartidaEstimado) && (
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="text-xs text-blue-600 font-medium mb-1">⏰ Horário Partida Atualizado</div>
                    <div className="text-blue-900 font-semibold">
                      {bookingData.horarioPartidaReal || bookingData.horarioPartidaEstimado}
                    </div>
                  </div>
                )}

                {(bookingData.horarioChegadaReal || bookingData.horarioChegadaEstimado) && (
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="text-xs text-blue-600 font-medium mb-1">⏰ Horário Chegada Atualizado</div>
                    <div className="text-blue-900 font-semibold">
                      {bookingData.horarioChegadaReal || bookingData.horarioChegadaEstimado}
                    </div>
                  </div>
                )}

                {/* Portões e Terminais */}
                {bookingData.portao && (
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="text-xs text-blue-600 font-medium mb-1">🚪 Portão Partida</div>
                    <div className="text-blue-900 font-semibold">{bookingData.portao}</div>
                  </div>
                )}

                {bookingData.terminal && (
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="text-xs text-blue-600 font-medium mb-1">🏢 Terminal Partida</div>
                    <div className="text-blue-900 font-semibold">{bookingData.terminal}</div>
                  </div>
                )}

                {bookingData.portaoChegada && (
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="text-xs text-blue-600 font-medium mb-1">🚪 Portão Chegada</div>
                    <div className="text-blue-900 font-semibold">{bookingData.portaoChegada}</div>
                  </div>
                )}

                {bookingData.terminalChegada && (
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="text-xs text-blue-600 font-medium mb-1">🏢 Terminal Chegada</div>
                    <div className="text-blue-900 font-semibold">{bookingData.terminalChegada}</div>
                  </div>
                )}

                {/* Atraso */}
                {bookingData.atrasado !== undefined && bookingData.atrasado > 0 && (
                  <div className="bg-yellow-50 p-2 rounded border border-yellow-200 col-span-2">
                    <div className="text-xs text-yellow-700 font-medium mb-1">⚠️ Atraso</div>
                    <div className="text-yellow-900 font-bold text-lg">{bookingData.atrasado} minutos</div>
                  </div>
                )}

                {/* Localização do Voo */}
                {bookingData.posicao && (
                  <div className="bg-white p-2 rounded border border-blue-100 col-span-2">
                    <div className="text-xs text-blue-600 font-medium mb-2">📍 Localização Atual</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-blue-600">Latitude:</span>{' '}
                        <span className="font-mono text-blue-900">{bookingData.posicao.latitude?.toFixed(4)}°</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Longitude:</span>{' '}
                        <span className="font-mono text-blue-900">{bookingData.posicao.longitude?.toFixed(4)}°</span>
                      </div>
                      {bookingData.posicao.altitude && (
                        <div>
                          <span className="text-blue-600">Altitude:</span>{' '}
                          <span className="font-mono text-blue-900">{bookingData.posicao.altitude.toLocaleString()} pés</span>
                        </div>
                      )}
                      {bookingData.posicao.velocidade && (
                        <div>
                          <span className="text-blue-600">Velocidade:</span>{' '}
                          <span className="font-mono text-blue-900">{bookingData.posicao.velocidade} km/h</span>
                        </div>
                      )}
                      {bookingData.posicao.direcao && (
                        <div>
                          <span className="text-blue-600">Direção:</span>{' '}
                          <span className="font-mono text-blue-900">{bookingData.posicao.direcao}°</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Aeronave */}
                {bookingData.aeronave && (
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="text-xs text-blue-600 font-medium mb-1">✈️ Aeronave</div>
                    <div className="text-blue-900 font-semibold">{bookingData.aeronave}</div>
                  </div>
                )}

                {bookingData.registro && (
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="text-xs text-blue-600 font-medium mb-1">🔖 Registro</div>
                    <div className="text-blue-900 font-mono text-xs">{bookingData.registro}</div>
                  </div>
                )}
              </div>

              {bookingData.ultimaAtualizacao && (
                <div className="text-xs text-blue-500 text-center pt-2 border-t border-blue-200">
                  Última atualização: {new Date(bookingData.ultimaAtualizacao).toLocaleString('pt-BR')}
                </div>
              )}
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

          <div className="flex justify-end gap-2 pt-6 border-t">
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