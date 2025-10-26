import { Request, Response } from 'express';
import { getRealFlightSearchService } from '../services/real-flight-search.service';
import { z } from 'zod';

// Validation schema
const searchFlightSchema = z.object({
  flightNumber: z.string().min(4).max(10).transform(val => val.toUpperCase().trim()),
  date: z.string().optional(),
});

export class FlightSearchController {
  private realFlightSearchService = getRealFlightSearchService();

  /**
   * Search for real-time flight information by flight number
   * Uses AirLabs, Aviationstack, and FlightRadar24 APIs
   */
  async searchFlight(req: Request, res: Response): Promise<void> {
    try {
      const { flightNumber, date } = searchFlightSchema.parse(req.body);

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🔍 API - Busca de Vôo Real Iniciada`);
      console.log(`   Número: ${flightNumber}`);
      console.log(`   Data: ${date || 'Hoje'}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Search using real APIs (AirLabs → Aviationstack → FlightRadar24)
      const flightData = await this.realFlightSearchService.searchRealFlightByNumber(flightNumber);

      if (flightData) {
        console.log(`✅ Vôo encontrado com sucesso!`);
        console.log(`📦 Dados RAW do flightData:`, JSON.stringify(flightData, null, 2));
        console.log(`   Origem: ${flightData.origem || flightData.origin || 'N/A'}`);
        console.log(`   Destino: ${flightData.destino || flightData.destination || 'N/A'}`);
        console.log(`   Status: ${flightData.status || 'N/A'}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        // Helper para extrair hora de timestamp ISO
        const extractTime = (isoString: string | null | undefined): string => {
          if (!isoString) return '';
          try {
            const date = new Date(isoString);
            return date.toISOString().split('T')[1].substring(0, 5); // HH:MM
          } catch {
            return '';
          }
        };

        res.status(200).json({
          success: true,
          data: {
            numeroVoo: flightNumber,
            // Origem e Destino - priorizar campos em inglês (que vêm do convertToStandardFormat)
            origem: flightData.origin || flightData.origem || '',
            destino: flightData.destination || flightData.destino || '',
            // Horários - usar campos do convertToStandardFormat
            horarioPartida: extractTime(flightData.departureTime) || flightData.horarioPartida || '',
            horarioChegada: extractTime(flightData.arrivalTime) || flightData.horarioChegada || '',
            horarioPartidaReal: extractTime(flightData.actualDeparture) || null,
            horarioChegadaReal: extractTime(flightData.actualArrival) || null,
            horarioPartidaEstimado: extractTime(flightData.estimatedDeparture) || null,
            horarioChegadaEstimado: extractTime(flightData.estimatedArrival) || null,
            dataPartida: flightData.flightDate || new Date().toISOString().split('T')[0],
            status: flightData.status || 'Desconhecido',
            companhia: flightData.airlineName || flightData.airline || this.detectAirlineFromFlightNumber(flightNumber),
            // Informações de Terminal e Portão
            portao: flightData.departureGate || null,
            portaoChegada: flightData.arrivalGate || null,
            terminal: flightData.departureTerminal || null,
            terminalChegada: flightData.arrivalTerminal || null,
            // Informações de GPS e Posição (se voo estiver em tempo real)
            posicao: flightData.position || null,
            // Informações de Atraso
            atrasado: flightData.departureDelay || flightData.arrivalDelay || 0,
            duracao: null,
            // Informações da aeronave
            aeronave: flightData.aircraft || flightData.aircraftIcao || null,
            registro: flightData.registration || null,
            // Metadados
            ultimaAtualizacao: new Date().toISOString(),
          },
          source: flightData.source || 'API Real',
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log(`❌ Vôo não encontrado`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        res.status(404).json({
          success: false,
          error: 'Vôo não encontrado',
          message: `Não foi possível encontrar informações para o vôo ${flightNumber}. Verifique o número e tente novamente.`,
          suggestions: [
            'Verifique se o número do vôo está correto',
            'Certifique-se de que o vôo está operando hoje',
            'Tente novamente em alguns minutos',
            'Alguns vôos só operam em dias específicos da semana',
          ],
        });
      }
    } catch (error: any) {
      console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.error(`❌ Erro ao buscar vôo:`, error.message);
      console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: 'Número do vôo deve ter entre 4 e 10 caracteres',
          details: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Ocorreu um erro ao buscar o vôo. Tente novamente.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Search flights by airport (departures or arrivals)
   */
  async searchFlightsByAirport(req: Request, res: Response): Promise<void> {
    try {
      const airportCode = req.params.airportCode?.toUpperCase().trim();
      const type = (req.query.type as 'departures' | 'arrivals') || 'departures';

      if (!airportCode || airportCode.length !== 3) {
        res.status(400).json({
          success: false,
          error: 'Código de aeroporto inválido',
          message: 'O código do aeroporto deve ter 3 letras (ex: GRU, CGH, SDU)',
        });
        return;
      }

      console.log(`🔍 Buscando ${type} do aeroporto ${airportCode}...`);

      const flights = await this.realFlightSearchService.searchFlightsByAirport(airportCode, type);

      res.status(200).json({
        success: true,
        data: {
          airport: airportCode,
          type,
          flights,
          count: flights.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`❌ Erro ao buscar vôos do aeroporto:`, error.message);

      res.status(500).json({
        success: false,
        error: 'Erro ao buscar vôos',
        message: 'Não foi possível buscar os vôos do aeroporto.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Search flights by route (origin → destination)
   */
  async searchFlightsByRoute(req: Request, res: Response): Promise<void> {
    try {
      const { origin, destination, date } = req.query;

      if (!origin || !destination) {
        res.status(400).json({
          success: false,
          error: 'Parâmetros inválidos',
          message: 'Informe origem e destino (códigos IATA de 3 letras)',
        });
        return;
      }

      const originCode = String(origin).toUpperCase().trim();
      const destinationCode = String(destination).toUpperCase().trim();
      const searchDate = date ? String(date) : undefined;

      console.log(`🔍 Buscando vôos: ${originCode} → ${destinationCode}`);

      const flights = await this.realFlightSearchService.searchFlightsByRoute(
        originCode,
        destinationCode,
        searchDate
      );

      res.status(200).json({
        success: true,
        data: {
          origin: originCode,
          destination: destinationCode,
          date: searchDate,
          flights,
          count: flights.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`❌ Erro ao buscar vôos por rota:`, error.message);

      res.status(500).json({
        success: false,
        error: 'Erro ao buscar vôos',
        message: 'Não foi possível buscar vôos para esta rota.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Get live flights (currently in the air)
   */
  async searchLiveFlights(req: Request, res: Response): Promise<void> {
    try {
      const { airline, country } = req.query;

      const params: any = {};
      if (airline) params.airline = String(airline).toUpperCase();
      if (country) params.country = String(country).toUpperCase();

      console.log(`🔍 Buscando vôos em tempo real...`);

      const flights = await this.realFlightSearchService.searchLiveFlights(params);

      res.status(200).json({
        success: true,
        data: {
          filters: params,
          flights,
          count: flights.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`❌ Erro ao buscar vôos ao vivo:`, error.message);

      res.status(500).json({
        success: false,
        error: 'Erro ao buscar vôos',
        message: 'Não foi possível buscar vôos em tempo real.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Detecta companhia aérea pelo número do vôo
   */
  private detectAirlineFromFlightNumber(flightNumber: string): string {
    const code = flightNumber.substring(0, 2).toUpperCase();
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
    return airlineMap[code] || 'Companhia Desconhecida';
  }
}

export const flightSearchController = new FlightSearchController();
