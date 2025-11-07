/**
 * Amadeus GDS API Service
 * Serviço oficial de integração com Amadeus para dados de reservas
 *
 * API Key: 2qL4u1ZMtGPqoUzvqPymPUcyZGEZ5yCS
 * API Secret: Vf5osnCNJaX41PRg
 *
 * Features:
 * - Busca de reservas por PNR
 * - Dados em tempo real de voos
 * - Status de check-in
 * - Mudanças de portão/terminal
 */

import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger.util';

export interface AmadeusFlightOffer {
  id: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate: string;
  numberOfBookableSeats: number;
  itineraries: AmadeusItinerary[];
  price: AmadeusPrice;
  pricingOptions: any;
  validatingAirlineCodes: string[];
  travelerPricings: any[];
}

export interface AmadeusItinerary {
  duration: string;
  segments: AmadeusSegment[];
}

export interface AmadeusSegment {
  departure: AmadeusLocation;
  arrival: AmadeusLocation;
  carrierCode: string;
  number: string;
  aircraft: { code: string };
  operating?: { carrierCode: string };
  duration: string;
  id: string;
  numberOfStops: number;
  blacklistedInEU: boolean;
}

export interface AmadeusLocation {
  iataCode: string;
  terminal?: string;
  at: string;
}

export interface AmadeusPrice {
  currency: string;
  total: string;
  base: string;
  fees: any[];
  grandTotal: string;
}

export interface AmadeusBooking {
  type: string;
  id: string;
  queuingOfficeId: string;
  associatedRecords: Array<{
    reference: string;
    creationDate: string;
    originSystemCode: string;
    flightOfferId: string;
  }>;
  flightOffers: AmadeusFlightOffer[];
  travelers: Array<{
    id: string;
    dateOfBirth: string;
    name: {
      firstName: string;
      lastName: string;
    };
    gender: string;
    contact: {
      emailAddress: string;
      phones: Array<{
        deviceType: string;
        countryCallingCode: string;
        number: string;
      }>;
    };
    documents: Array<{
      documentType: string;
      birthPlace: string;
      issuanceLocation: string;
      issuanceDate: string;
      number: string;
      expiryDate: string;
      issuanceCountry: string;
      validityCountry: string;
      nationality: string;
      holder: boolean;
    }>;
  }>;
}

export class AmadeusAPIService {
  private readonly logger = new Logger('AmadeusAPIService');
  private readonly apiKey = '2qL4u1ZMtGPqoUzvqPymPUcyZGEZ5yCS';
  private readonly apiSecret = 'Vf5osnCNJaX41PRg';
  private readonly baseURL = 'https://test.api.amadeus.com'; // Test environment
  private readonly prodBaseURL = 'https://api.amadeus.com'; // Production

  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * Obter token de acesso OAuth2
   */
  private async getAccessToken(): Promise<string> {
    // Se token ainda é válido, retornar
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    this.logger.info('Obtendo novo token de acesso Amadeus...');

    try {
      const response = await this.client.post('/v1/security/oauth2/token',
        `grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.apiSecret}`
      );

      this.accessToken = response.data.access_token;
      // Token expira em 1799 segundos (30 min), vamos renovar 5 min antes
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      this.logger.info('Token de acesso obtido com sucesso');
      return this.accessToken;
    } catch (error: any) {
      this.logger.error('Erro ao obter token de acesso:', error.response?.data || error.message);
      throw new Error('Falha na autenticação com Amadeus API');
    }
  }

  /**
   * Buscar voo por número usando Schedule Flights API
   * Usa v2/schedule/flights que não requer origem/destino
   */
  async searchFlightByNumber(
    flightNumber: string,
    date?: string
  ): Promise<any[] | null> {
    try {
      const token = await this.getAccessToken();

      // Extrair código da companhia e número
      const carrierCode = flightNumber.substring(0, 2).toUpperCase();
      const number = flightNumber.substring(2);
      const searchDate = date || new Date().toISOString().split('T')[0];

      this.logger.info(`Buscando voo ${carrierCode}${number} para ${searchDate} via Schedule API`);

      const response = await axios.get(`${this.baseURL}/v2/schedule/flights`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params: {
          carrierCode: carrierCode,
          flightNumber: number,
          scheduledDepartureDate: searchDate,
        },
      });

      if (response.data.data && response.data.data.length > 0) {
        this.logger.info(`${response.data.data.length} voo(s) encontrado(s) no Schedule API`);
        return response.data.data;
      }

      this.logger.warn(`Voo ${flightNumber} não encontrado no Schedule API`);
      return null;
    } catch (error: any) {
      this.logger.error('Erro ao buscar voo via Schedule API:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Buscar reserva por PNR (Booking Retrieval)
   */
  async getBookingByPNR(pnr: string): Promise<AmadeusBooking | null> {
    try {
      const token = await this.getAccessToken();

      this.logger.info(`Buscando reserva com PNR: ${pnr}`);

      const response = await axios.get(`${this.baseURL}/v1/booking/flight-orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params: {
          'orderIds': pnr,
        },
      });

      if (response.data.data && response.data.data.length > 0) {
        this.logger.info(`Reserva ${pnr} encontrada`);
        return response.data.data[0];
      }

      this.logger.warn(`Reserva ${pnr} não encontrada`);
      return null;
    } catch (error: any) {
      this.logger.error('Erro ao buscar reserva:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Buscar status de voo em tempo real (Flight Status)
   */
  async getFlightStatus(
    carrierCode: string,
    flightNumber: string,
    date: string
  ): Promise<any | null> {
    try {
      const token = await this.getAccessToken();

      this.logger.info(`Buscando status do voo ${carrierCode}${flightNumber} em ${date}`);

      const response = await axios.get(`${this.baseURL}/v2/schedule/flights`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params: {
          carrierCode,
          flightNumber,
          scheduledDepartureDate: date,
        },
      });

      if (response.data.data && response.data.data.length > 0) {
        this.logger.info(`Status do voo obtido com sucesso`);
        return response.data.data[0];
      }

      this.logger.warn(`Status do voo não encontrado`);
      return null;
    } catch (error: any) {
      this.logger.error('Erro ao buscar status do voo:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Buscar voos por rota e data
   */
  async searchFlightsByRoute(
    origin: string,
    destination: string,
    date: string,
    returnDate?: string
  ): Promise<AmadeusFlightOffer[]> {
    try {
      const token = await this.getAccessToken();

      this.logger.info(`Buscando voos ${origin} → ${destination} em ${date}`);

      const params: any = {
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate: date,
        adults: 1,
        currencyCode: 'BRL',
        max: 50,
      };

      if (returnDate) {
        params.returnDate = returnDate;
      }

      const response = await axios.get(`${this.baseURL}/v2/shopping/flight-offers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params,
      });

      this.logger.info(`${response.data.data.length} voo(s) encontrado(s)`);
      return response.data.data || [];
    } catch (error: any) {
      this.logger.error('Erro ao buscar voos por rota:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Converter dados Amadeus Schedule API para formato padrão do sistema
   */
  convertToStandardFormat(amadeusData: any): any {
    // Se for Schedule API (novo formato)
    if (amadeusData.flightDesignator) {
      const departure = amadeusData.flightPoints?.find((fp: any) => fp.iataCode === amadeusData.departure?.iataCode);
      const arrival = amadeusData.flightPoints?.find((fp: any) => fp.iataCode === amadeusData.arrival?.iataCode);

      return {
        flightNumber: `${amadeusData.flightDesignator.carrierCode}${amadeusData.flightDesignator.flightNumber}`,
        airline: amadeusData.flightDesignator.carrierCode,
        airlineName: this.getAirlineName(amadeusData.flightDesignator.carrierCode),
        origin: amadeusData.departure?.iataCode || '',
        destination: amadeusData.arrival?.iataCode || '',
        departureTime: amadeusData.departure?.at || '',
        arrivalTime: amadeusData.arrival?.at || '',
        flightDate: amadeusData.scheduledDepartureDate || new Date().toISOString().split('T')[0],
        status: amadeusData.flightStatus || 'scheduled',
        aircraft: amadeusData.legs?.[0]?.aircraftEquipment?.aircraftType || null,
        departureTerminal: amadeusData.departure?.terminal || null,
        arrivalTerminal: amadeusData.arrival?.terminal || null,
        source: 'amadeus-schedule',
      };
    }

    // Se for Flight Offers API (formato antigo)
    if (amadeusData.itineraries) {
      const segment = amadeusData.itineraries[0].segments[0];

      return {
        flightNumber: `${segment.carrierCode}${segment.number}`,
        airline: segment.carrierCode,
        airlineName: this.getAirlineName(segment.carrierCode),
        origin: segment.departure.iataCode,
        destination: segment.arrival.iataCode,
        departureTime: this.extractTime(segment.departure.at),
        arrivalTime: this.extractTime(segment.arrival.at),
        flightDate: segment.departure.at.split('T')[0],
        status: 'SCHEDULED',
        aircraft: segment.aircraft.code,
        departureTerminal: segment.departure.terminal,
        arrivalTerminal: segment.arrival.terminal,
        source: 'amadeus-offers',
      };
    }

    // Fallback
    return null;
  }

  /**
   * Extrair hora de timestamp ISO
   */
  private extractTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toISOString().split('T')[1].substring(0, 5); // HH:MM
    } catch {
      return '';
    }
  }

  /**
   * Obter nome da companhia aérea
   */
  private getAirlineName(code: string): string {
    const airlines: { [key: string]: string } = {
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
    return airlines[code] || code;
  }

  /**
   * Verificar saúde da API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch {
      return false;
    }
  }
}

// Singleton
let amadeusService: AmadeusAPIService;

export function getAmadeusAPIService(): AmadeusAPIService {
  if (!amadeusService) {
    amadeusService = new AmadeusAPIService();
  }
  return amadeusService;
}
