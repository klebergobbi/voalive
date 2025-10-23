'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Label } from '@reservasegura/ui';
import { Search, Plane, Loader2 } from 'lucide-react';

interface FlightData {
  numeroVoo: string;
  origem: string;
  destino: string;
  horarioPartida: string;
  horarioChegada: string;
  horarioPartidaReal?: string;
  horarioChegadaReal?: string;
  horarioPartidaEstimado?: string;
  horarioChegadaEstimado?: string;
  dataPartida?: string;
  status: string;
  companhia?: string;
  portao?: string;
  portaoChegada?: string;
  terminal?: string;
  terminalChegada?: string;
  posicao?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    velocidade?: number;
    direcao?: number;
    velocidadeVertical?: number;
  };
  atrasado?: number;
  duracao?: number;
  aeronave?: string;
  registro?: string;
  ultimaAtualizacao?: string;
}

interface FlightSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFlightFound: (flight: FlightData) => void;
}

export function FlightSearchModal({ open, onOpenChange, onFlightFound }: FlightSearchModalProps) {
  const [flightNumber, setFlightNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flightInfo, setFlightInfo] = useState<FlightData | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!flightNumber.trim() || flightNumber.length < 4) {
      setError('Por favor, digite um número de vôo válido (mínimo 4 caracteres)');
      return;
    }

    setLoading(true);
    setError('');
    setFlightInfo(null);

    try {
      console.log('🔍 Buscando vôo real:', flightNumber);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/v1/flight-search/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flightNumber: flightNumber.trim().toUpperCase() }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log('✅ Vôo encontrado:', result.data);
        setFlightInfo(result.data);
        onFlightFound(result.data);

        // Close modal after 1 second to show success
        setTimeout(() => {
          onOpenChange(false);
          setFlightNumber('');
          setFlightInfo(null);
        }, 1500);
      } else {
        setError(result.error || 'Vôo não encontrado. Verifique o número e tente novamente.');
        console.warn('⚠️ Vôo não encontrado:', result);
      }
    } catch (error: any) {
      console.error('❌ Erro na busca:', error);
      setError(`Erro ao buscar vôo: ${error.message || 'Verifique sua conexão'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatFlightNumber = (value: string) => {
    // Remove espaços e converte para maiúsculas
    return value.toUpperCase().replace(/\s/g, '');
  };

  const handleFlightNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatFlightNumber(e.target.value);
    setFlightNumber(formatted);
    setError('');
  };

  const getAirlineFromCode = (flightNum: string): string => {
    const code = flightNum.substring(0, 2).toUpperCase();
    const airlineMap: { [key: string]: string } = {
      'LA': 'LATAM',
      'JJ': 'LATAM',
      'G3': 'GOL',
      'AD': 'AZUL',
      'AV': 'AVIANCA',
      'TP': 'TAP',
      'AF': 'Air France',
      'KL': 'KLM',
      'BA': 'British Airways',
      'AA': 'American Airlines',
      'UA': 'United Airlines',
      'DL': 'Delta',
    };
    return airlineMap[code] || 'Companhia';
  };

  const getAirlineFlag = (flightNum: string): string => {
    const code = flightNum.substring(0, 2).toUpperCase();
    const flagMap: { [key: string]: string } = {
      'LA': '🇧🇷',
      'JJ': '🇧🇷',
      'G3': '🇧🇷',
      'AD': '🇧🇷',
      'AV': '🇨🇴',
      'TP': '🇵🇹',
      'AF': '🇫🇷',
      'KL': '🇳🇱',
      'BA': '🇬🇧',
      'AA': '🇺🇸',
      'UA': '🇺🇸',
      'DL': '🇺🇸',
    };
    return flagMap[code] || '✈️';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-blue-600" />
            Buscar Vôo em Tempo Real
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Digite o número do vôo para buscar informações em tempo real nas APIs de aviação.
          </p>
        </DialogHeader>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flightNumber" className="flex items-center gap-2">
              <span>Número do Vôo</span>
              {flightNumber.length >= 4 && (
                <span className="text-xs text-gray-500">
                  {getAirlineFlag(flightNumber)} {getAirlineFromCode(flightNumber)}
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="flightNumber"
                value={flightNumber}
                onChange={handleFlightNumberChange}
                placeholder="Ex: LA3789, G31234, AD4567"
                required
                minLength={4}
                maxLength={8}
                className="pr-10 font-mono text-lg"
                disabled={loading}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : flightNumber.length >= 4 ? (
                  <Search className="h-4 w-4 text-green-600" />
                ) : (
                  <Search className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 flex items-start gap-1">
              <span>💡</span>
              <span>O número do vôo geralmente tem 2 letras + 3-5 números (ex: LA3789)</span>
            </div>
          </div>

          {/* Success State */}
          {flightInfo && !error && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3 max-h-96 overflow-y-auto">
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <span className="text-xl">✅</span>
                <span>Vôo Encontrado!</span>
              </div>

              {/* Informações Básicas */}
              <div className="text-sm space-y-1.5 border-b border-green-200 pb-3">
                <div className="flex justify-between">
                  <span className="text-green-700 font-medium">Vôo:</span>
                  <span className="font-mono font-bold text-green-900">{flightInfo.numeroVoo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 font-medium">Companhia:</span>
                  <span className="font-medium text-green-900">{flightInfo.companhia || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 font-medium">Rota:</span>
                  <span className="font-medium text-green-900">{flightInfo.origem} → {flightInfo.destino}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700 font-medium">Status:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                    flightInfo.status?.includes('EM VOO') ? 'bg-blue-100 text-blue-800' :
                    flightInfo.status?.includes('ATRASADO') || flightInfo.atrasado ? 'bg-yellow-100 text-yellow-800' :
                    flightInfo.status?.includes('CANCELADO') ? 'bg-red-100 text-red-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {flightInfo.status}
                  </span>
                </div>
              </div>

              {/* Horários */}
              <div className="text-sm space-y-1.5 border-b border-green-200 pb-3">
                <div className="font-medium text-green-700 mb-1">⏰ Horários:</div>
                <div className="flex justify-between">
                  <span className="text-green-700">Partida Programada:</span>
                  <span className="font-medium text-green-900">{flightInfo.horarioPartida || 'N/A'}</span>
                </div>
                {flightInfo.horarioPartidaReal && (
                  <div className="flex justify-between">
                    <span className="text-green-700">Partida Real:</span>
                    <span className="font-medium text-blue-900">{flightInfo.horarioPartidaReal}</span>
                  </div>
                )}
                {flightInfo.horarioPartidaEstimado && !flightInfo.horarioPartidaReal && (
                  <div className="flex justify-between">
                    <span className="text-green-700">Partida Estimada:</span>
                    <span className="font-medium text-orange-900">{flightInfo.horarioPartidaEstimado}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-green-700">Chegada Programada:</span>
                  <span className="font-medium text-green-900">{flightInfo.horarioChegada || 'N/A'}</span>
                </div>
                {flightInfo.horarioChegadaReal && (
                  <div className="flex justify-between">
                    <span className="text-green-700">Chegada Real:</span>
                    <span className="font-medium text-blue-900">{flightInfo.horarioChegadaReal}</span>
                  </div>
                )}
                {flightInfo.horarioChegadaEstimado && !flightInfo.horarioChegadaReal && (
                  <div className="flex justify-between">
                    <span className="text-green-700">Chegada Estimada:</span>
                    <span className="font-medium text-orange-900">{flightInfo.horarioChegadaEstimado}</span>
                  </div>
                )}
              </div>

              {/* Portões e Terminais */}
              {(flightInfo.portao || flightInfo.terminal || flightInfo.portaoChegada || flightInfo.terminalChegada) && (
                <div className="text-sm space-y-1.5 border-b border-green-200 pb-3">
                  <div className="font-medium text-green-700 mb-1">🚪 Portões e Terminais:</div>
                  {flightInfo.terminal && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Terminal Partida:</span>
                      <span className="font-medium text-green-900">{flightInfo.terminal}</span>
                    </div>
                  )}
                  {flightInfo.portao && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Portão Partida:</span>
                      <span className="font-medium text-green-900">{flightInfo.portao}</span>
                    </div>
                  )}
                  {flightInfo.terminalChegada && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Terminal Chegada:</span>
                      <span className="font-medium text-green-900">{flightInfo.terminalChegada}</span>
                    </div>
                  )}
                  {flightInfo.portaoChegada && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Portão Chegada:</span>
                      <span className="font-medium text-green-900">{flightInfo.portaoChegada}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Posição GPS (se em voo) */}
              {flightInfo.posicao && (
                <div className="text-sm space-y-1.5 border-b border-green-200 pb-3">
                  <div className="font-medium text-green-700 mb-1">📍 Posição em Tempo Real:</div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Latitude:</span>
                    <span className="font-mono text-xs text-green-900">{flightInfo.posicao.latitude.toFixed(4)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Longitude:</span>
                    <span className="font-mono text-xs text-green-900">{flightInfo.posicao.longitude.toFixed(4)}°</span>
                  </div>
                  {flightInfo.posicao.altitude && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Altitude:</span>
                      <span className="font-medium text-green-900">{flightInfo.posicao.altitude.toLocaleString()} ft</span>
                    </div>
                  )}
                  {flightInfo.posicao.velocidade && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Velocidade:</span>
                      <span className="font-medium text-green-900">{flightInfo.posicao.velocidade} km/h</span>
                    </div>
                  )}
                  {flightInfo.posicao.direcao && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Direção:</span>
                      <span className="font-medium text-green-900">{flightInfo.posicao.direcao}°</span>
                    </div>
                  )}
                </div>
              )}

              {/* Atrasos */}
              {flightInfo.atrasado !== undefined && flightInfo.atrasado > 0 && (
                <div className="text-sm space-y-1.5 border-b border-green-200 pb-3">
                  <div className="font-medium text-yellow-700 mb-1">⚠️ Atraso:</div>
                  <div className="flex justify-between">
                    <span className="text-yellow-700">Tempo de Atraso:</span>
                    <span className="font-bold text-yellow-900">{flightInfo.atrasado} minutos</span>
                  </div>
                </div>
              )}

              {/* Aeronave */}
              {(flightInfo.aeronave || flightInfo.registro) && (
                <div className="text-sm space-y-1.5">
                  <div className="font-medium text-green-700 mb-1">✈️ Aeronave:</div>
                  {flightInfo.aeronave && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Tipo:</span>
                      <span className="font-medium text-green-900">{flightInfo.aeronave}</span>
                    </div>
                  )}
                  {flightInfo.registro && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Registro:</span>
                      <span className="font-mono text-xs text-green-900">{flightInfo.registro}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <span>❌</span>
                {error}
              </p>
              <p className="text-xs text-red-500 mt-2">
                Dica: Verifique se o vôo está operando hoje. Alguns vôos só operam em dias específicos.
              </p>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-gray-500 flex flex-col gap-1">
              <span className="font-medium">✈️ Suporta:</span>
              <span>🇧🇷 GOL • LATAM • Azul</span>
              <span>🌎 +200 companhias aéreas</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  setFlightNumber('');
                  setError('');
                  setFlightInfo(null);
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={flightNumber.length < 4 || loading}
                className="min-w-24"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Buscar
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>

        <div className="pt-2 border-t">
          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex items-center gap-1">
              <span>🔍</span>
              <span>Busca em tempo real via AirLabs e Aviationstack</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🌐</span>
              <span>Dados atualizados a cada 30-60 segundos</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
