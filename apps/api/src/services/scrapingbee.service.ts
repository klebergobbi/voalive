import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * SCRAPINGBEE SERVICE
 * Servico de scraping para contornar protecoes anti-bot
 */

export interface ReservationData {
  success: boolean;
  flightNumber?: string;
  airline?: string;
  origin?: string;
  originName?: string;
  destination?: string;
  destinationName?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  passengerName?: string;
  status?: string;
  cabin?: string;
  seat?: string;
  gate?: string;
  terminal?: string;
  error?: string;
  rawHtml?: string;
}

class ScrapingBeeService {
  private apiKey: string;
  private baseUrl = 'https://app.scrapingbee.com/api/v1/';

  constructor() {
    this.apiKey = process.env.SCRAPINGBEE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[ScrapingBee] API Key nao configurada!');
    } else {
      console.log('[ScrapingBee] Servico inicializado com API key');
    }
  }

  async scrapeAzul(pnr: string, lastName: string): Promise<ReservationData> {
    console.log('[ScrapingBee] AZUL - Buscando ' + pnr + '/' + lastName);

    try {
      const jsCode = `
        (function() {
          var inputs = document.querySelectorAll('input');
          for (var i = 0; i < inputs.length; i++) {
            var inp = inputs[i];
            var ph = (inp.placeholder || '').toLowerCase();
            var nm = (inp.name || '').toLowerCase();
            var id = (inp.id || '').toLowerCase();
            if (ph.indexOf('localizador') >= 0 || ph.indexOf('codigo') >= 0 || nm.indexOf('pnr') >= 0 || nm.indexOf('locator') >= 0 || id.indexOf('locator') >= 0) {
              inp.value = '${pnr}';
              inp.dispatchEvent(new Event('input', {bubbles: true}));
              break;
            }
          }
          for (var j = 0; j < inputs.length; j++) {
            var inp2 = inputs[j];
            var ph2 = (inp2.placeholder || '').toLowerCase();
            var nm2 = (inp2.name || '').toLowerCase();
            if (ph2.indexOf('sobrenome') >= 0 || nm2.indexOf('lastname') >= 0 || nm2.indexOf('sobrenome') >= 0) {
              inp2.value = '${lastName}';
              inp2.dispatchEvent(new Event('input', {bubbles: true}));
              break;
            }
          }
          setTimeout(function() {
            var btns = document.querySelectorAll('button[type=submit], button.btn-primary, .search-button');
            if (btns.length > 0) btns[0].click();
          }, 1000);
        })();
      `;

      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          url: 'https://www.voeazul.com.br/br/pt/home/minhas-viagens',
          render_js: true,
          premium_proxy: true,
          country_code: 'br',
          wait: 5000,
          js_scenario: JSON.stringify({
            instructions: [
              { wait: 3000 },
              { evaluate: jsCode },
              { wait: 8000 }
            ]
          })
        },
        timeout: 90000
      });

      console.log('[ScrapingBee] AZUL - HTML recebido (' + (response.data?.length || 0) + ' bytes)');
      return this.parseAzulHtml(response.data, pnr, lastName);

    } catch (error: any) {
      console.error('[ScrapingBee] AZUL - Erro:', error.message);
      return { success: false, error: error.message, airline: 'AZUL' };
    }
  }

  async scrapeGol(pnr: string, lastName: string): Promise<ReservationData> {
    console.log('[ScrapingBee] GOL - Buscando ' + pnr + '/' + lastName);

    try {
      const jsCode = `
        (function() {
          var inputs = document.querySelectorAll('input');
          for (var i = 0; i < inputs.length; i++) {
            var inp = inputs[i];
            var ph = (inp.placeholder || '').toLowerCase();
            var nm = (inp.name || '').toLowerCase();
            if (ph.indexOf('localizador') >= 0 || ph.indexOf('codigo') >= 0 || nm.indexOf('booking') >= 0 || nm.indexOf('locator') >= 0) {
              inp.value = '${pnr}';
              inp.dispatchEvent(new Event('input', {bubbles: true}));
              break;
            }
          }
          for (var j = 0; j < inputs.length; j++) {
            var inp2 = inputs[j];
            var ph2 = (inp2.placeholder || '').toLowerCase();
            var nm2 = (inp2.name || '').toLowerCase();
            if (ph2.indexOf('sobrenome') >= 0 || nm2.indexOf('lastname') >= 0) {
              inp2.value = '${lastName}';
              inp2.dispatchEvent(new Event('input', {bubbles: true}));
              break;
            }
          }
          setTimeout(function() {
            var btns = document.querySelectorAll('button[type=submit], .search-button, .btn-search');
            if (btns.length > 0) btns[0].click();
          }, 1000);
        })();
      `;

      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          url: 'https://b2c.voegol.com.br/compra/minhas-viagens',
          render_js: true,
          premium_proxy: true,
          country_code: 'br',
          wait: 5000,
          js_scenario: JSON.stringify({
            instructions: [
              { wait: 3000 },
              { evaluate: jsCode },
              { wait: 8000 }
            ]
          })
        },
        timeout: 90000
      });

      console.log('[ScrapingBee] GOL - HTML recebido (' + (response.data?.length || 0) + ' bytes)');
      return this.parseGolHtml(response.data, pnr, lastName);

    } catch (error: any) {
      console.error('[ScrapingBee] GOL - Erro:', error.message);
      return { success: false, error: error.message, airline: 'GOL' };
    }
  }

  async scrapeLatam(pnr: string, lastName: string, origin?: string): Promise<ReservationData> {
    console.log('[ScrapingBee] LATAM - Buscando ' + pnr + '/' + lastName + '/' + (origin || 'N/A'));

    try {
      let url = 'https://www.latamairlines.com/br/pt/minhas-viagens?pnr=' + pnr + '&lastName=' + lastName;
      if (origin) url += '&origin=' + origin;

      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          url: url,
          render_js: true,
          premium_proxy: true,
          country_code: 'br',
          wait: 10000,
          js_scenario: JSON.stringify({
            instructions: [
              { wait: 8000 }
            ]
          })
        },
        timeout: 90000
      });

      console.log('[ScrapingBee] LATAM - HTML recebido (' + (response.data?.length || 0) + ' bytes)');
      return this.parseLatamHtml(response.data, pnr, lastName);

    } catch (error: any) {
      console.error('[ScrapingBee] LATAM - Erro:', error.message);
      return { success: false, error: error.message, airline: 'LATAM' };
    }
  }

  private parseAzulHtml(html: string, pnr: string, lastName: string): ReservationData {
    try {
      const $ = cheerio.load(html);

      if (html.toLowerCase().includes('nao encontr') || html.toLowerCase().includes('não encontr')) {
        return { success: false, error: 'Reserva nao encontrada', airline: 'AZUL' };
      }

      const flightNumber = this.extractFirst($, [
        '[class*=flight-number]', '[class*=voo]', '[class*=codigo-voo]'
      ]);
      const origin = this.extractFirst($, [
        '[class*=origin] .code', '[class*=origem] .iata', '.departure-city code'
      ]);
      const destination = this.extractFirst($, [
        '[class*=destination] .code', '[class*=destino] .iata', '.arrival-city code'
      ]);
      const departureTime = this.extractFirst($, [
        '[class*=departure-time]', '.hora-partida', '[class*=horario-saida]'
      ]);
      const status = this.extractFirst($, [
        '[class*=status]', '.booking-status'
      ]) || 'CONFIRMED';

      if (!flightNumber && !origin && !destination) {
        console.log('[ScrapingBee] AZUL - Sem dados extraidos');
        return {
          success: false,
          error: 'Nao foi possivel extrair dados',
          airline: 'AZUL',
          rawHtml: html.substring(0, 3000)
        };
      }

      return {
        success: true,
        flightNumber: flightNumber || 'AD' + pnr.substring(0, 4),
        airline: 'AZUL',
        origin,
        destination,
        departureTime,
        status,
        passengerName: lastName
      };
    } catch (e: any) {
      return { success: false, error: e.message, airline: 'AZUL' };
    }
  }

  private parseGolHtml(html: string, pnr: string, lastName: string): ReservationData {
    try {
      const $ = cheerio.load(html);

      if (html.toLowerCase().includes('nao encontr') || html.toLowerCase().includes('não encontr')) {
        return { success: false, error: 'Reserva nao encontrada', airline: 'GOL' };
      }

      const flightNumber = this.extractFirst($, [
        '[class*=flight-number]', '.numero-voo', '[class*=voo]'
      ]);
      const origin = this.extractFirst($, [
        '[class*=origin]', '.cidade-origem .iata'
      ]);
      const destination = this.extractFirst($, [
        '[class*=destination]', '.cidade-destino .iata'
      ]);
      const departureTime = this.extractFirst($, [
        '[class*=departure-time]', '.hora-saida'
      ]);
      const status = this.extractFirst($, [
        '[class*=status]'
      ]) || 'CONFIRMED';

      if (!flightNumber && !origin && !destination) {
        return {
          success: false,
          error: 'Nao foi possivel extrair dados',
          airline: 'GOL',
          rawHtml: html.substring(0, 3000)
        };
      }

      return {
        success: true,
        flightNumber: flightNumber || 'G3' + pnr.substring(0, 4),
        airline: 'GOL',
        origin,
        destination,
        departureTime,
        status,
        passengerName: lastName
      };
    } catch (e: any) {
      return { success: false, error: e.message, airline: 'GOL' };
    }
  }

  private parseLatamHtml(html: string, pnr: string, lastName: string): ReservationData {
    try {
      const $ = cheerio.load(html);

      if (html.toLowerCase().includes('nao encontr') || html.toLowerCase().includes('não encontr') || html.toLowerCase().includes('no encontr')) {
        return { success: false, error: 'Reserva nao encontrada', airline: 'LATAM' };
      }

      const flightNumber = this.extractFirst($, [
        '[class*=flight-number]', '.numero-vuelo', '[class*=flight]'
      ]);
      const origin = this.extractFirst($, [
        '[class*=origin]', '.aeropuerto-origen'
      ]);
      const destination = this.extractFirst($, [
        '[class*=destination]', '.aeropuerto-destino'
      ]);
      const departureTime = this.extractFirst($, [
        '[class*=departure-time]', '.hora-salida'
      ]);
      const status = this.extractFirst($, [
        '[class*=status]'
      ]) || 'CONFIRMED';

      if (!flightNumber && !origin && !destination) {
        return {
          success: false,
          error: 'Nao foi possivel extrair dados',
          airline: 'LATAM',
          rawHtml: html.substring(0, 3000)
        };
      }

      return {
        success: true,
        flightNumber: flightNumber || 'LA' + pnr.substring(0, 4),
        airline: 'LATAM',
        origin,
        destination,
        departureTime,
        status,
        passengerName: lastName
      };
    } catch (e: any) {
      return { success: false, error: e.message, airline: 'LATAM' };
    }
  }

  private extractFirst($: cheerio.CheerioAPI, selectors: string[]): string | undefined {
    for (const sel of selectors) {
      const txt = $(sel).first().text().trim();
      if (txt) return txt;
    }
    return undefined;
  }

  async search(airline: string, pnr: string, lastName: string, origin?: string): Promise<ReservationData> {
    switch (airline.toUpperCase()) {
      case 'AZUL':
      case 'AD':
        return this.scrapeAzul(pnr, lastName);
      case 'GOL':
      case 'G3':
        return this.scrapeGol(pnr, lastName);
      case 'LATAM':
      case 'LA':
      case 'JJ':
        return this.scrapeLatam(pnr, lastName, origin);
      default:
        return { success: false, error: 'Companhia nao suportada: ' + airline };
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 20;
  }
}

let instance: ScrapingBeeService | null = null;

export function getScrapingBeeService(): ScrapingBeeService {
  if (!instance) {
    instance = new ScrapingBeeService();
  }
  return instance;
}

export default ScrapingBeeService;
