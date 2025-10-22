import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { getAirLabsService } from './airlabs.service';
import { getAviationstackService } from './aviationstack.service';

export interface RealFlightData {
  localizador: string;
  sobrenome: string;
  origem: string;
  destino: string;
  dataPartida: string;
  horarioPartida: string;
  numeroVoo: string;
  companhia: string;
  status: string;
  portao?: string;
  terminal?: string;
  assento?: string;
}

export class RealFlightSearchService {
  private airLabsService = getAirLabsService();
  private aviationstackService = getAviationstackService();

  /**
   * Busca voos reais usando APIs profissionais
   * Prioridade: AirLabs > Aviationstack > FlightRadar24
   */
  async searchRealFlightByNumber(flightNumber: string): Promise<any> {
    try {
      console.log(`🔍 Buscando voo real: ${flightNumber}`);

      // PRIMEIRA TENTATIVA: AirLabs (dados em tempo real)
      if (this.airLabsService.isConfigured()) {
        console.log('🔄 Tentando AirLabs...');
        const airLabsFlight = await this.airLabsService.getFlightByNumber(flightNumber);
        if (airLabsFlight) {
          console.log('✅ Voo encontrado no AirLabs');
          return this.airLabsService.convertToStandardFormat(airLabsFlight);
        }
      }

      // SEGUNDA TENTATIVA: Aviationstack
      if (this.aviationstackService.isConfigured()) {
        console.log('🔄 Tentando Aviationstack...');
        const aviationstackFlight = await this.aviationstackService.getFlightByNumber(flightNumber);
        if (aviationstackFlight) {
          console.log('✅ Voo encontrado no Aviationstack');
          return this.aviationstackService.convertToStandardFormat(aviationstackFlight);
        }
      }

      // TERCEIRA TENTATIVA: FlightRadar24 (fallback)

      // FlightRadar24 API endpoints
      const endpoints = [
        `https://api.flightradar24.com/common/v1/flight/list.json?query=${flightNumber}`,
        `https://www.flightradar24.com/v1/search/web/find?query=${flightNumber}&limit=10`,
        `https://data-live.flightradar24.com/zones/fcgi/feed.js?bounds=90,-180,-90,180&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=1&air=1&vehicles=0&estimated=1&maxage=14400&gliders=1&stats=0&flight=${flightNumber}`
      ];

      // Tentar diferentes endpoints
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json',
              'Origin': 'https://www.flightradar24.com',
              'Referer': 'https://www.flightradar24.com/'
            },
            timeout: 10000
          });

          if (response.data) {
            console.log('✅ Dados encontrados no FlightRadar24');
            return this.parseFlightRadarData(response.data, flightNumber);
          }
        } catch (err) {
          console.log(`⚠️ Endpoint falhou: ${endpoint.substring(0, 50)}...`);
          continue;
        }
      }

      // Fallback: FlightAware
      return await this.searchFlightAware(flightNumber);

    } catch (error) {
      console.error('❌ Erro ao buscar voo real:', error);
      return null;
    }
  }

  /**
   * Busca no FlightAware
   */
  async searchFlightAware(flightNumber: string): Promise<any> {
    try {
      const url = `https://flightaware.com/live/flight/${flightNumber}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);

      // Extrair dados do HTML
      const origin = $('.flightPageSummaryOrigin .flightPageSummaryAirport').text().trim();
      const destination = $('.flightPageSummaryDestination .flightPageSummaryAirport').text().trim();
      const departureTime = $('.flightPageSummaryDeparture .flightPageSummaryTime').text().trim();
      const arrivalTime = $('.flightPageSummaryArrival .flightPageSummaryTime').text().trim();
      const status = $('.flightPageSummaryStatus').text().trim();

      if (origin && destination) {
        return {
          origem: origin,
          destino: destination,
          horarioPartida: departureTime,
          horarioChegada: arrivalTime,
          status: status || 'Em voo',
          numeroVoo: flightNumber
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar no FlightAware:', error);
      return null;
    }
  }

  /**
   * Busca reserva real na GOL
   * NOTA: GOL não possui API pública. Este método tenta endpoints não oficiais
   * e fallback para scraping. Requer parceria comercial para API oficial (Sabre).
   */
  async searchGolBooking(localizador: string, sobrenome: string): Promise<RealFlightData | null> {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 GOL - Iniciando busca de reserva`);
    console.log(`   Localizador: ${localizador}`);
    console.log(`   Sobrenome: ${sobrenome}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    try {
      // TENTATIVA 1: API não oficial
      console.log('📡 [1/3] Tentando endpoint não oficial da GOL...');
      const apiUrl = 'https://www.voegol.com.br/api/booking/search';

      const response = await axios.post(apiUrl, {
        recordLocator: localizador.toUpperCase(),
        lastName: sobrenome.toUpperCase()
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Origin': 'https://www.voegol.com.br',
          'Referer': 'https://www.voegol.com.br/pt/servicos/minhas-viagens'
        },
        timeout: 15000,
        validateStatus: () => true // Aceitar qualquer status para análise
      });

      console.log(`   📊 Status HTTP: ${response.status}`);

      if (response.status === 200 && response.data && response.data.booking) {
        console.log('   ✅ Dados encontrados via API não oficial!');
        return this.parseGolApiResponse(response.data.booking, localizador, sobrenome);
      }

      console.log(`   ⚠️ API não retornou dados válidos (Status: ${response.status})`);

      // TENTATIVA 2: Scraping com Puppeteer (mais confiável)
      console.log('🌐 [2/3] Tentando scraping com Puppeteer...');
      const puppeteerResult = await this.scrapeGolWithPuppeteer(localizador, sobrenome);
      if (puppeteerResult) {
        console.log('   ✅ Dados encontrados via Puppeteer!');
        return puppeteerResult;
      }

      console.log('   ⚠️ Puppeteer não encontrou dados');

      // TENTATIVA 3: Scraping direto (último recurso)
      console.log('📄 [3/3] Tentando scraping direto do HTML...');
      const scrapingResult = await this.scrapeGolDirect(localizador, sobrenome);
      if (scrapingResult) {
        console.log('   ✅ Dados encontrados via scraping direto!');
        return scrapingResult;
      }

      console.log('   ❌ Scraping direto não encontrou dados');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ GOL - Reserva não encontrada após 3 tentativas');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return null;

    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ GOL - Erro crítico na busca:', error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Dados: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return null;
    }
  }

  /**
   * Busca reserva real na LATAM
   * NOTA: LATAM não possui API pública. Este método tenta endpoints não oficiais
   * e fallback para scraping. Requer parceria via GDS para API oficial.
   */
  async searchLatamBooking(localizador: string, sobrenome: string): Promise<RealFlightData | null> {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 LATAM - Iniciando busca de reserva`);
    console.log(`   Localizador: ${localizador}`);
    console.log(`   Sobrenome: ${sobrenome}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    try {
      // TENTATIVA 1: API não oficial
      console.log('📡 [1/2] Tentando endpoint não oficial da LATAM...');
      const apiUrl = 'https://www.latam.com/ws-booking/booking/search';

      const response = await axios.post(apiUrl, {
        bookingCode: localizador.toUpperCase(),
        lastName: sobrenome.toUpperCase(),
        language: 'PT',
        country: 'BR'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'X-LATAM-App': 'web',
          'X-LATAM-Language': 'pt',
          'X-LATAM-Country': 'br',
          'Origin': 'https://www.latam.com',
          'Referer': 'https://www.latam.com/pt_br/apps/personas/mybookings'
        },
        timeout: 15000,
        validateStatus: () => true
      });

      console.log(`   📊 Status HTTP: ${response.status}`);

      if (response.status === 200 && response.data && response.data.data) {
        console.log('   ✅ Dados encontrados via API não oficial!');
        return this.parseLatamApiResponse(response.data.data, localizador, sobrenome);
      }

      console.log(`   ⚠️ API não retornou dados válidos (Status: ${response.status})`);

      // TENTATIVA 2: Scraping direto
      console.log('📄 [2/2] Tentando scraping direto do HTML...');
      const scrapingResult = await this.scrapeLatamDirect(localizador, sobrenome);
      if (scrapingResult) {
        console.log('   ✅ Dados encontrados via scraping!');
        return scrapingResult;
      }

      console.log('   ❌ Scraping não encontrou dados');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ LATAM - Reserva não encontrada após 2 tentativas');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return null;

    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ LATAM - Erro crítico na busca:', error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Dados: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Última tentativa: scraping
      console.log('📄 Tentando scraping como último recurso...');
      return await this.scrapeLatamDirect(localizador, sobrenome);
    }
  }

  /**
   * Busca reserva real na Azul
   * NOTA: Azul NÃO possui API pública. Acesso apenas via contato comercial:
   * suporte.azulws@voeazul.com.br
   * Este método tenta endpoints não oficiais e fallback para scraping.
   */
  async searchAzulBooking(localizador: string, sobrenome: string): Promise<RealFlightData | null> {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 AZUL - Iniciando busca de reserva`);
    console.log(`   Localizador: ${localizador}`);
    console.log(`   Sobrenome: ${sobrenome}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    try {
      // TENTATIVA 1: API não oficial
      console.log('📡 [1/2] Tentando endpoint não oficial da Azul...');
      const apiUrl = 'https://www.voeazul.com.br/api/reservations/search';

      const response = await axios.post(apiUrl, {
        pnr: localizador.toUpperCase(),
        lastName: sobrenome.toUpperCase()
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'X-Azul-Channel': 'WEB',
          'Origin': 'https://www.voeazul.com.br',
          'Referer': 'https://www.voeazul.com.br/br/pt/home/minhas-viagens'
        },
        timeout: 15000,
        validateStatus: () => true
      });

      console.log(`   📊 Status HTTP: ${response.status}`);

      if (response.status === 200 && response.data && response.data.reservation) {
        console.log('   ✅ Dados encontrados via API não oficial!');
        return this.parseAzulApiResponse(response.data.reservation, localizador, sobrenome);
      }

      console.log(`   ⚠️ API não retornou dados válidos (Status: ${response.status})`);

      // TENTATIVA 2: Scraping direto
      console.log('📄 [2/2] Tentando scraping direto do HTML...');
      const scrapingResult = await this.scrapeAzulDirect(localizador, sobrenome);
      if (scrapingResult) {
        console.log('   ✅ Dados encontrados via scraping!');
        return scrapingResult;
      }

      console.log('   ❌ Scraping não encontrou dados');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ AZUL - Reserva não encontrada após 2 tentativas');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return null;

    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ AZUL - Erro crítico na busca:', error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Dados: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Última tentativa: scraping
      console.log('📄 Tentando scraping como último recurso...');
      return await this.scrapeAzulDirect(localizador, sobrenome);
    }
  }

  /**
   * Scraping direto da GOL
   */
  private async scrapeGolDirect(localizador: string, sobrenome: string): Promise<RealFlightData | null> {
    try {
      const url = `https://www.voegol.com.br/pt/servicos/minhas-viagens?search=${localizador}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      // Buscar informações no HTML
      const flightInfo = {
        numeroVoo: $('.flight-number').first().text().trim() ||
                  $('[data-flight]').first().text().trim(),
        origem: $('.departure-airport').first().text().trim() ||
               $('.origin-code').first().text().trim(),
        destino: $('.arrival-airport').first().text().trim() ||
                $('.destination-code').first().text().trim(),
        dataPartida: $('.departure-date').first().text().trim(),
        horarioPartida: $('.departure-time').first().text().trim(),
        status: $('.flight-status').first().text().trim() || 'Confirmado'
      };

      if (flightInfo.numeroVoo && flightInfo.origem) {
        return {
          localizador,
          sobrenome,
          origem: flightInfo.origem,
          destino: flightInfo.destino,
          dataPartida: flightInfo.dataPartida || new Date().toISOString().split('T')[0],
          horarioPartida: flightInfo.horarioPartida || '00:00',
          numeroVoo: flightInfo.numeroVoo,
          companhia: 'GOL',
          status: flightInfo.status
        };
      }

      return null;
    } catch (error) {
      console.error('Erro no scraping direto GOL:', error);
      return null;
    }
  }

  /**
   * Scraping direto da LATAM
   */
  private async scrapeLatamDirect(localizador: string, sobrenome: string): Promise<RealFlightData | null> {
    try {
      const url = `https://www.latam.com/pt_br/apps/personas/mybookings?code=${localizador}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept-Language': 'pt-BR,pt;q=0.9'
        }
      });

      const $ = cheerio.load(response.data);

      const flightInfo = {
        numeroVoo: $('.flight-code').first().text().trim(),
        origem: $('.origin-airport').first().text().trim(),
        destino: $('.destination-airport').first().text().trim(),
        dataPartida: $('.flight-date').first().text().trim(),
        horarioPartida: $('.departure-hour').first().text().trim()
      };

      if (flightInfo.numeroVoo) {
        return {
          localizador,
          sobrenome,
          origem: flightInfo.origem,
          destino: flightInfo.destino,
          dataPartida: flightInfo.dataPartida || new Date().toISOString().split('T')[0],
          horarioPartida: flightInfo.horarioPartida || '00:00',
          numeroVoo: flightInfo.numeroVoo,
          companhia: 'LATAM',
          status: 'Confirmado'
        };
      }

      return null;
    } catch (error) {
      console.error('Erro no scraping direto LATAM:', error);
      return null;
    }
  }

  /**
   * Scraping direto da Azul
   */
  private async scrapeAzulDirect(localizador: string, sobrenome: string): Promise<RealFlightData | null> {
    try {
      const url = `https://www.voeazul.com.br/br/pt/home/minhas-viagens/buscar-reserva?pnr=${localizador}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const $ = cheerio.load(response.data);

      const flightInfo = {
        numeroVoo: $('.flight-number').first().text().trim(),
        origem: $('.departure-city').first().text().trim(),
        destino: $('.arrival-city').first().text().trim(),
        dataPartida: $('.travel-date').first().text().trim(),
        horarioPartida: $('.departure-time').first().text().trim()
      };

      if (flightInfo.numeroVoo) {
        return {
          localizador,
          sobrenome,
          origem: flightInfo.origem,
          destino: flightInfo.destino,
          dataPartida: flightInfo.dataPartida || new Date().toISOString().split('T')[0],
          horarioPartida: flightInfo.horarioPartida || '00:00',
          numeroVoo: flightInfo.numeroVoo,
          companhia: 'AZUL',
          status: 'Confirmado'
        };
      }

      return null;
    } catch (error) {
      console.error('Erro no scraping direto Azul:', error);
      return null;
    }
  }

  /**
   * Scraping com Puppeteer (mais confiável mas mais lento)
   */
  private async scrapeGolWithPuppeteer(localizador: string, sobrenome: string): Promise<RealFlightData | null> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.goto('https://www.voegol.com.br/pt/servicos/minhas-viagens', {
        waitUntil: 'networkidle2'
      });

      // Preencher formulário
      await page.type('#booking-code', localizador);
      await page.type('#last-name', sobrenome);
      await page.click('#search-booking-button');

      // Aguardar resultados
      await page.waitForSelector('.booking-details', { timeout: 10000 });

      // Extrair dados
      const flightData = await page.evaluate(() => {
        const flight = document.querySelector('.flight-info');
        if (!flight) return null;

        return {
          numeroVoo: flight.querySelector('.flight-number')?.textContent?.trim(),
          origem: flight.querySelector('.origin')?.textContent?.trim(),
          destino: flight.querySelector('.destination')?.textContent?.trim(),
          dataPartida: flight.querySelector('.date')?.textContent?.trim(),
          horarioPartida: flight.querySelector('.time')?.textContent?.trim(),
          status: flight.querySelector('.status')?.textContent?.trim()
        };
      });

      if (flightData && flightData.numeroVoo) {
        return {
          localizador,
          sobrenome,
          origem: flightData.origem || '',
          destino: flightData.destino || '',
          dataPartida: flightData.dataPartida || '',
          horarioPartida: flightData.horarioPartida || '',
          numeroVoo: flightData.numeroVoo,
          companhia: 'GOL',
          status: flightData.status || 'Confirmado'
        };
      }

      return null;
    } catch (error) {
      console.error('Erro no Puppeteer:', error);
      return null;
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Parse dos dados do FlightRadar24
   */
  private parseFlightRadarData(data: any, flightNumber: string): any {
    try {
      // Se for array, pegar primeiro resultado
      const flight = Array.isArray(data) ? data[0] : data;

      if (!flight) return null;

      return {
        numeroVoo: flightNumber,
        origem: flight.origin || flight.departure?.airport || '',
        destino: flight.destination || flight.arrival?.airport || '',
        horarioPartida: flight.departure?.time || '',
        horarioChegada: flight.arrival?.time || '',
        status: flight.status || 'Em voo',
        companhia: flight.airline || this.detectAirlineFromFlightNumber(flightNumber),
        altitude: flight.altitude,
        velocidade: flight.speed,
        latitude: flight.latitude,
        longitude: flight.longitude
      };
    } catch (error) {
      console.error('Erro ao fazer parse dos dados:', error);
      return null;
    }
  }

  /**
   * Parse da resposta da API da GOL
   */
  private parseGolApiResponse(booking: any, localizador: string, sobrenome: string): RealFlightData {
    const flight = booking.flights?.[0] || booking;

    return {
      localizador,
      sobrenome,
      origem: flight.origin || '',
      destino: flight.destination || '',
      dataPartida: flight.departureDate || '',
      horarioPartida: flight.departureTime || '',
      numeroVoo: flight.flightNumber || '',
      companhia: 'GOL',
      status: flight.status || 'Confirmado',
      portao: flight.gate,
      terminal: flight.terminal,
      assento: flight.seat
    };
  }

  /**
   * Parse da resposta da API da LATAM
   */
  private parseLatamApiResponse(data: any, localizador: string, sobrenome: string): RealFlightData {
    const segment = data.segments?.[0] || data;

    return {
      localizador,
      sobrenome,
      origem: segment.departureAirport || '',
      destino: segment.arrivalAirport || '',
      dataPartida: segment.departureDate || '',
      horarioPartida: segment.departureTime || '',
      numeroVoo: segment.flightNumber || '',
      companhia: 'LATAM',
      status: segment.status || 'Confirmado',
      portao: segment.departureGate,
      terminal: segment.departureTerminal,
      assento: segment.seatNumber
    };
  }

  /**
   * Parse da resposta da API da Azul
   */
  private parseAzulApiResponse(reservation: any, localizador: string, sobrenome: string): RealFlightData {
    const flight = reservation.segments?.[0] || reservation;

    return {
      localizador,
      sobrenome,
      origem: flight.from || '',
      destino: flight.to || '',
      dataPartida: flight.date || '',
      horarioPartida: flight.departureTime || '',
      numeroVoo: flight.flightNumber || '',
      companhia: 'AZUL',
      status: flight.status || 'Confirmado',
      portao: flight.gate,
      terminal: flight.terminal,
      assento: flight.seat
    };
  }

  /**
   * Detecta companhia aérea pelo número do voo
   */
  private detectAirlineFromFlightNumber(flightNumber: string): string {
    const upper = flightNumber.toUpperCase();

    if (upper.startsWith('G3') || upper.startsWith('GLO')) return 'GOL';
    if (upper.startsWith('LA') || upper.startsWith('TAM') || upper.startsWith('JJ')) return 'LATAM';
    if (upper.startsWith('AD') || upper.startsWith('AZU')) return 'AZUL';
    if (upper.startsWith('AV')) return 'AVIANCA';

    return 'DESCONHECIDA';
  }

  /**
   * Busca voos por aeroporto (partidas/chegadas)
   */
  async searchFlightsByAirport(airportCode: string, type: 'departures' | 'arrivals' = 'departures'): Promise<any[]> {
    try {
      console.log(`🔍 Buscando ${type} do aeroporto: ${airportCode}`);

      // Tentar AirLabs primeiro
      if (this.airLabsService.isConfigured()) {
        console.log('🔄 Buscando no AirLabs...');
        const flights = await this.airLabsService.getAirportSchedule(airportCode, type);
        if (flights && flights.length > 0) {
          console.log(`✅ ${flights.length} voos encontrados no AirLabs`);
          return flights.map(f => this.airLabsService.convertToStandardFormat(f));
        }
      }

      // Tentar Aviationstack
      if (this.aviationstackService.isConfigured()) {
        console.log('🔄 Buscando no Aviationstack...');
        const flights = await this.aviationstackService.getAirportFlights(airportCode, type);
        if (flights && flights.length > 0) {
          console.log(`✅ ${flights.length} voos encontrados no Aviationstack`);
          return flights.map(f => this.aviationstackService.convertToStandardFormat(f));
        }
      }

      console.log('❌ Nenhum voo encontrado');
      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar voos do aeroporto:', error);
      return [];
    }
  }

  /**
   * Busca voos por rota (origem → destino)
   */
  async searchFlightsByRoute(origin: string, destination: string, date?: string): Promise<any[]> {
    try {
      console.log(`🔍 Buscando voos: ${origin} → ${destination}`);

      // Tentar AirLabs primeiro
      if (this.airLabsService.isConfigured()) {
        console.log('🔄 Buscando no AirLabs...');
        const flights = await this.airLabsService.getFlightsByRoute(origin, destination);
        if (flights && flights.length > 0) {
          console.log(`✅ ${flights.length} voos encontrados no AirLabs`);
          return flights.map(f => this.airLabsService.convertToStandardFormat(f));
        }
      }

      // Tentar Aviationstack
      if (this.aviationstackService.isConfigured()) {
        console.log('🔄 Buscando no Aviationstack...');
        const flights = await this.aviationstackService.getFlightsByRoute(origin, destination, date);
        if (flights && flights.length > 0) {
          console.log(`✅ ${flights.length} voos encontrados no Aviationstack`);
          return flights.map(f => this.aviationstackService.convertToStandardFormat(f));
        }
      }

      console.log('❌ Nenhum voo encontrado na rota');
      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar voos por rota:', error);
      return [];
    }
  }

  /**
   * Busca voos em tempo real (voos ativos no ar)
   */
  async searchLiveFlights(params?: { airline?: string; country?: string }): Promise<any[]> {
    try {
      console.log('🔍 Buscando voos em tempo real...');

      // AirLabs tem excelente suporte para live tracking
      if (this.airLabsService.isConfigured()) {
        console.log('🔄 Buscando no AirLabs...');
        const flights = await this.airLabsService.getLiveFlights({
          airline_iata: params?.airline,
          flag: params?.country || 'BR'
        });
        if (flights && flights.length > 0) {
          console.log(`✅ ${flights.length} voos em tempo real encontrados`);
          return flights.map(f => this.airLabsService.convertToStandardFormat(f));
        }
      }

      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar voos em tempo real:', error);
      return [];
    }
  }
}

// Singleton
let realFlightSearchService: RealFlightSearchService;

export function getRealFlightSearchService(): RealFlightSearchService {
  if (!realFlightSearchService) {
    realFlightSearchService = new RealFlightSearchService();
  }
  return realFlightSearchService;
}