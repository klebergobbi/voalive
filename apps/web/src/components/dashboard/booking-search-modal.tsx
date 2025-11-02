'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Label } from '@reservasegura/ui';

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
  // Campos extras de voo real (busca por número de voo)
  horarioPartidaReal?: string;
  horarioPartidaEstimado?: string;
  horarioChegadaReal?: string;
  horarioChegadaEstimado?: string;
  portao?: string;
  portaoChegada?: string;
  terminalChegada?: string;
  atrasado?: number;
  posicao?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    velocidade?: number;
    direcao?: number;
  };
  aeronave?: string;
  registro?: string;
  ultimaAtualizacao?: string;
}

interface BookingSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingFound: (booking: BookingData) => void;
}

export function BookingSearchModal({ open, onOpenChange, onBookingFound }: BookingSearchModalProps) {
  const [numeroVoo, setNumeroVoo] = useState('');
  const [localizador, setLocalizador] = useState('');
  const [ultimoNome, setUltimoNome] = useState('');
  const [origem, setOrigem] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isGol = (): boolean => {
    if (numeroVoo.trim()) {
      return numeroVoo.trim().toUpperCase().startsWith('G3');
    }
    const loc = localizador.trim().toUpperCase();
    return loc.startsWith('G3') || loc.length === 6; // GOL usa localizadores de 6 caracteres
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // Se tem número de voo, busca por voo
    if (numeroVoo.trim()) {
      await handleFlightSearch();
    } else {
      // Senão, busca por reserva (comportamento antigo)
      await handleBookingSearch();
    }
  };

  const handleFlightSearch = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Buscando voo:', numeroVoo);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/v1/flight-search/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flightNumber: numeroVoo.trim().toUpperCase()
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log('✅ Voo encontrado:', result.data);

        // Converter dados do voo para formato de reserva (COM TODOS OS CAMPOS EXTRAS)
        const bookingData: BookingData = {
          numeroVoo: result.data.numeroVoo || numeroVoo.trim().toUpperCase(),
          origem: result.data.origem || '',
          destino: result.data.destino || '',
          dataPartida: result.data.dataPartida || new Date().toISOString().split('T')[0],
          dataChegada: result.data.dataPartida || new Date().toISOString().split('T')[0],
          horarioPartida: result.data.horarioPartida || '',
          horarioChegada: result.data.horarioChegada || '',
          companhia: (result.data.companhia?.toUpperCase().includes('GOL') ? 'GOL' :
                     result.data.companhia?.toUpperCase().includes('LATAM') ? 'LATAM' :
                     result.data.companhia?.toUpperCase().includes('AZUL') ? 'AZUL' : 'GOL') as any,
          status: result.data.status || 'AGENDADO',
          localizador: localizador.trim().toUpperCase() || '',
          sobrenome: ultimoNome.trim().toUpperCase() || '',
          portaoEmbarque: result.data.portao || undefined,
          terminal: result.data.terminal || undefined,
          classe: 'ECONOMICA',
          passageiro: ultimoNome.trim().toUpperCase() || 'PASSAGEIRO',

          // ✈️ CAMPOS EXTRAS DE VOO REAL (necessários para exibir seção de monitoramento)
          horarioPartidaReal: result.data.horarioPartidaReal || undefined,
          horarioPartidaEstimado: result.data.horarioPartidaEstimado || undefined,
          horarioChegadaReal: result.data.horarioChegadaReal || undefined,
          horarioChegadaEstimado: result.data.horarioChegadaEstimado || undefined,
          portao: result.data.portao || undefined,
          portaoChegada: result.data.portaoChegada || undefined,
          terminalChegada: result.data.terminalChegada || undefined,
          atrasado: result.data.atrasado || undefined,
          posicao: result.data.posicao || undefined,
          aeronave: result.data.aeronave || undefined,
          registro: result.data.registro || undefined,
          ultimaAtualizacao: result.data.ultimaAtualizacao || new Date().toISOString()
        };

        console.log('📦 BookingData criado com campos extras:', {
          posicao: bookingData.posicao ? '✅ SIM' : '❌ NÃO',
          horarioPartidaReal: bookingData.horarioPartidaReal || 'N/A',
          horarioPartidaEstimado: bookingData.horarioPartidaEstimado || 'N/A',
          portao: bookingData.portao || 'N/A',
          terminal: bookingData.terminal || 'N/A',
          atrasado: bookingData.atrasado || 0
        });

        onBookingFound(bookingData);
        onOpenChange(false);

        // Limpar campos
        setNumeroVoo('');
        setLocalizador('');
        setUltimoNome('');
        setOrigem('');
      } else {
        setError(result.message || result.error || 'Voo não encontrado. Verifique o número e tente novamente.');

        // Mostrar sugestões se disponíveis
        if (result.suggestions && result.suggestions.length > 0) {
          console.log('💡 Sugestões:', result.suggestions);
        }
      }
    } catch (error) {
      console.error('❌ Erro na busca de voo:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSearch = async () => {
    // Validação específica para GOL
    if (isGol()) {
      if (!ultimoNome.trim()) {
        setError('Para reservas GOL, o Último Nome é obrigatório');
        return;
      }
      if (!origem.trim() || origem.trim().length !== 3) {
        setError('Para reservas GOL, a Origem (código IATA de 3 letras) é obrigatória');
        return;
      }
    }

    if (!localizador.trim()) {
      setError('Informe o Localizador ou o Número do Vôo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔍 Buscando reserva:', {
        localizador,
        ultimoNome: ultimoNome || '[não informado]',
        origem: origem || '[não informado]'
      });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/v2/external-booking/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          localizador: localizador.trim().toUpperCase(),
          sobrenome: ultimoNome.trim().toUpperCase() || '',
          origem: origem.trim().toUpperCase() || ''
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log('✅ Reserva encontrada no banco local:', result.data);

        // Converter formato da API v2 para o formato esperado pelo componente
        const bookingData: BookingData = {
          localizador: result.data.bookingCode,
          sobrenome: result.data.lastName,
          passageiro: result.data.passengerName || result.data.fullName,
          numeroVoo: result.data.flightNumber,
          origem: result.data.origin,
          destino: result.data.destination,
          dataPartida: result.data.departureDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          dataChegada: result.data.arrivalDate?.split('T')[0] || result.data.departureDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          horarioPartida: result.data.departureDate?.split('T')[1]?.substring(0, 5) || '',
          horarioChegada: result.data.arrivalDate?.split('T')[1]?.substring(0, 5) || '',
          companhia: (result.data.airline?.toUpperCase().includes('GOL') ? 'GOL' :
                     result.data.airline?.toUpperCase().includes('LATAM') ? 'LATAM' :
                     result.data.airline?.toUpperCase().includes('AZUL') ? 'AZUL' : 'GOL') as any,
          status: result.data.status || result.data.bookingStatus || 'CONFIRMED',
          portaoEmbarque: result.data.gate,
          terminal: result.data.terminal,
          assento: result.data.seat,
          classe: result.data.class || 'ECONOMICA'
        };

        onBookingFound(bookingData);
        onOpenChange(false);
        setNumeroVoo('');
        setLocalizador('');
        setUltimoNome('');
        setOrigem('');
      } else {
        // Reserva NÃO encontrada no banco local
        // Vamos buscar nas APIs externas de companhias aéreas
        console.log('❌ Reserva não encontrada no banco local. Buscando nas APIs externas...');

        try {
          // Tentar buscar na API antiga (companhias aéreas)
          const airlineResponse = await fetch(`${apiUrl}/api/v1/airline-booking/search-booking`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              localizador: localizador.trim().toUpperCase(),
              sobrenome: ultimoNome.trim().toUpperCase() || '',
              origem: origem.trim().toUpperCase() || ''
            }),
          });

          const airlineResult = await airlineResponse.json();

          if (airlineResult.success && airlineResult.data) {
            console.log('✅ Reserva encontrada na API externa:', airlineResult.data);

            // AUTO-CADASTRAR a reserva encontrada na API externa
            console.log('💾 AUTO-CADASTRANDO reserva no banco local...');

            const registerPayload = {
              bookingCode: airlineResult.data.localizador || localizador.trim().toUpperCase(),
              lastName: airlineResult.data.sobrenome || ultimoNome.trim().toUpperCase(),
              firstName: airlineResult.data.passageiro?.split(' ')[0] || '',
              fullName: airlineResult.data.passageiro || `${ultimoNome.trim().toUpperCase()}`,
              airline: airlineResult.data.companhia || 'GOL',
              flightNumber: airlineResult.data.numeroVoo || '',
              origin: airlineResult.data.origem || origem.trim().toUpperCase(),
              destination: airlineResult.data.destino || '',
              departureDate: airlineResult.data.dataPartida ? new Date(airlineResult.data.dataPartida).toISOString() : new Date().toISOString(),
              arrivalDate: airlineResult.data.dataChegada ? new Date(airlineResult.data.dataChegada).toISOString() : undefined,
              seat: airlineResult.data.assento,
              class: airlineResult.data.classe || 'ECONOMICA',
              gate: airlineResult.data.portaoEmbarque,
              terminal: airlineResult.data.terminal,
              checkInStatus: 'PENDING',
              bookingStatus: airlineResult.data.status || 'CONFIRMED',
              source: 'AIRLINE_API'
            };

            // Cadastrar automaticamente
            await fetch(`${apiUrl}/api/v2/external-booking/register`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(registerPayload),
            });

            console.log('✅ Reserva AUTO-CADASTRADA com sucesso!');

            // Passar dados para o componente pai
            onBookingFound(airlineResult.data);
            onOpenChange(false);
            setNumeroVoo('');
            setLocalizador('');
            setUltimoNome('');
            setOrigem('');
          } else {
            setError(result.message || result.error || 'Reserva não encontrada. Verifique os dados e tente novamente.');

            // Mostrar instruções se disponíveis
            if (result.instructions && result.instructions.length > 0) {
              console.log('💡 Instruções:', result.instructions);
            }
          }
        } catch (externalError) {
          console.error('❌ Erro ao buscar na API externa:', externalError);
          setError(result.message || result.error || 'Reserva não encontrada.');
        }
      }
    } catch (error) {
      console.error('❌ Erro na busca:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">✈️</span>
            Buscar Reserva
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSearch} className="space-y-4">
          {/* NOVO CAMPO: Número do Vôo */}
          <div className="space-y-2">
            <Label htmlFor="numeroVoo" className="flex items-center gap-2">
              <span>✈️</span>
              <span>Número do Vôo (Recomendado)</span>
            </Label>
            <Input
              id="numeroVoo"
              value={numeroVoo}
              onChange={(e) => {
                setNumeroVoo(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Ex: G31890, LA3789, AD4506"
              minLength={4}
              maxLength={8}
              className="text-lg font-mono"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              💡 Para busca mais rápida e precisa, informe o número do vôo
            </p>
          </div>

          {/* Separador visual */}
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t"></div>
            <span className="text-xs text-gray-400 uppercase">ou use o localizador</span>
            <div className="flex-1 border-t"></div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="localizador">
              Localizador {!numeroVoo.trim() && isGol() && <span className="text-red-600">*</span>}
            </Label>
            <Input
              id="localizador"
              value={localizador}
              onChange={(e) => {
                setLocalizador(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Ex: ABC123, PDCDX"
              minLength={5}
              maxLength={8}
              className="text-lg font-mono"
              required={!numeroVoo.trim()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ultimoNome">
              Último Nome {!numeroVoo.trim() && isGol() && <span className="text-red-600">*</span>}
            </Label>
            <Input
              id="ultimoNome"
              value={ultimoNome}
              onChange={(e) => {
                setUltimoNome(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Ex: SILVA"
              className="font-mono"
              required={!numeroVoo.trim() && isGol()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="origem">
              Origem (IATA) {!numeroVoo.trim() && isGol() && <span className="text-red-600">*</span>}
            </Label>
            <Input
              id="origem"
              value={origem}
              onChange={(e) => {
                setOrigem(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Ex: GRU, CGH, SDU, SLZ"
              maxLength={3}
              className="font-mono"
              required={!numeroVoo.trim() && isGol()}
            />
          </div>

          {/* Avisos */}
          {numeroVoo.trim() && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>✈️ Busca por Vôo:</strong> Usando APIs de rastreamento em tempo real (Aviationstack).
              </p>
            </div>
          )}

          {!numeroVoo.trim() && isGol() && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Reservas GOL:</strong> É necessário informar o Localizador, Último Nome e Origem.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <span>❌</span>
                {error}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setNumeroVoo('');
                setLocalizador('');
                setUltimoNome('');
                setOrigem('');
                setError('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={(numeroVoo.trim().length < 4 && localizador.trim().length < 5) || loading}
              className="min-w-24"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Buscando...
                </div>
              ) : (
                'Buscar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
