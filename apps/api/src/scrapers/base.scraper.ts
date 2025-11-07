/**
 * Base Scraper
 * Classe abstrata base para todos os scrapers de companhias aéreas
 *
 * Features:
 * - Anti-detecção com Playwright
 * - Rotação de User Agents
 * - Randomização de timings
 * - Stealth mode completo
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Logger } from '../utils/logger.util';

export interface ScraperOptions {
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

export interface BookingStatus {
  pnr: string;
  status: string;          // "Confirmado", "Cancelado", etc
  statusCode: string;      // HK, HX, WL, HL (IATA codes)
  flightNumber: string;
  departure: string;       // Código IATA (ex: GRU)
  arrival: string;         // Código IATA (ex: BSB)
  date: string;           // ISO 8601
  departureTime?: string;
  arrivalTime?: string;
  passengers: string[];
  seatNumbers?: string[];
  gate?: string;
  terminal?: string;
  aircraft?: string;
  class?: string;
  rawData?: any;
}

export abstract class BaseScraper {
  protected readonly logger: Logger;
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;

  protected readonly defaultOptions: ScraperOptions = {
    headless: true,
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  };

  protected readonly userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  ];

  constructor(protected readonly scraperName: string) {
    this.logger = new Logger(scraperName);
  }

  /**
   * Inicializa o browser com configurações anti-detecção
   */
  async initialize(options?: ScraperOptions): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    this.logger.info('Inicializando browser...');

    // Launcher browser com configurações stealth
    this.browser = await chromium.launch({
      headless: opts.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    // Criar contexto com anti-detecção
    this.context = await this.browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: opts.viewport,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      permissions: [],
      javaScriptEnabled: true,
      bypassCSP: true,
      ignoreHTTPSErrors: true,
    });

    // Injetar scripts anti-detecção
    await this.context.addInitScript(() => {
      // Ocultar webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Ocultar automation
      (window as any).chrome = {
        runtime: {},
      };

      // Adicionar plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['pt-BR', 'pt', 'en-US', 'en'],
      });

      // WebGL Vendor
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.call(this, parameter);
      };
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(opts.timeout);

    this.logger.info('Browser inicializado com sucesso');
  }

  /**
   * Fecha o browser
   */
  async close(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.logger.info('Browser fechado');
    } catch (error) {
      this.logger.error('Erro ao fechar browser:', error);
    }
  }

  /**
   * Delay aleatório para simular comportamento humano
   */
  protected async randomDelay(min: number = 300, max: number = 1500): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Retorna user agent aleatório
   */
  protected getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Mapeia status textual para código IATA
   */
  protected mapStatusToCode(status: string): string {
    const statusMap: Record<string, string> = {
      'confirmado': 'HK',
      'confirmed': 'HK',
      'confirmada': 'HK',
      'cancelado': 'HX',
      'cancelled': 'HX',
      'cancelada': 'HX',
      'lista de espera': 'WL',
      'waitlist': 'WL',
      'waitlisted': 'WL',
      'em espera': 'HL',
      'on hold': 'HL',
      'hold': 'HL',
      'pendente': 'UC',
      'pending': 'UC',
    };

    const normalizedStatus = status.toLowerCase().trim();
    return statusMap[normalizedStatus] || 'UN'; // UN = Unknown
  }

  /**
   * Método abstrato - cada scraper implementa sua lógica
   */
  abstract checkBookingStatus(pnr: string, lastName: string): Promise<BookingStatus>;

  /**
   * Verifica se página tem CAPTCHA
   */
  protected async hasCaptcha(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const captchaSelectors = [
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]',
        '.g-recaptcha',
        '#captcha',
        '[class*="captcha"]',
      ];

      for (const selector of captchaSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          this.logger.warn('CAPTCHA detectado!');
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Tira screenshot para debug
   */
  protected async screenshot(name: string): Promise<void> {
    if (!this.page) return;

    try {
      const path = `./screenshots/${this.scraperName}_${name}_${Date.now()}.png`;
      await this.page.screenshot({ path, fullPage: true });
      this.logger.info(`Screenshot salvo: ${path}`);
    } catch (error) {
      this.logger.error('Erro ao tirar screenshot:', error);
    }
  }
}
