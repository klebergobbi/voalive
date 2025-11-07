/**
 * GOL Airlines Scraper
 * Implementação específica para GOL
 */

import { BaseScraper, BookingStatus } from './base.scraper';

export class GolScraper extends BaseScraper {
  private readonly baseUrl = 'https://b2c.voegol.com.br';

  constructor() {
    super('GolScraper');
  }

  async checkBookingStatus(pnr: string, lastName: string, origin?: string): Promise<BookingStatus> {
    try {
      await this.initialize();

      this.logger.info(`Consultando reserva GOL - PNR: ${pnr}`);

      // Navegar para página de consulta (novo site B2C)
      await this.page!.goto(`${this.baseUrl}/minhas-viagens/encontrar-viagem`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await this.randomDelay();

      // Aguardar carregar formulário
      await this.page!.waitForTimeout(2000);

      // Preencher dados (NOVO: incluindo campo origem)
      const localizadorSelector = '#localizador, input[name="localizador"], input[name="recordLocator"], input[placeholder*="localizador"], input[id*="booking"]';
      const sobrenomeSelector = '#sobrenome, input[name="sobrenome"], input[name="lastName"], input[placeholder*="sobrenome"], input[id*="lastName"]';
      const origemSelector = '#origem, input[name="origem"], input[name="origin"], input[placeholder*="origem"]';

      try {
        await this.page!.waitForSelector(localizadorSelector, { timeout: 10000 });
        await this.page!.type(localizadorSelector, pnr, { delay: 100 });
        await this.randomDelay(300, 600);

        await this.page!.type(sobrenomeSelector, lastName, { delay: 100 });
        await this.randomDelay(300, 600);

        // NOVO: Preencher campo origem se fornecido
        if (origin) {
          try {
            await this.page!.waitForSelector(origemSelector, { timeout: 5000 });
            await this.page!.type(origemSelector, origin, { delay: 100 });
            await this.randomDelay(300, 600);
            this.logger.info(`Campo origem preenchido: ${origin}`);
          } catch (err) {
            this.logger.warn('Campo origem não encontrado, prosseguindo sem ele');
          }
        }
      } catch (error) {
        this.logger.warn('Seletores GOL padrão não encontrados, tentando alternativas...');
        await this.screenshot('gol_form_error');

        // Tentativa alternativa
        await this.page!.evaluate((data) => {
          const inputs = Array.from(document.querySelectorAll('input'));
          const locInput = inputs.find(i =>
            i.placeholder?.toLowerCase().includes('localizador') ||
            i.id?.includes('localizador') ||
            i.name?.includes('localizador')
          );
          const surnameInput = inputs.find(i =>
            i.placeholder?.toLowerCase().includes('sobrenome') ||
            i.id?.includes('sobrenome') ||
            i.name?.includes('sobrenome')
          );

          if (locInput) {
            locInput.value = data.pnr;
            locInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (surnameInput) {
            surnameInput.value = data.lastName;
            surnameInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, { pnr, lastName });
      }

      // Verificar CAPTCHA
      if (await this.hasCaptcha()) {
        throw new Error('CAPTCHA detectado - necessário resolução manual');
      }

      // Submeter formulário
      await Promise.all([
        this.page!.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {}),
        this.page!.click('button[type="submit"], button:has-text("Consultar"), button:has-text("Buscar")').catch(async () => {
          // Alternativa: encontrar botão por conteúdo
          await this.page!.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b =>
              b.textContent?.toLowerCase().includes('consultar') ||
              b.textContent?.toLowerCase().includes('buscar') ||
              b.textContent?.toLowerCase().includes('verificar')
            );
            if (btn) btn.click();
          });
        }),
      ]);

      await this.randomDelay(1500, 2500);

      // Verificar se reserva foi encontrada
      const errorSelectors = [
        ':has-text("não encontrada")',
        ':has-text("não localizada")',
        ':has-text("inválida")',
        '.error-message',
        '[class*="error"]',
      ];

      for (const selector of errorSelectors) {
        const element = await this.page!.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text?.toLowerCase().includes('não') || text?.toLowerCase().includes('inválid')) {
            throw new Error('Reserva não encontrada na GOL');
          }
        }
      }

      // Extrair informações
      const bookingInfo = await this.page!.evaluate(() => {
        const getTextContent = (selector: string) => {
          const el = document.querySelector(selector);
          return el?.textContent?.trim() || '';
        };

        const getAllTexts = (selector: string) => {
          const elements = Array.from(document.querySelectorAll(selector));
          return elements.map(el => el.textContent?.trim() || '').filter(t => t);
        };

        return {
          status: getTextContent('.status-reserva, [class*="status"], [data-status]'),
          flight: getTextContent('.numero-voo, [class*="flight-number"], [data-flight]'),
          route: getTextContent('.trecho, [class*="route"], .origem-destino'),
          date: getTextContent('.data-voo, [class*="date"]'),
          departureTime: getTextContent('.horario-partida, [class*="departure-time"]'),
          arrivalTime: getTextContent('.horario-chegada, [class*="arrival-time"]'),
          passengers: getAllTexts('.nome-passageiro, [class*="passenger-name"]'),
          seats: getAllTexts('.assento, [class*="seat"]'),
          gate: getTextContent('.portao, [class*="gate"]'),
          terminal: getTextContent('.terminal'),
          aircraft: getTextContent('.aeronave, [class*="aircraft"]'),
          class: getTextContent('.classe, [class*="class"]'),
        };
      });

      this.logger.info('Dados extraídos da GOL:', bookingInfo);

      // Parsear rota
      const [departure, arrival] = (bookingInfo.route || '')
        .split(/[-→>]/)
        .map(s => s.trim())
        .filter(s => s);

      const result: BookingStatus = {
        pnr: pnr.toUpperCase(),
        status: bookingInfo.status || 'UNKNOWN',
        statusCode: this.parseGolStatus(bookingInfo.status),
        flightNumber: bookingInfo.flight || '',
        departure: departure || '',
        arrival: arrival || '',
        date: bookingInfo.date || new Date().toISOString(),
        departureTime: bookingInfo.departureTime,
        arrivalTime: bookingInfo.arrivalTime,
        passengers: bookingInfo.passengers,
        seatNumbers: bookingInfo.seats,
        gate: bookingInfo.gate,
        terminal: bookingInfo.terminal,
        aircraft: bookingInfo.aircraft,
        class: bookingInfo.class,
        rawData: bookingInfo,
      };

      this.logger.info('Consulta GOL concluída com sucesso');

      return result;
    } catch (error: any) {
      this.logger.error(`Erro ao consultar GOL PNR ${pnr}:`, error.message);
      await this.screenshot('gol_error');
      throw error;
    } finally {
      await this.close();
    }
  }

  private parseGolStatus(status: string): string {
    if (!status) return 'UN';

    const normalized = status.toLowerCase();

    if (normalized.includes('confirmad')) return 'HK';
    if (normalized.includes('cancelad')) return 'HX';
    if (normalized.includes('espera')) return 'WL';
    if (normalized.includes('pendente')) return 'UC';

    return this.mapStatusToCode(status);
  }
}
