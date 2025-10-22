import axios from 'axios';

/**
 * AirLabs API Service
 * Provides real-time flight tracking and aviation data
 * Docs: https://airlabs.co/docs/
 */

export interface AirLabsFlightData {
  flight_iata: string;
  flight_icao: string;
  flight_number: string;
  airline_iata: string;
  airline_icao: string;
  dep_iata: string;
  dep_icao: string;
  arr_iata: string;
  arr_icao: string;
  dep_time: string;
  arr_time: string;
  dep_time_utc: string;
  arr_time_utc: string;
  status: string;
  duration: number;
  delayed: number;
  dep_actual: string;
  arr_actual: string;
  aircraft_icao: string;
  reg_number: string;
  updated: string;
  lat: number;
  lng: number;
  alt: number;
  dir: number;
  speed: number;
  v_speed: number;
  squawk: string;
  flight_date: string;
  airline_name?: string;
  dep_city?: string;
  arr_city?: string;
}

export interface AirLabsScheduleData {
  airline_iata: string;
  airline_icao: string;
  flight_iata: string;
  flight_icao: string;
  flight_number: string;
  dep_iata: string;
  dep_icao: string;
  dep_terminal: string;
  dep_gate: string;
  dep_time: string;
  dep_time_utc: string;
  arr_iata: string;
  arr_icao: string;
  arr_terminal: string;
  arr_gate: string;
  arr_baggage: string;
  arr_time: string;
  arr_time_utc: string;
  cs_airline_iata: string;
  cs_flight_number: string;
  cs_flight_iata: string;
  aircraft_icao: string;
  status: string;
  duration: number;
  delayed: number;
  arr_estimated: string;
  dep_estimated: string;
  dep_actual: string;
  arr_actual: string;
}

export class AirLabsService {
  private apiKey: string;
  private baseUrl = 'https://airlabs.co/api/v9';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.AIRLABS_API_KEY || '';

    if (!this.apiKey) {
      console.warn('⚠️ AirLabs API key não configurada. Configure AIRLABS_API_KEY no .env');
    }
  }

  /**
   * Busca voo por número em tempo real
   */
  async getFlightByNumber(flightNumber: string): Promise<AirLabsFlightData | null> {
    try {
      console.log(`🔍 [AirLabs] Buscando voo: ${flightNumber}`);

      const response = await axios.get(`${this.baseUrl}/flight`, {
        params: {
          api_key: this.apiKey,
          flight_iata: flightNumber
        },
        timeout: 10000
      });

      if (response.data && response.data.response) {
        console.log(`✅ [AirLabs] Voo encontrado: ${flightNumber}`);
        return response.data.response;
      }

      console.log(`❌ [AirLabs] Voo não encontrado: ${flightNumber}`);
      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`❌ [AirLabs] Erro HTTP: ${error.response?.status} - ${error.message}`);
      } else {
        console.error(`❌ [AirLabs] Erro ao buscar voo:`, error);
      }
      return null;
    }
  }

  /**
   * Busca múltiplos voos em tempo real (radar)
   */
  async getLiveFlights(params?: {
    airline_iata?: string;
    dep_iata?: string;
    arr_iata?: string;
    flag?: string; // BR for Brazil
  }): Promise<AirLabsFlightData[]> {
    try {
      console.log(`🔍 [AirLabs] Buscando voos em tempo real...`);

      const response = await axios.get(`${this.baseUrl}/flights`, {
        params: {
          api_key: this.apiKey,
          ...params
        },
        timeout: 15000
      });

      if (response.data && response.data.response) {
        const flights = Array.isArray(response.data.response)
          ? response.data.response
          : [response.data.response];

        console.log(`✅ [AirLabs] ${flights.length} voos encontrados`);
        return flights;
      }

      return [];
    } catch (error) {
      console.error(`❌ [AirLabs] Erro ao buscar voos:`, error);
      return [];
    }
  }

  /**
   * Busca horários de voos por aeroporto
   */
  async getAirportSchedule(airportCode: string, type: 'departures' | 'arrivals' = 'departures'): Promise<AirLabsScheduleData[]> {
    try {
      console.log(`🔍 [AirLabs] Buscando ${type} do aeroporto: ${airportCode}`);

      const endpoint = type === 'departures' ? 'schedules' : 'schedules';
      const paramKey = type === 'departures' ? 'dep_iata' : 'arr_iata';

      const response = await axios.get(`${this.baseUrl}/${endpoint}`, {
        params: {
          api_key: this.apiKey,
          [paramKey]: airportCode
        },
        timeout: 15000
      });

      if (response.data && response.data.response) {
        const schedules = Array.isArray(response.data.response)
          ? response.data.response
          : [response.data.response];

        console.log(`✅ [AirLabs] ${schedules.length} voos encontrados para ${airportCode}`);
        return schedules;
      }

      return [];
    } catch (error) {
      console.error(`❌ [AirLabs] Erro ao buscar schedules:`, error);
      return [];
    }
  }

  /**
   * Busca voos por rota
   */
  async getFlightsByRoute(origin: string, destination: string): Promise<AirLabsScheduleData[]> {
    try {
      console.log(`🔍 [AirLabs] Buscando voos: ${origin} → ${destination}`);

      const response = await axios.get(`${this.baseUrl}/schedules`, {
        params: {
          api_key: this.apiKey,
          dep_iata: origin,
          arr_iata: destination
        },
        timeout: 15000
      });

      if (response.data && response.data.response) {
        const flights = Array.isArray(response.data.response)
          ? response.data.response
          : [response.data.response];

        console.log(`✅ [AirLabs] ${flights.length} voos encontrados na rota`);
        return flights;
      }

      return [];
    } catch (error) {
      console.error(`❌ [AirLabs] Erro ao buscar voos por rota:`, error);
      return [];
    }
  }

  /**
   * Converte dados do AirLabs para formato padrão
   */
  convertToStandardFormat(flight: AirLabsFlightData | AirLabsScheduleData): any {
    const isLiveFlight = 'lat' in flight;

    return {
      flightNumber: flight.flight_iata || flight.flight_number,
      flightIcao: flight.flight_icao,
      airline: flight.airline_iata,
      airlineIcao: flight.airline_icao,
      airlineName: 'airline_name' in flight ? flight.airline_name : undefined,
      origin: flight.dep_iata,
      originIcao: flight.dep_icao,
      destination: flight.arr_iata,
      destinationIcao: flight.arr_icao,
      departureTime: flight.dep_time,
      departureTimeUtc: flight.dep_time_utc,
      arrivalTime: flight.arr_time,
      arrivalTimeUtc: flight.arr_time_utc,
      actualDeparture: flight.dep_actual,
      actualArrival: flight.arr_actual,
      estimatedDeparture: 'dep_estimated' in flight ? flight.dep_estimated : undefined,
      estimatedArrival: 'arr_estimated' in flight ? flight.arr_estimated : undefined,
      status: this.normalizeStatus(flight.status),
      delayed: flight.delayed,
      duration: flight.duration,
      aircraft: flight.aircraft_icao,
      registration: 'reg_number' in flight ? flight.reg_number : undefined,
      terminal: 'dep_terminal' in flight ? flight.dep_terminal : undefined,
      gate: 'dep_gate' in flight ? flight.dep_gate : undefined,
      arrivalTerminal: 'arr_terminal' in flight ? flight.arr_terminal : undefined,
      arrivalGate: 'arr_gate' in flight ? flight.arr_gate : undefined,
      baggage: 'arr_baggage' in flight ? flight.arr_baggage : undefined,
      // Live tracking data (if available)
      position: isLiveFlight ? {
        latitude: flight.lat,
        longitude: flight.lng,
        altitude: flight.alt,
        direction: flight.dir,
        speed: flight.speed,
        verticalSpeed: flight.v_speed
      } : undefined,
      updated: 'updated' in flight ? flight.updated : undefined,
      source: 'AirLabs'
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
      'diverted': 'DESVIADO'
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
let airLabsService: AirLabsService;

export function getAirLabsService(): AirLabsService {
  if (!airLabsService) {
    airLabsService = new AirLabsService();
  }
  return airLabsService;
}
