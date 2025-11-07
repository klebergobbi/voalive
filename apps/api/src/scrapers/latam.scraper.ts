/**
 * LATAM Airlines Scraper
 * Implementação específica para LATAM
 */

import { BaseScraper, BookingStatus } from './base.scraper';

export class LatamScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.latamairlines.com';

  constructor() {
    super('LatamScraper');
  }

  async checkBookingStatus(pnr: string, lastName: string): Promise<BookingStatus> {
    try {
      await this.initialize();

      this.logger.info(`Consultando reserva LATAM - PNR: ${pnr}`);

      // Navegar para página de consulta
      await this.page!.goto(`${this.baseUrl}/br/pt/minhas-viagens`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      await this.randomDelay();

      // Preencher formulário
      const codeSelector = 'input[name="reservationCode"], input[id="bookingCode"], input[placeholder*="código"], input[placeholder*="localizador"]';
      const lastNameSelector = 'input[name="lastName"], input[id="lastName"], input[placeholder*="sobrenome"]';

      try {
        await this.page!.waitForSelector(codeSelector, { timeout: 10000 });
        await this.page!.fill(codeSelector, pnr);
        await this.randomDelay(200, 500);

        await this.page!.fill(lastNameSelector, lastName);
        await this.randomDelay(200, 500);
      } catch (error) {
        this.logger.warn('Seletores padrão não encontrados, tentando alternativas...');
        await this.screenshot('latam_form_error');

        // Tentar preenchimento alternativo
        await this.page!.evaluate((data) => {
          const inputs = Array.from(document.querySelectorAll('input'));
          const codeInput = inputs.find(i =>
            i.placeholder?.toLowerCase().includes('código') ||
            i.placeholder?.toLowerCase().includes('localizador') ||
            i.name?.includes('code')
          );
          const nameInput = inputs.find(i =>
            i.placeholder?.toLowerCase().includes('sobrenome') ||
            i.placeholder?.toLowerCase().includes('name') ||
            i.name?.includes('lastName')
          );

          if (codeInput) codeInput.value = data.pnr;
          if (nameInput) nameInput.value = data.lastName;
        }, { pnr, lastName });
      }

      // Verificar CAPTCHA
      if (await this.hasCaptcha()) {
        throw new Error('CAPTCHA detectado - necessário resolução manual');
      }

      // Clicar no botão de busca
      const submitSelector = 'button[type="submit"], button:has-text("Buscar"), button:has-text("Consultar")';

      await Promise.all([
        this.page!.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {}),
        this.page!.click(submitSelector).catch(async () => {
          // Tentar encontrar botão por texto
          await this.page!.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const submitBtn = buttons.find(b =>
              b.textContent?.toLowerCase().includes('buscar') ||
              b.textContent?.toLowerCase().includes('consultar')
            );
            if (submitBtn) submitBtn.click();
          });
        }),
      ]);

      await this.randomDelay(1000, 2000);

      // Verificar se reserva foi encontrada
      const notFoundSelectors = [
        ':has-text("não encontrada")',
        ':has-text("not found")',
        ':has-text("inválido")',
        ':has-text("invalid")',
      ];

      for (const selector of notFoundSelectors) {
        const element = await this.page!.$(selector);
        if (element) {
          throw new Error('Reserva não encontrada');
        }
      }

      // Aguardar carregamento dos dados da reserva
      await this.page!.waitForTimeout(2000);

      // Extrair dados da reserva
      const bookingData = await this.page!.evaluate(() => {
        // Função auxiliar para pegar texto de elemento
        const getText = (selector: string): string => {
          const el = document.querySelector(selector);
          return el?.textContent?.trim() || '';
        };

        // Função auxiliar para pegar múltiplos elementos
        const getMultipleTexts = (selector: string): string[] => {
          const elements = Array.from(document.querySelectorAll(selector));
          return elements.map(el => el.textContent?.trim() || '').filter(t => t);
        };

        // Tentar diferentes seletores para cada campo
        const status = getText('.booking-status') ||
          getText('[class*="status"]') ||
          getText('[data-status]') ||
          '';

        const flightNumber = getText('.flight-number') ||
          getText('[class*="flight"]') ||
          getText('[data-flight]') ||
          '';

        const route = getText('.route-info') ||
          getText('[class*="route"]') ||
          '';

        const departureTime = getText('.departure-time') ||
          getText('[class*="departure"]') ||
          '';

        const arrivalTime = getText('.arrival-time') ||
          getText('[class*="arrival"]') ||
          '';

        const date = getText('.flight-date') ||
          getText('[class*="date"]') ||
          '';

        const passengers = getMultipleTexts('.passenger-name, [class*="passenger"]');
        const seats = getMultipleTexts('.seat-number, [class*="seat"]');
        const gate = getText('.gate, [class*="gate"]');
        const terminal = getText('.terminal, [class*="terminal"]');
        const aircraft = getText('.aircraft, [class*="aircraft"]');
        const bookingClass = getText('.class, [class*="class"]');

        return {
          status,
          flightNumber,
          route,
          date,
          departureTime,
          arrivalTime,
          passengers,
          seats,
          gate,
          terminal,
          aircraft,
          bookingClass,
          html: document.body.innerHTML.substring(0, 1000), // Primeiros 1000 chars para debug
        };
      });

      this.logger.info('Dados extraídos da LATAM:', bookingData);

      // Parsear rota
      const [departure, arrival] = (bookingData.route || '')
        .split(/[-→>]/)
        .map(s => s.trim())
        .filter(s => s);

      // Montar resultado
      const result: BookingStatus = {
        pnr: pnr.toUpperCase(),
        status: bookingData.status || 'UNKNOWN',
        statusCode: this.mapStatusToCode(bookingData.status),
        flightNumber: bookingData.flightNumber || '',
        departure: departure || '',
        arrival: arrival || '',
        date: bookingData.date || new Date().toISOString(),
        departureTime: bookingData.departureTime,
        arrivalTime: bookingData.arrivalTime,
        passengers: bookingData.passengers,
        seatNumbers: bookingData.seats,
        gate: bookingData.gate,
        terminal: bookingData.terminal,
        aircraft: bookingData.aircraft,
        class: bookingData.bookingClass,
        rawData: bookingData,
      };

      this.logger.info('Consulta LATAM concluída com sucesso');

      return result;
    } catch (error: any) {
      this.logger.error(`Erro ao consultar LATAM PNR ${pnr}:`, error.message);
      await this.screenshot('latam_error');
      throw error;
    } finally {
      await this.close();
    }
  }
}
