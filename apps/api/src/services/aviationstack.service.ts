import axios from 'axios';

/**
 * Aviationstack API Service
 * Provides real-time flight status and aviation data
 * Docs: https://aviationstack.com/documentation
 */

export interface AviationstackFlightData {
  flight_date: string;
  flight_status: string;
  departure: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal: string;
    gate: string;
    delay: number;
    scheduled: string;
    estimated: string;
    actual: string;
    estimated_runway: string;
    actual_runway: string;
  };
  arrival: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal: string;
    gate: string;
    baggage: string;
    delay: number;
    scheduled: string;
    estimated: string;
    actual: string;
    estimated_runway: string;
    actual_runway: string;
  };
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  flight: {
    number: string;
    iata: string;
    icao: string;
    codeshared: any;
  };
  aircraft: {
    registration: string;
    iata: string;
    icao: string;
    icao24: string;
  };
  live: {
    updated: string;
    latitude: number;
    longitude: number;
    altitude: number;
    direction: number;
    speed_horizontal: number;
    speed_vertical: number;
    is_ground: boolean;
  };
}

export class AviationstackService {
  private apiKey: string;
  private baseUrl = 'http://api.aviationstack.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.AVIATIONSTACK_API_KEY || '';

    if (!this.apiKey) {
      console.warn('⚠️ Aviationstack API key não configurada. Configure AVIATIONSTACK_API_KEY no .env');
    }
  }

  /**
   * Busca voos em tempo real
   */
  async getFlights(params?: {
    flight_iata?: string;
    flight_icao?: string;
    flight_number?: string;
    airline_name?: string;
    airline_iata?: string;
    dep_iata?: string;
    arr_iata?: string;
    flight_date?: string;
    limit?: number;
  }): Promise<AviationstackFlightData[]> {
    try {
      console.log(`🔍 [Aviationstack] Buscando voos...`, params);

      const response = await axios.get(`${this.baseUrl}/flights`, {
        params: {
          access_key: this.apiKey,
          limit: params?.limit || 10,
          ...params
        },
        timeout: 15000
      });

      if (response.data && response.data.data) {
        const flights = response.data.data;
        console.log(`✅ [Aviationstack] ${flights.length} voos encontrados`);
        return flights;
      }

      return [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`❌ [Aviationstack] Erro HTTP: ${error.response?.status} - ${error.message}`);
        if (error.response?.data) {
          console.error('Detalhes:', error.response.data);
        }
      } else {
        console.error(`❌ [Aviationstack] Erro ao buscar voos:`, error);
      }
      return [];
    }
  }

  /**
   * Busca voo específico por número
   */
  async getFlightByNumber(flightNumber: string, date?: string): Promise<AviationstackFlightData | null> {
    try {
      console.log(`🔍 [Aviationstack] Buscando voo: ${flightNumber}`);

      // IMPORTANTE: Plano gratuito da AviationStack não aceita flight_date
      // Remover esse parâmetro para evitar erro 403
      const flights = await this.getFlights({
        flight_iata: flightNumber,
        limit: 1
      });

      if (flights.length > 0) {
        console.log(`✅ [Aviationstack] Voo encontrado: ${flightNumber}`);
        return flights[0];
      }

      console.log(`❌ [Aviationstack] Voo não encontrado: ${flightNumber}`);
      return null;
    } catch (error) {
      console.error(`❌ [Aviationstack] Erro ao buscar voo:`, error);
      return null;
    }
  }

  /**
   * Busca voos por aeroporto (partidas ou chegadas)
   */
  async getAirportFlights(airportCode: string, type: 'departures' | 'arrivals' = 'departures', limit: number = 20): Promise<AviationstackFlightData[]> {
    try {
      console.log(`🔍 [Aviationstack] Buscando ${type} do aeroporto: ${airportCode}`);
      console.log(`⚠️  [Aviationstack] AVISO: Plano gratuito não suporta filtro por aeroporto. Retornando vazio.`);

      // Plano gratuito não suporta dep_iata nem arr_iata
      return [];
    } catch (error) {
      console.error(`❌ [Aviationstack] Erro ao buscar voos do aeroporto:`, error);
      return [];
    }
  }

  /**
   * Busca voos por rota
   */
  async getFlightsByRoute(origin: string, destination: string, date?: string): Promise<AviationstackFlightData[]> {
    try {
      console.log(`🔍 [Aviationstack] Buscando voos: ${origin} → ${destination}`);
      console.log(`⚠️  [Aviationstack] AVISO: Plano gratuito não suporta filtro por rota. Retornando vazio.`);

      // Plano gratuito não suporta dep_iata, arr_iata nem flight_date
      return [];
    } catch (error) {
      console.error(`❌ [Aviationstack] Erro ao buscar voos por rota:`, error);
      return [];
    }
  }

  /**
   * Busca voos de uma companhia aérea específica
   */
  async getAirlineFlights(airlineIata: string, limit: number = 20): Promise<AviationstackFlightData[]> {
    try {
      console.log(`🔍 [Aviationstack] Buscando voos da companhia: ${airlineIata}`);

      const flights = await this.getFlights({
        airline_iata: airlineIata,
        limit
      });

      console.log(`✅ [Aviationstack] ${flights.length} voos encontrados`);
      return flights;
    } catch (error) {
      console.error(`❌ [Aviationstack] Erro ao buscar voos da companhia:`, error);
      return [];
    }
  }

  /**
   * Converte dados do Aviationstack para formato padrão
   */
  convertToStandardFormat(flight: AviationstackFlightData): any {
    return {
      flightNumber: flight.flight.iata,
      flightIcao: flight.flight.icao,
      airline: flight.airline.iata,
      airlineIcao: flight.airline.icao,
      airlineName: flight.airline.name,
      origin: flight.departure.iata,
      originIcao: flight.departure.icao,
      destination: flight.arrival.iata,
      destinationIcao: flight.arrival.icao,

      // Departure info
      departureTime: flight.departure.scheduled,
      departureTimeUtc: flight.departure.scheduled,
      actualDeparture: flight.departure.actual,
      estimatedDeparture: flight.departure.estimated,
      departureDelay: flight.departure.delay,
      departureTerminal: flight.departure.terminal,
      departureGate: flight.departure.gate,

      // Arrival info
      arrivalTime: flight.arrival.scheduled,
      arrivalTimeUtc: flight.arrival.scheduled,
      actualArrival: flight.arrival.actual,
      estimatedArrival: flight.arrival.estimated,
      arrivalDelay: flight.arrival.delay,
      arrivalTerminal: flight.arrival.terminal,
      arrivalGate: flight.arrival.gate,
      baggage: flight.arrival.baggage,

      // Flight status
      status: this.normalizeStatus(flight.flight_status),
      flightDate: flight.flight_date,

      // Aircraft info
      aircraft: flight.aircraft?.iata,
      aircraftIcao: flight.aircraft?.icao,
      registration: flight.aircraft?.registration,

      // Live tracking data
      position: flight.live ? {
        latitude: flight.live.latitude,
        longitude: flight.live.longitude,
        altitude: flight.live.altitude,
        direction: flight.live.direction,
        speed: flight.live.speed_horizontal,
        verticalSpeed: flight.live.speed_vertical,
        isGround: flight.live.is_ground,
        updated: flight.live.updated
      } : undefined,

      source: 'Aviationstack'
    };
  }

  /**
   * Normaliza status do voo
   */
  private normalizeStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'scheduled': 'AGENDADO',
      'active': 'EM VOO',
      'landed': 'ATERRISSOU',
      'cancelled': 'CANCELADO',
      'incident': 'INCIDENTE',
      'diverted': 'DESVIADO',
      'redirected': 'REDIRECIONADO'
    };

    return statusMap[status.toLowerCase()] || status.toUpperCase();
  }

  /**
   * Verifica se a API está configurada
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Singleton
let aviationstackService: AviationstackService;

export function getAviationstackService(): AviationstackService {
  if (!aviationstackService) {
    aviationstackService = new AviationstackService();
  }
  return aviationstackService;
}
