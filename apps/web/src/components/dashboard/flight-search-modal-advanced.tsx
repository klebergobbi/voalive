'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Label } from '@reservasegura/ui';
import { Search, Plane, Loader2, MapPin, Route, Globe } from 'lucide-react';
import { apiService } from '../../lib/api';

interface FlightData {
  numeroVoo: string;
  origem: string;
  destino: string;
  horarioPartida: string;
  horarioChegada: string;
  status: string;
  companhia?: string;
  aeronave?: string;
  [key: string]: any;
}

interface FlightSearchModalAdvancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFlightFound?: (flight: FlightData) => void;
}

type SearchTab = 'number' | 'airport' | 'route';

export function FlightSearchModalAdvanced({ open, onOpenChange, onFlightFound }: FlightSearchModalAdvancedProps) {
  const [activeTab, setActiveTab] = useState<SearchTab>('number');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<FlightData[]>([]);

  // Search by number states
  const [flightNumber, setFlightNumber] = useState('');

  // Search by airport states
  const [airportCode, setAirportCode] = useState('');
  const [airportType, setAirportType] = useState<'departures' | 'arrivals'>('departures');

  // Search by route states
  const [originCode, setOriginCode] = useState('');
  const [destinationCode, setDestinationCode] = useState('');
  const [routeDate, setRouteDate] = useState('');

  const resetSearch = () => {
    setError('');
    setResults([]);
    setFlightNumber('');
    setAirportCode('');
    setOriginCode('');
    setDestinationCode('');
    setRouteDate('');
  };

  const handleSearchByNumber = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!flightNumber.trim() || flightNumber.length < 4) {
      setError('Digite um número de voo válido (mínimo 4 caracteres)');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await apiService.searchRealFlight(flightNumber.toUpperCase().trim());

      if (response.success && response.data) {
        setResults([response.data]);

        if (onFlightFound) {
          onFlightFound(response.data);
        }
      } else {
        setError(response.error || 'Voo não encontrado');
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao buscar voo');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByAirport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!airportCode.trim() || airportCode.length !== 3) {
      setError('Digite um código de aeroporto válido (3 letras, ex: GRU, BSB, CGH)');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await apiService.searchFlightsByAirport(airportCode.toUpperCase().trim(), airportType);

      if (response.success && response.data && response.data.length > 0) {
        setResults(response.data);
      } else {
        setError(`Nenhum voo ${airportType === 'departures' ? 'partindo' : 'chegando'} encontrado para ${airportCode.toUpperCase()}`);
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao buscar voos do aeroporto');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByRoute = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!originCode.trim() || originCode.length !== 3) {
      setError('Digite um código de origem válido (3 letras)');
      return;
    }

    if (!destinationCode.trim() || destinationCode.length !== 3) {
      setError('Digite um código de destino válido (3 letras)');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await apiService.searchFlightsByRoute(
        originCode.toUpperCase().trim(),
        destinationCode.toUpperCase().trim(),
        routeDate || undefined
      );

      if (response.success && response.data && response.data.length > 0) {
        setResults(response.data);
      } else {
        setError(`Nenhum voo encontrado para ${originCode.toUpperCase()} → ${destinationCode.toUpperCase()}`);
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao buscar voos da rota');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFlight = (flight: FlightData) => {
    if (onFlightFound) {
      onFlightFound(flight);
    }
    onOpenChange(false);
    resetSearch();
  };

  const renderSearchByNumber = () => (
    <form onSubmit={handleSearchByNumber} className="space-y-4">
      <div>
        <Label htmlFor="flightNumber">Número do Voo</Label>
        <div className="relative">
          <Plane className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="flightNumber"
            type="text"
            placeholder="Ex: LA3789, G31234, AD4010"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
            className="pl-10"
            disabled={loading}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Digite o código da companhia + número (ex: LA3789 para LATAM)</p>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Buscando...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Buscar Voo
          </>
        )}
      </Button>
    </form>
  );

  const renderSearchByAirport = () => (
    <form onSubmit={handleSearchByAirport} className="space-y-4">
      <div>
        <Label htmlFor="airportCode">Código do Aeroporto (IATA)</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="airportCode"
            type="text"
            placeholder="Ex: GRU, CGH, BSB, SDU, GIG"
            value={airportCode}
            onChange={(e) => setAirportCode(e.target.value.toUpperCase())}
            maxLength={3}
            className="pl-10 uppercase"
            disabled={loading}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          GRU - Guarulhos, CGH - Congonhas, BSB - Brasília, SDU - Santos Dumont, GIG - Galeão
        </p>
      </div>

      <div>
        <Label>Tipo de Busca</Label>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => setAirportType('departures')}
            className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
              airportType === 'departures'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Partidas
          </button>
          <button
            type="button"
            onClick={() => setAirportType('arrivals')}
            className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
              airportType === 'arrivals'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Chegadas
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Buscando...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Buscar Voos do Aeroporto
          </>
        )}
      </Button>
    </form>
  );

  const renderSearchByRoute = () => (
    <form onSubmit={handleSearchByRoute} className="space-y-4">
      <div>
        <Label htmlFor="originCode">Aeroporto de Origem (IATA)</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="originCode"
            type="text"
            placeholder="Ex: GRU, CGH, BSB"
            value={originCode}
            onChange={(e) => setOriginCode(e.target.value.toUpperCase())}
            maxLength={3}
            className="pl-10 uppercase"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="destinationCode">Aeroporto de Destino (IATA)</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="destinationCode"
            type="text"
            placeholder="Ex: BSB, SDU, GIG"
            value={destinationCode}
            onChange={(e) => setDestinationCode(e.target.value.toUpperCase())}
            maxLength={3}
            className="pl-10 uppercase"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="routeDate">Data (Opcional)</Label>
        <Input
          id="routeDate"
          type="date"
          value={routeDate}
          onChange={(e) => setRouteDate(e.target.value)}
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">Deixe em branco para voos de hoje</p>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Buscando...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Buscar Voos da Rota
          </>
        )}
      </Button>
    </form>
  );

  const renderResults = () => {
    if (results.length === 0) return null;

    return (
      <div className="mt-6 space-y-3">
        <h3 className="font-semibold text-sm text-gray-700">
          {results.length} voo{results.length > 1 ? 's' : ''} encontrado{results.length > 1 ? 's' : ''}
        </h3>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {results.map((flight, index) => (
            <div
              key={index}
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleSelectFlight(flight)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-lg">{flight.numeroVoo}</p>
                  <p className="text-sm text-gray-600">{flight.companhia || 'Companhia não informada'}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  flight.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                  flight.status === 'DELAYED' ? 'bg-yellow-100 text-yellow-800' :
                  flight.status === 'DEPARTED' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {flight.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex-1">
                  <p className="text-gray-600">Origem</p>
                  <p className="font-semibold">{flight.origem}</p>
                  <p className="text-xs text-gray-500">{flight.horarioPartida}</p>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex-1">
                  <p className="text-gray-600">Destino</p>
                  <p className="font-semibold">{flight.destino}</p>
                  <p className="text-xs text-gray-500">{flight.horarioChegada}</p>
                </div>
              </div>

              {flight.aeronave && (
                <p className="text-xs text-gray-500 mt-2">Aeronave: {flight.aeronave}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Busca Avançada de Voos</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b mb-4">
          <button
            type="button"
            onClick={() => { setActiveTab('number'); resetSearch(); }}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'number'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Plane className="h-4 w-4" />
            Por Número
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('airport'); resetSearch(); }}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'airport'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Por Aeroporto
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('route'); resetSearch(); }}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'route'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Route className="h-4 w-4" />
            Por Rota
          </button>
        </div>

        {/* Search Forms */}
        <div className="space-y-4">
          {activeTab === 'number' && renderSearchByNumber()}
          {activeTab === 'airport' && renderSearchByAirport()}
          {activeTab === 'route' && renderSearchByRoute()}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Results */}
          {renderResults()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
