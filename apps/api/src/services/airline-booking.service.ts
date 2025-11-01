import axios from 'axios';
import * as cheerio from 'cheerio';
import { FirecrawlService } from './firecrawl.service';
import { getRealFlightSearchService } from './real-flight-search.service';
import { PrismaClient } from '@reservasegura/database';

export interface BookingSearchRequest {
  localizador: string;
  sobrenome: string;
  origem?: string;
}

export interface BookingData {
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
  documento?: string;
  telefone?: string;
  email?: string;
}

export class AirlineBookingService {
  private fireCrawlService: FirecrawlService;
  private realFlightSearch = getRealFlightSearchService();
  private prisma: PrismaClient;

  constructor() {
    this.fireCrawlService = new FirecrawlService();
    this.prisma = new PrismaClient();
  }

  async searchBooking(request: BookingSearchRequest): Promise<BookingData | null> {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 BUSCA DE RESERVA INICIADA`);
    console.log(`   Localizador: ${request.localizador}`);
    console.log(`   Sobrenome: ${request.sobrenome || 'N/A'}`);
    console.log(`   Origem: ${request.origem || 'N/A'}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // PASSO 1: Buscar no banco de dados local
    console.log('\n📍 Passo 1: Buscando no banco de dados local...');
    const localBooking = await this.searchInDatabase(request);
    if (localBooking) {
      console.log('✅ Reserva encontrada no banco de dados local!');
      console.log(`   Voo: ${localBooking.numeroVoo}`);
      console.log(`   Rota: ${localBooking.origem} → ${localBooking.destino}`);
      return localBooking;
    }
    console.log('⚠️  Reserva não encontrada no banco local');

    // PASSO 2: Tentar extrair número do voo do localizador
    console.log('\n📍 Passo 2: Analisando código de reserva...');
    const possibleFlightNumber = this.extractFlightNumberFromLocalizador(request.localizador);

    if (possibleFlightNumber) {
      console.log(`💡 Possível número de voo identificado: ${possibleFlightNumber}`);

      // Buscar informações reais do voo via API
      console.log('🔄 Buscando informações do voo via API...');
      const flightData = await this.realFlightSearch.searchRealFlightByNumber(possibleFlightNumber);

      if (flightData && (flightData.origin || flightData.destination)) {
        console.log('✅ Informações do voo encontradas!');
        console.log(`   Rota: ${flightData.origin} → ${flightData.destination}`);

        const airline = this.detectAirlineFromLocalizador(request.localizador);
        const result = this.convertFlightDataToBookingData(flightData, request, airline);

        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`✅ BUSCA CONCLUÍDA - DADOS REAIS`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        return result;
      }
    }

    // PASSO 3: Tentar buscar via web scraping (com timeout curto)
    console.log('\n📍 Passo 3: Tentando web scraping das companhias...');
    const airlines = ['GOL', 'LATAM', 'AZUL'] as const;

    for (const airline of airlines) {
      try {
        console.log(`🛫 Tentando ${airline}...`);

        const result = await Promise.race([
          this.searchInAirline(airline, request),
          new Promise<null>((resolve) => setTimeout(() => {
            console.log(`   ⏱️ Timeout em ${airline}`);
            resolve(null);
          }, 2000)) // Reduzido para 2s
        ]);

        if (result) {
          console.log(`✅ Reserva encontrada na ${airline}!`);
          return result;
        }
      } catch (error) {
        console.log(`   ❌ Erro em ${airline}`);
        continue;
      }
    }

    // PASSO 4: Retornar NULL e explicar a limitação
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ RESERVA NÃO ENCONTRADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 INSTRUÇÕES PARA O USUÁRIO:');
    console.log('   1. Códigos de reserva (PNR) não são acessíveis via APIs públicas');
    console.log('   2. Para buscar sua reserva, você precisa:');
    console.log('      a) Informar o NÚMERO DO VOO (ex: G31234, LA4567)');
    console.log('      b) OU cadastrar manualmente sua reserva no sistema');
    console.log('   3. Com o número do voo, conseguimos buscar dados em tempo real\n');

    return null;
  }

  private async searchInAirline(
    airline: 'GOL' | 'LATAM' | 'AZUL',
    request: BookingSearchRequest
  ): Promise<BookingData | null> {
    switch (airline) {
      case 'GOL':
        return await this.searchGol(request);
      case 'LATAM':
        return await this.searchLatam(request);
      case 'AZUL':
        return await this.searchAzul(request);
      default:
        return null;
    }
  }

  private async searchGol(request: BookingSearchRequest): Promise<BookingData | null> {
    try {
      console.log('🔥 Buscando reserva REAL na GOL:', request.localizador);

      // Primeiro tentar busca real
      const realData = await this.realFlightSearch.searchGolBooking(
        request.localizador,
        request.sobrenome
      );

      if (realData) {
        console.log('✅ Dados REAIS encontrados na GOL!');
        return this.convertRealDataToBookingData(realData, 'GOL');
      }

      // Se não encontrar, tentar buscar pelo número do voo
      const flightNumber = this.extractFlightNumberFromLocalizador(request.localizador);
      if (flightNumber) {
        const flightData = await this.realFlightSearch.searchRealFlightByNumber(flightNumber);
        if (flightData) {
          return this.convertFlightDataToBookingData(flightData, request, 'GOL');
        }
      }

      // Não encontrado
      console.log('❌ Reserva não encontrada na GOL');
      return null;
    } catch (error) {
      console.error('Erro ao buscar na GOL:', error);
      return null;
    }
  }

  private async searchLatam(request: BookingSearchRequest): Promise<BookingData | null> {
    try {
      console.log('🔥 Buscando reserva REAL na LATAM:', request.localizador);

      // Primeiro tentar busca real
      const realData = await this.realFlightSearch.searchLatamBooking(
        request.localizador,
        request.sobrenome
      );

      if (realData) {
        console.log('✅ Dados REAIS encontrados na LATAM!');
        return this.convertRealDataToBookingData(realData, 'LATAM');
      }

      // Se não encontrar, tentar buscar pelo número do voo
      const flightNumber = this.extractFlightNumberFromLocalizador(request.localizador);
      if (flightNumber) {
        const flightData = await this.realFlightSearch.searchRealFlightByNumber(flightNumber);
        if (flightData) {
          return this.convertFlightDataToBookingData(flightData, request, 'LATAM');
        }
      }

      // Não encontrado
      console.log('❌ Reserva não encontrada na LATAM');
      return null;
    } catch (error) {
      console.error('Erro ao buscar na LATAM:', error);
      return null;
    }
  }

  private async searchAzul(request: BookingSearchRequest): Promise<BookingData | null> {
    try {
      console.log('🔥 Buscando reserva REAL na Azul:', request.localizador);

      // Primeiro tentar busca real
      const realData = await this.realFlightSearch.searchAzulBooking(
        request.localizador,
        request.sobrenome
      );

      if (realData) {
        console.log('✅ Dados REAIS encontrados na Azul!');
        return this.convertRealDataToBookingData(realData, 'AZUL');
      }

      // Se não encontrar, tentar buscar pelo número do voo
      const flightNumber = this.extractFlightNumberFromLocalizador(request.localizador);
      if (flightNumber) {
        const flightData = await this.realFlightSearch.searchRealFlightByNumber(flightNumber);
        if (flightData) {
          return this.convertFlightDataToBookingData(flightData, request, 'AZUL');
        }
      }

      // Não encontrado
      console.log('❌ Reserva não encontrada na Azul');
      return null;
    } catch (error) {
      console.error('Erro ao buscar na Azul:', error);
      return null;
    }
  }

  private convertRealDataToBookingData(realData: any, companhia: 'GOL' | 'LATAM' | 'AZUL'): BookingData {
    return {
      localizador: realData.localizador,
      sobrenome: realData.sobrenome,
      origem: realData.origem,
      destino: realData.destino,
      dataPartida: realData.dataPartida,
      dataChegada: realData.dataPartida, // Assumindo mesmo dia
      horarioPartida: realData.horarioPartida,
      horarioChegada: realData.horarioChegada || this.calculateArrivalTime(realData.horarioPartida),
      numeroVoo: realData.numeroVoo,
      companhia: companhia,
      status: realData.status || 'CONFIRMADO',
      portaoEmbarque: realData.portao,
      terminal: realData.terminal,
      assento: realData.assento,
      classe: 'ECONÔMICA',
      passageiro: realData.sobrenome
    };
  }

  private convertFlightDataToBookingData(flightData: any, request: BookingSearchRequest, companhia: 'GOL' | 'LATAM' | 'AZUL'): BookingData {
    return {
      localizador: request.localizador.toUpperCase(),
      sobrenome: request.sobrenome.toUpperCase(),
      origem: flightData.origem || request.origem || '',
      destino: flightData.destino || '',
      dataPartida: new Date().toISOString().split('T')[0],
      dataChegada: new Date().toISOString().split('T')[0],
      horarioPartida: flightData.horarioPartida || '',
      horarioChegada: flightData.horarioChegada || '',
      numeroVoo: flightData.numeroVoo || '',
      companhia: companhia,
      status: flightData.status || 'CONFIRMADO',
      classe: 'ECONÔMICA',
      passageiro: request.sobrenome.toUpperCase()
    };
  }

  private calculateArrivalTime(departureTime: string): string {
    if (!departureTime) return '';

    try {
      const [hours, minutes] = departureTime.split(':').map(Number);
      const arrivalHours = (hours + 2) % 24; // Adiciona 2 horas de voo
      return `${arrivalHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  }


  private formatDate(dateStr: string): string {
    if (!dateStr) return '';

    try {
      // Tentar diferentes formatos de data
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      // Formato brasileiro dd/mm/yyyy
      const brazilianDateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (brazilianDateMatch) {
        const [, day, month, year] = brazilianDateMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }

      return dateStr;
    } catch (error) {
      return dateStr;
    }
  }

  private normalizeStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'confirmado': 'CONFIRMADO',
      'confirmed': 'CONFIRMADO',
      'check-in': 'CHECK_IN',
      'checkin': 'CHECK_IN',
      'embarque': 'EMBARQUE',
      'boarding': 'EMBARQUE',
      'cancelado': 'CANCELADO',
      'cancelled': 'CANCELADO',
      'atrasado': 'ATRASADO',
      'delayed': 'ATRASADO'
    };

    const normalized = status.toLowerCase().trim();
    return statusMap[normalized] || status.toUpperCase();
  }

  // Método alternativo usando APIs públicas quando disponível
  async searchBookingAlternative(request: BookingSearchRequest): Promise<BookingData | null> {
    console.log('🔄 Tentando método alternativo de busca...');

    try {
      // Tentar buscar usando FlightRadar24 com base no código de reserva
      // Muitas vezes o código de reserva contém informações do voo
      const possibleFlightNumber = this.extractFlightNumberFromLocalizador(request.localizador);

      if (possibleFlightNumber) {
        console.log(`🛫 Tentando buscar voo ${possibleFlightNumber}...`);

        // Aqui você pode integrar com o FlightRadar24Service existente
        // para obter informações básicas do voo
        return {
          localizador: request.localizador.toUpperCase(),
          sobrenome: request.sobrenome,
          origem: request.origem || '',
          destino: '',
          dataPartida: new Date().toISOString().split('T')[0],
          dataChegada: new Date().toISOString().split('T')[0],
          horarioPartida: '',
          horarioChegada: '',
          numeroVoo: possibleFlightNumber,
          companhia: this.detectAirlineFromLocalizador(request.localizador),
          status: 'CONFIRMADO',
          classe: 'ECONÔMICA',
          passageiro: request.sobrenome.toUpperCase()
        };
      }

      return null;
    } catch (error) {
      console.error('Erro no método alternativo:', error);
      return null;
    }
  }

  private extractFlightNumberFromLocalizador(localizador: string): string {
    // Lógica para extrair possível número de voo do localizador
    // Muitos códigos de reserva seguem padrões que incluem informações do voo
    const match = localizador.match(/([A-Z]{2}\d{3,4})/);
    return match ? match[1] : '';
  }

  private detectAirlineFromLocalizador(localizador: string): 'GOL' | 'LATAM' | 'AZUL' {
    const code = localizador.toUpperCase();

    if (code.startsWith('G3') || code.includes('GOL')) return 'GOL';
    if (code.startsWith('LA') || code.startsWith('JJ')) return 'LATAM';
    if (code.startsWith('AD') || code.includes('AZUL')) return 'AZUL';

    // Padrão padrão
    return 'GOL';
  }

  /**
   * Busca reserva no banco de dados local e enriquece com dados atualizados do voo
   */
  private async searchInDatabase(request: BookingSearchRequest): Promise<BookingData | null> {
    try {
      const bookingCode = request.localizador.toUpperCase().trim();

      // Buscar no banco de dados
      const booking = await this.prisma.booking.findFirst({
        where: {
          bookingCode: bookingCode
        },
        include: {
          flight: true,
          user: true
        }
      });

      if (!booking) {
        console.log('❌ Reserva não encontrada no banco de dados local');
        return null;
      }

      // Verificar sobrenome
      const passengers = JSON.parse(booking.passengers || '[]');
      const passengerMatch = passengers.some((p: any) =>
        p.lastName?.toUpperCase() === request.sobrenome.toUpperCase()
      );

      if (!passengerMatch && booking.user?.name) {
        // Verificar se o sobrenome está no nome do usuário
        const userLastName = booking.user.name.split(' ').pop()?.toUpperCase();
        if (userLastName !== request.sobrenome.toUpperCase()) {
          console.log('❌ Sobrenome não corresponde à reserva');
          return null;
        }
      }

      // Converter para BookingData base
      const passenger = passengers[0] || { firstName: booking.user?.name || '', lastName: request.sobrenome };

      const baseBookingData: BookingData = {
        localizador: booking.bookingCode,
        sobrenome: passenger.lastName || request.sobrenome,
        origem: booking.flight.origin,
        destino: booking.flight.destination,
        dataPartida: booking.flight.departureTime.toISOString().split('T')[0],
        dataChegada: booking.flight.arrivalTime.toISOString().split('T')[0],
        horarioPartida: booking.flight.departureTime.toISOString().split('T')[1].substring(0, 5),
        horarioChegada: booking.flight.arrivalTime.toISOString().split('T')[1].substring(0, 5),
        numeroVoo: booking.flight.flightNumber,
        companhia: this.mapAirlineCode(booking.flight.airline),
        status: this.mapBookingStatus(booking.status),
        classe: 'ECONÔMICA',
        passageiro: `${passenger.firstName || ''} ${passenger.lastName || ''}`.trim(),
        documento: passenger.document,
        telefone: passenger.phone,
        email: passenger.email || booking.user?.email
      };

      // ENRIQUECER com dados REAIS e ATUALIZADOS do voo
      console.log('🔄 Enriquecendo reserva com dados atualizados do voo:', booking.flight.flightNumber);
      try {
        const liveFlightData = await this.realFlightSearch.searchRealFlightByNumber(booking.flight.flightNumber);

        if (liveFlightData) {
          console.log('✅ Dados atualizados do voo obtidos!');

          // Atualizar com dados em tempo real
          return {
            ...baseBookingData,
            // Atualizar horários se disponíveis
            horarioPartida: liveFlightData.departureTime || baseBookingData.horarioPartida,
            horarioChegada: liveFlightData.arrivalTime || baseBookingData.horarioChegada,
            // Atualizar status com informação real
            status: liveFlightData.status || baseBookingData.status,
            // Adicionar informações extras se disponíveis
            portaoEmbarque: liveFlightData.departureGate || liveFlightData.gate,
            terminal: liveFlightData.departureTerminal || liveFlightData.terminal,
            // Informações de atraso
            ...(liveFlightData.delayed && { delayed: liveFlightData.delayed })
          };
        }
      } catch (error) {
        console.warn('⚠️ Não foi possível obter dados atualizados do voo:', error);
      }

      // Retornar dados base se não conseguir enriquecer
      return baseBookingData;
    } catch (error) {
      console.error('❌ Erro ao buscar no banco de dados:', error);
      return null;
    }
  }

  /**
   * Mapeia código da companhia aérea
   */
  private mapAirlineCode(airline: string): 'GOL' | 'LATAM' | 'AZUL' {
    const upper = airline.toUpperCase();

    if (upper.includes('GOL') || upper.includes('G3')) return 'GOL';
    if (upper.includes('LATAM') || upper.includes('LA') || upper.includes('TAM')) return 'LATAM';
    if (upper.includes('AZUL') || upper.includes('AD')) return 'AZUL';

    return 'GOL'; // default
  }

  /**
   * Gera dados mock para demonstração
   */
  private generateMockBookingData(request: BookingSearchRequest): BookingData {
    // Detectar companhia baseada no localizador
    let companhia: 'GOL' | 'LATAM' | 'AZUL' = 'GOL';
    const loc = request.localizador.toUpperCase();

    if (loc.startsWith('LA') || loc.startsWith('JJ')) {
      companhia = 'LATAM';
    } else if (loc.startsWith('AD')) {
      companhia = 'AZUL';
    }

    // Gerar horários baseados no horário atual
    const now = new Date();
    const dataPartida = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Amanhã
    const dataChegada = new Date(dataPartida.getTime() + 2 * 60 * 60 * 1000); // +2 horas

    const origem = request.origem || 'GRU';
    const destino = origem === 'SLZ' ? 'GRU' : 'BSB';

    return {
      localizador: request.localizador.toUpperCase(),
      sobrenome: request.sobrenome.toUpperCase() || 'PASSAGEIRO',
      origem: origem,
      destino: destino,
      dataPartida: dataPartida.toISOString().split('T')[0],
      dataChegada: dataChegada.toISOString().split('T')[0],
      horarioPartida: '08:30',
      horarioChegada: '10:45',
      numeroVoo: `${companhia === 'GOL' ? 'G3' : companhia === 'LATAM' ? 'LA' : 'AD'}1234`,
      companhia: companhia,
      status: 'CONFIRMADO',
      portaoEmbarque: '12',
      terminal: '2',
      assento: '15A',
      classe: 'ECONÔMICA',
      passageiro: request.sobrenome.toUpperCase() || 'PASSAGEIRO',
      documento: 'CPF: ***.***.***-**',
      telefone: '(11) 9****-****',
      email: '***@***mail.com'
    };
  }

  /**
   * Mapeia status da reserva
   */
  private mapBookingStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'PENDENTE',
      'CONFIRMED': 'CONFIRMADO',
      'CANCELLED': 'CANCELADO',
      'COMPLETED': 'CONCLUÍDO'
    };

    return statusMap[status] || status;
  }
}

// Singleton
let airlineBookingService: AirlineBookingService;

export function getAirlineBookingService(): AirlineBookingService {
  if (!airlineBookingService) {
    airlineBookingService = new AirlineBookingService();
  }
  return airlineBookingService;
}