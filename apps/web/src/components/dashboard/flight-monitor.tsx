'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Badge } from '@reservasegura/ui';
import { Search, RefreshCw, Plane, Play, Pause, Activity } from 'lucide-react';
import { apiService } from '../../lib/api';

interface FlightMonitorProps {
  onFlightFound?: (flightData: any) => void;
}

export function FlightMonitor({ onFlightFound }: FlightMonitorProps) {
  const [flightNumber, setFlightNumber] = useState('');
  const [airportCode, setAirportCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentFlights, setRecentFlights] = useState<any[]>([]);

  // Monitor stats periodically when active
  useEffect(() => {
    if (monitoringActive) {
      const interval = setInterval(async () => {
        try {
          const [statsData, recentData] = await Promise.all([
            apiService.getStats(),
            apiService.getRecentFlights()
          ]);
          setStats(statsData);
          setRecentFlights(recentData);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Erro ao buscar dados de monitoramento:', error);
        }
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [monitoringActive]);

  const handleSearchFlight = async () => {
    if (!flightNumber.trim()) return;

    setIsLoading(true);
    try {
      const result = await apiService.scrapeFlight(flightNumber);
      console.log('Dados do voo encontrados:', result);

      if (onFlightFound) {
        onFlightFound(result);
      }

      // Also get the flight data
      const flightData = await apiService.getFlightData(flightNumber);
      console.log('Detalhes do voo:', flightData);

    } catch (error) {
      console.error('Erro ao buscar voo:', error);
      alert('Erro ao buscar informações do voo. Verifique o número e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchAirport = async () => {
    if (!airportCode.trim()) return;

    setIsLoading(true);
    try {
      const result = await apiService.scrapeAirport(airportCode);
      console.log('Dados do aeroporto encontrados:', result);

      // Get airport flights
      const airportFlights = await apiService.getAirportFlights(airportCode);
      console.log('Voos do aeroporto:', airportFlights);

    } catch (error) {
      console.error('Erro ao buscar aeroporto:', error);
      alert('Erro ao buscar informações do aeroporto. Verifique o código e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMonitoring = async () => {
    setIsLoading(true);
    try {
      if (monitoringActive) {
        await apiService.stopScheduler();
        setMonitoringActive(false);
      } else {
        await apiService.startScheduler();
        setMonitoringActive(true);
        // Initial data fetch
        const [statsData, recentData] = await Promise.all([
          apiService.getStats(),
          apiService.getRecentFlights()
        ]);
        setStats(statsData);
        setRecentFlights(recentData);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Erro ao alterar monitoramento:', error);
      alert('Erro ao alterar status do monitoramento.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'active':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
      case 'inactive':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Voo Específico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flightNumber">Número do Voo</Label>
                <Input
                  id="flightNumber"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                  placeholder="Ex: AD2456, LA3789"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchFlight()}
                />
              </div>
              <Button
                onClick={handleSearchFlight}
                disabled={isLoading || !flightNumber.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar Voo
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Monitorar Aeroporto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="airportCode">Código do Aeroporto</Label>
                <Input
                  id="airportCode"
                  value={airportCode}
                  onChange={(e) => setAirportCode(e.target.value.toUpperCase())}
                  placeholder="Ex: GRU, BSB, CGH"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchAirport()}
                />
              </div>
              <Button
                onClick={handleSearchAirport}
                disabled={isLoading || !airportCode.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plane className="h-4 w-4 mr-2" />
                    Buscar Aeroporto
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monitoring Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Monitoramento Automático
            </span>
            <Badge variant={monitoringActive ? 'success' : 'secondary'}>
              {monitoringActive ? 'ATIVO' : 'INATIVO'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {monitoringActive
                  ? 'O sistema está monitorando voos automaticamente'
                  : 'Clique para iniciar o monitoramento automático de voos'
                }
              </p>
              {lastUpdate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                </p>
              )}
            </div>
            <Button
              onClick={toggleMonitoring}
              disabled={isLoading}
              variant={monitoringActive ? 'destructive' : 'default'}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : monitoringActive ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Parar
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Display */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalRequests || 0}</div>
              <p className="text-xs text-muted-foreground">Total de Requisições</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.successfulScrapes || 0}</div>
              <p className="text-xs text-muted-foreground">Buscas Bem-sucedidas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.failedScrapes || 0}</div>
              <p className="text-xs text-muted-foreground">Falhas nas Buscas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Flights */}
      {recentFlights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Voos Recentes Monitorados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentFlights.slice(0, 5).map((flight, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <span className="font-medium">{flight.flightNumber}</span>
                    <span className="text-muted-foreground ml-2">
                      {flight.origin} → {flight.destination}
                    </span>
                  </div>
                  <Badge variant={getStatusColor(flight.status)}>
                    {flight.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}