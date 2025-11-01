'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@reservasegura/ui';
import { Plane, RefreshCw, Filter, MapPin, Clock, Navigation } from 'lucide-react';
import { apiService } from '../../lib/api';

interface LiveFlight {
  flight_icao?: string;
  flight_iata?: string;
  airline_icao?: string;
  airline_iata?: string;
  dep_iata?: string;
  arr_iata?: string;
  lat?: number;
  lng?: number;
  alt?: number;
  speed?: number;
  dir?: number;
  status?: string;
  updated?: number;
  aircraft_icao?: string;
  flag?: string;
  [key: string]: any;
}

export default function LiveFlightsPage() {
  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filterAirline, setFilterAirline] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadLiveFlights();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoRefresh) {
      interval = setInterval(() => {
        refreshFlights();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadLiveFlights = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await apiService.searchLiveFlights();

      if (response.success && response.data) {
        setFlights(response.data);
        setLastUpdate(new Date());
      } else {
        setError('Não foi possível carregar voos ao vivo');
      }
    } catch (error: any) {
      console.error('Error loading live flights:', error);
      setError(error.message || 'Erro ao carregar voos');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFlights = async () => {
    try {
      setIsRefreshing(true);
      setError('');

      const response = await apiService.searchLiveFlights(filterAirline ? { airline: filterAirline } : undefined);

      if (response.success && response.data) {
        setFlights(response.data);
        setLastUpdate(new Date());
      }
    } catch (error: any) {
      console.error('Error refreshing flights:', error);
      setError(error.message || 'Erro ao atualizar voos');
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredFlights = flights.filter(flight => {
    if (!filterAirline) return true;
    return (
      flight.airline_iata?.toLowerCase().includes(filterAirline.toLowerCase()) ||
      flight.airline_icao?.toLowerCase().includes(filterAirline.toLowerCase())
    );
  });

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';

    switch (status.toLowerCase()) {
      case 'en-route':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'landed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSpeed = (speed?: number) => {
    if (!speed) return 'N/A';
    return `${Math.round(speed)} km/h`;
  };

  const formatAltitude = (alt?: number) => {
    if (!alt) return 'N/A';
    return `${Math.round(alt)} m`;
  };

  const formatDirection = (dir?: number) => {
    if (!dir) return 'N/A';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(dir / 45) % 8;
    return `${directions[index]} (${dir}°)`;
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Nunca';

    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

    if (diff < 60) return `${diff}s atrás`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
    return lastUpdate.toLocaleTimeString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-lg">Carregando voos ao vivo...</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Plane className="h-6 w-6" />
                Voos ao Vivo
              </h1>
              <p className="text-muted-foreground">Rastreamento em tempo real de voos no ar</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600">
                <Clock className="h-4 w-4 inline mr-1" />
                Atualizado: {formatLastUpdate()}
              </div>

              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  autoRefresh
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </button>

              <button
                onClick={refreshFlights}
                disabled={isRefreshing}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                title="Atualizar agora"
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Total de Voos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredFlights.length}</div>
              <p className="text-xs text-muted-foreground">Voos rastreados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Em Voo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {filteredFlights.filter(f => f.status?.toLowerCase() === 'en-route' || f.status?.toLowerCase() === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">Voando agora</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Agendados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {filteredFlights.filter(f => f.status?.toLowerCase() === 'scheduled').length}
              </div>
              <p className="text-xs text-muted-foreground">Aguardando decolagem</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Pousados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {filteredFlights.filter(f => f.status?.toLowerCase() === 'landed').length}
              </div>
              <p className="text-xs text-muted-foreground">Já no solo</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrar por companhia (ex: LATAM, GOL, AZUL)..."
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filterAirline}
              onChange={(e) => setFilterAirline(e.target.value)}
            />
            {filterAirline && (
              <button
                onClick={() => setFilterAirline('')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Flights Grid */}
        {filteredFlights.length === 0 && !isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum voo ao vivo disponível no momento</p>
                <p className="text-sm">Tente novamente em alguns instantes</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFlights.map((flight, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-lg">
                        {flight.flight_iata || flight.flight_icao || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {flight.airline_iata || flight.airline_icao || 'Companhia N/A'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(flight.status)}`}>
                      {flight.status || 'Unknown'}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-2 mb-3 py-3 border-y">
                    <div className="flex-1 text-center">
                      <p className="text-xs text-gray-600">Origem</p>
                      <p className="font-semibold text-lg">{flight.dep_iata || 'N/A'}</p>
                    </div>
                    <div className="text-gray-400">
                      <Plane className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-xs text-gray-600">Destino</p>
                      <p className="font-semibold text-lg">{flight.arr_iata || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Flight Details */}
                  <div className="space-y-2 text-sm">
                    {flight.lat && flight.lng && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Posição:</span>
                        <span className="font-mono">
                          {flight.lat.toFixed(4)}, {flight.lng.toFixed(4)}
                        </span>
                      </div>
                    )}

                    {flight.alt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Altitude:</span>
                        <span className="font-semibold">{formatAltitude(flight.alt)}</span>
                      </div>
                    )}

                    {flight.speed && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Velocidade:</span>
                        <span className="font-semibold">{formatSpeed(flight.speed)}</span>
                      </div>
                    )}

                    {flight.dir !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Direção:</span>
                        <span className="font-semibold">{formatDirection(flight.dir)}</span>
                      </div>
                    )}

                    {flight.aircraft_icao && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Aeronave:</span>
                        <span className="font-semibold">{flight.aircraft_icao}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
