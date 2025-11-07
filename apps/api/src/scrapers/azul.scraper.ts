/**
 * Azul Airlines Scraper
 * Implementação específica para Azul
 */

import { BaseScraper, BookingStatus } from './base.scraper';

export class AzulScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.voeazul.com.br';

  constructor() {
    super('AzulScraper');
  }

  async checkBookingStatus(pnr: string, lastName: string): Promise<BookingStatus> {
    try {
      await this.initialize();

      this.logger.info(`Consultando reserva Azul - PNR: ${pnr}`);

      // Navegar para página de consulta
      await this.page!.goto(`${this.baseUrl}/br/pt/minhas-viagens/gerenciar`, {
        waitUntil: 'load',
        timeout: 30000,
      });

      await this.randomDelay();

      // Aguardar formulário
      await this.page!.waitForTimeout(2000);

      // Preencher formulário Azul
      const pnrSelector = 'input#pnr, input[name="pnr"], input[placeholder*="código"], input[id*="booking"]';
      const surnameSelector = 'input#surname, input[name="surname"], input[placeholder*="sobrenome"]';

      try {
        await this.page!.waitForSelector(pnrSelector, { timeout: 10000 });
        await this.page!.fill(pnrSelector, pnr);
        await this.randomDelay(300, 600);

        await this.page!.fill(surnameSelector, lastName);
        await this.randomDelay(300, 600);
      } catch (error) {
        this.logger.warn('Seletores Azul padrão não encontrados, tentando alternativas...');
        await this.screenshot('azul_form_error');

        // Tentativa alternativa
        await this.page!.evaluate((data) => {
          const inputs = Array.from(document.querySelectorAll('input'));
          const pnrInput = inputs.find(i =>
            i.placeholder?.toLowerCase().includes('código') ||
            i.placeholder?.toLowerCase().includes('pnr') ||
            i.id?.includes('pnr') ||
            i.name?.includes('booking')
          );
          const nameInput = inputs.find(i =>
            i.placeholder?.toLowerCase().includes('sobrenome') ||
            i.placeholder?.toLowerCase().includes('surname') ||
            i.id?.includes('surname')
          );

          if (pnrInput) {
            pnrInput.value = data.pnr;
            pnrInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (nameInput) {
            nameInput.value = data.lastName;
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, { pnr, lastName });
      }

      // Verificar CAPTCHA
      if (await this.hasCaptcha()) {
        throw new Error('CAPTCHA detectado - necessário resolução manual');
      }

      // Tentar capturar resposta da API
      let apiResponse: any = null;

      this.page!.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/api/booking') || url.includes('/api/reservation')) {
          try {
            if (response.status() === 200) {
              apiResponse = await response.json();
              this.logger.info('Resposta da API Azul capturada');
            }
          } catch (error) {
            // Ignorar erros de parse
          }
        }
      });

      // Clicar e aguardar resposta
      await Promise.all([
        this.page!.waitForResponse(
          resp => (resp.url().includes('/api/booking') || resp.url().includes('/reservation')) && resp.status() === 200,
          { timeout: 15000 }
        ).catch(() => null),
        this.page!.click('button.buscar-reserva, button[type="submit"], button:has-text("Buscar")').catch(async () => {
          await this.page!.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b =>
              b.textContent?.toLowerCase().includes('buscar') ||
              b.textContent?.toLowerCase().includes('consultar')
            );
            if (btn) btn.click();
          });
        }),
      ]);

      await this.randomDelay(1500, 2500);

      // Tentar pegar dados da API primeiro
      let bookingData: any;

      if (apiResponse) {
        this.logger.info('Usando dados da API Azul');
        bookingData = this.normalizeAzulApiData(apiResponse);
      } else {
        // Fallback: scraping do HTML
        this.logger.info('API não disponível, fazendo scraping do HTML');
        bookingData = await this.page!.evaluate(() => {
          const getText = (selector: string) => {
            const el = document.querySelector(selector);
            return el?.textContent?.trim() || '';
          };

          const getAllTexts = (selector: string) => {
            const elements = Array.from(document.querySelectorAll(selector));
            return elements.map(el => el.textContent?.trim() || '').filter(t => t);
          };

          return {
            status: getText('.booking-status, [class*="status"]'),
            flightNumber: getText('.flight-info, [class*="flight-number"]'),
            route: getText('.route, [class*="route"]'),
            date: getText('.date, [class*="date"]'),
            departureTime: getText('[class*="departure-time"]'),
            arrivalTime: getText('[class*="arrival-time"]'),
            passengers: getAllTexts('[class*="passenger"]'),
            seats: getAllTexts('[class*="seat"]'),
            gate: getText('[class*="gate"]'),
            terminal: getText('[class*="terminal"]'),
            aircraft: getText('[class*="aircraft"]'),
            class: getText('[class*="class"], [class*="cabin"]'),
          };
        });
      }

      // Parsear rota
      const [departure, arrival] = (bookingData.route || '')
        .split(/[-→>]/)
        .map((s: string) => s.trim())
        .filter((s: string) => s);

      const result: BookingStatus = {
        pnr: pnr.toUpperCase(),
        status: bookingData.status || 'UNKNOWN',
        statusCode: this.mapAzulStatus(bookingData.status),
        flightNumber: bookingData.flightNumber || bookingData.flight || '',
        departure: departure || '',
        arrival: arrival || '',
        date: bookingData.date || new Date().toISOString(),
        departureTime: bookingData.departureTime,
        arrivalTime: bookingData.arrivalTime,
        passengers: bookingData.passengers || [],
        seatNumbers: bookingData.seats,
        gate: bookingData.gate,
        terminal: bookingData.terminal,
        aircraft: bookingData.aircraft,
        class: bookingData.class,
        rawData: bookingData,
      };

      this.logger.info('Consulta Azul concluída com sucesso');

      return result;
    } catch (error: any) {
      this.logger.error(`Erro ao consultar Azul PNR ${pnr}:`, error.message);
      await this.screenshot('azul_error');
      throw error;
    } finally {
      await this.close();
    }
  }

  private normalizeAzulApiData(data: any): any {
    return {
      status: data.status || data.bookingStatus,
      statusCode: this.mapAzulStatus(data.status || data.bookingStatus),
      flightNumber: data.flightNumber || data.flightInfo?.flightNumber,
      route: `${data.origin || ''}-${data.destination || ''}`,
      date: data.departureDate,
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      passengers: data.passengers?.map((p: any) => `${p.firstName} ${p.lastName}`) || [],
      seats: data.passengers?.map((p: any) => p.seat).filter(Boolean) || [],
      gate: data.departureGate,
      terminal: data.departureTerminal,
      aircraft: data.aircraft,
      class: data.cabin || data.class,
    };
  }

  private mapAzulStatus(status: string): string {
    if (!status) return 'UN';

    const map: Record<string, string> = {
      'CONFIRMED': 'HK',
      'CONFIRMADO': 'HK',
      'CANCELLED': 'HX',
      'CANCELADO': 'HX',
      'WAITLISTED': 'WL',
      'LISTA DE ESPERA': 'WL',
      'PENDING': 'UC',
      'PENDENTE': 'UC',
      'ON HOLD': 'HL',
      'EM ESPERA': 'HL',
    };

    const normalized = status?.toUpperCase().trim();
    return map[normalized] || this.mapStatusToCode(status);
  }
}
