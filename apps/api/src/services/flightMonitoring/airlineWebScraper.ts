/**
 * Airline Web Scraper
 * Factory de scrapers para companhias aéreas brasileiras
 *
 * Features:
 * - Puppeteer headless
 * - Proxy rotation
 * - Retry logic com backoff exponencial
 * - User-Agent rotation
 * - Timeout configurável
 * - Stealth mode (anti-detection)
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { FlightStatus, FlightDetails } from './types';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface ScraperConfig {
  headless?: boolean;
  timeout?: number;
  maxRetries?: number;
  useProxy?: boolean;
  proxyUrl?: string;
  userAgentRotation?: boolean;
  stealthMode?: boolean;
}

export interface ProxyConfig {
  enabled: boolean;
  provider?: 'brightdata' | 'oxylabs' | 'custom';
  url?: string;
  username?: string;
  password?: string;
  rotation?: boolean;
}

export interface ScrapedFlightData {
  status?: string;
  gate?: string;
  terminal?: string;
  seat?: string;
  departureTime?: string;
  arrivalTime?: string;
  delay?: string;
  aircraft?: string;
  flightNumber?: string;
  origin?: string;
  destination?: string;
  passengerName?: string;
  bookingClass?: string;
  checkinAvailable?: boolean;
  rawHtml?: string;
}

// ============================================================================
// BASE SCRAPER CLASS
// ============================================================================

export abstract class AirlineScraper {
  protected config: Required<ScraperConfig>;
  protected proxyConfig: ProxyConfig;
  protected userAgents: string[];
  protected currentUserAgentIndex: number;

  constructor(config?: ScraperConfig) {
    this.config = {
      headless: config?.headless ?? true,
      timeout: config?.timeout ?? 30000,
      maxRetries: config?.maxRetries ?? 3,
      useProxy: config?.useProxy ?? false,
      proxyUrl: config?.proxyUrl ?? '',
      userAgentRotation: config?.userAgentRotation ?? true,
      stealthMode: config?.stealthMode ?? true,
    };

    this.proxyConfig = {
      enabled: this.config.useProxy,
      url: this.config.proxyUrl,
      rotation: true,
    };

    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];

    this.currentUserAgentIndex = 0;
  }

  /**
   * Abstract method - cada companhia implementa sua URL
   */
  protected abstract getCheckInUrl(): string;

  /**
   * Abstract method - cada companhia implementa seus seletores
   */
  protected abstract getSelectors(): Record<string, string>;

  /**
   * Abstract method - cada companhia implementa sua lógica de preenchimento
   */
  protected abstract fillBookingForm(page: Page, bookingRef: string, lastName: string): Promise<void>;

  /**
   * Abstract method - cada companhia implementa sua extração de dados
   */
  protected abstract extractFlightData(page: Page): Promise<ScrapedFlightData>;

  /**
   * Main scraping method with retry logic
   */
  async scrapeFlightStatus(
    bookingRef: string,
    lastName: string
  ): Promise<FlightStatus> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`🔍 [${this.constructor.name}] Attempt ${attempt}/${this.config.maxRetries} - ${bookingRef}`);

        const result = await this.performScrape(bookingRef, lastName);

        console.log(`✅ [${this.constructor.name}] Success on attempt ${attempt}`);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`⚠️ [${this.constructor.name}] Attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.config.maxRetries) {
          const backoffMs = this.calculateBackoff(attempt);
          console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
          await this.sleep(backoffMs);
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to scrape after ${this.config.maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Perform the actual scraping
   */
  protected async performScrape(
    bookingRef: string,
    lastName: string
  ): Promise<FlightStatus> {
    let browser: Browser | null = null;

    try {
      // Launch browser
      browser = await this.launchBrowser();

      // Create page
      const page = await browser.newPage();

      // Setup page
      await this.setupPage(page);

      // Navigate to check-in page
      console.log(`🌐 Navigating to ${this.getCheckInUrl()}`);
      await page.goto(this.getCheckInUrl(), {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout,
      });

      // Fill booking form
      await this.fillBookingForm(page, bookingRef, lastName);

      // Wait for results
      await this.waitForResults(page);

      // Extract data
      const scrapedData = await this.extractFlightData(page);

      // Parse and return
      return this.parseToFlightStatus(scrapedData, bookingRef, lastName);

    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Launch browser with configuration
   */
  protected async launchBrowser(): Promise<Browser> {
    const args: string[] = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ];

    // Add proxy if configured
    if (this.proxyConfig.enabled && this.proxyConfig.url) {
      args.push(`--proxy-server=${this.proxyConfig.url}`);
    }

    const browser = await puppeteer.launch({
      headless: this.config.headless ? 'new' : false,
      args,
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });

    return browser;
  }

  /**
   * Setup page with stealth mode and user agent
   */
  protected async setupPage(page: Page): Promise<void> {
    // Set user agent
    if (this.config.userAgentRotation) {
      const userAgent = this.getNextUserAgent();
      await page.setUserAgent(userAgent);
      console.log(`🎭 Using User-Agent: ${userAgent.substring(0, 50)}...`);
    }

    // Set viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    // Stealth mode - hide automation
    if (this.config.stealthMode) {
      await page.evaluateOnNewDocument(() => {
        // Override navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });

        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['pt-BR', 'pt', 'en-US', 'en'],
        });

        // Override chrome property
        (window as any).chrome = {
          runtime: {},
        };

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: any) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: 'denied' } as PermissionStatus)
            : originalQuery(parameters);
      });
    }

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Set timeout
    page.setDefaultTimeout(this.config.timeout);
  }

  /**
   * Wait for results page to load
   */
  protected async waitForResults(page: Page): Promise<void> {
    // Default implementation - wait for navigation
    await page.waitForNavigation({
      waitUntil: 'networkidle2',
      timeout: this.config.timeout,
    }).catch(() => {
      // Ignore timeout - page might not navigate
    });

    // Wait a bit for dynamic content
    await this.sleep(2000);
  }

  /**
   * Parse scraped data to FlightStatus
   */
  protected parseToFlightStatus(
    data: ScrapedFlightData,
    bookingRef: string,
    lastName: string
  ): FlightStatus {
    const hasData = data.status || data.flightNumber || data.gate;

    if (!hasData) {
      return {
        success: false,
        bookingReference: bookingRef,
        lastName,
        status: 'NOT_FOUND',
        source: 'SCRAPING',
        timestamp: new Date(),
        error: 'Nenhum dado de voo encontrado',
      };
    }

    const flightDetails: FlightDetails = {
      flightNumber: data.flightNumber || 'N/A',
      airline: this.getAirlineName(),
      airlineName: this.getAirlineName(),
      aircraft: data.aircraft || 'N/A',
      status: this.normalizeStatus(data.status || 'UNKNOWN'),
      departure: {
        airport: data.origin || 'N/A',
        airportName: data.origin || 'N/A',
        scheduledTime: this.parseDateTime(data.departureTime),
        gate: data.gate,
        terminal: data.terminal,
      },
      arrival: {
        airport: data.destination || 'N/A',
        airportName: data.destination || 'N/A',
        scheduledTime: this.parseDateTime(data.arrivalTime),
      },
      lastUpdated: new Date(),
    };

    // Add delay if present
    if (data.delay) {
      const delayMinutes = this.parseDelay(data.delay);
      if (delayMinutes > 0) {
        flightDetails.delay = {
          minutes: delayMinutes,
        };
      }
    }

    return {
      success: true,
      bookingReference: bookingRef,
      lastName,
      status: 'FOUND',
      source: 'SCRAPING',
      timestamp: new Date(),
      flight: flightDetails,
    };
  }

  /**
   * Normalize flight status
   */
  protected normalizeStatus(status: string): FlightDetails['status'] {
    const normalized = status.toUpperCase().trim();

    if (normalized.includes('PROGRAMADO') || normalized.includes('SCHEDULED')) {
      return 'SCHEDULED';
    }
    if (normalized.includes('ATRASADO') || normalized.includes('DELAYED')) {
      return 'DELAYED';
    }
    if (normalized.includes('CANCELADO') || normalized.includes('CANCELLED')) {
      return 'CANCELLED';
    }
    if (normalized.includes('EMBARCANDO') || normalized.includes('BOARDING')) {
      return 'BOARDING';
    }
    if (normalized.includes('PARTIU') || normalized.includes('DEPARTED')) {
      return 'DEPARTED';
    }
    if (normalized.includes('CHEGOU') || normalized.includes('ARRIVED')) {
      return 'ARRIVED';
    }

    return 'SCHEDULED';
  }

  /**
   * Parse delay string to minutes
   */
  protected parseDelay(delayStr: string): number {
    const match = delayStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Parse date/time string
   */
  protected parseDateTime(dateTimeStr?: string): Date {
    if (!dateTimeStr) return new Date();

    try {
      return new Date(dateTimeStr);
    } catch {
      return new Date();
    }
  }

  /**
   * Get airline name (to be overridden)
   */
  protected getAirlineName(): string {
    return 'Unknown';
  }

  /**
   * Get next user agent (rotation)
   */
  protected getNextUserAgent(): string {
    const userAgent = this.userAgents[this.currentUserAgentIndex];
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgents.length;
    return userAgent;
  }

  /**
   * Calculate exponential backoff
   */
  protected calculateBackoff(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

    // Add random jitter
    const jitter = Math.random() * 1000;

    return delay + jitter;
  }

  /**
   * Sleep helper
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Safe click helper
   */
  protected async safeClick(page: Page, selector: string): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.click(selector);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safe fill helper
   */
  protected async safeFill(page: Page, selector: string, value: string): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.type(selector, value, { delay: 100 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safe text extract helper
   */
  protected async safeExtractText(page: Page, selector: string): Promise<string | null> {
    try {
      await page.waitForSelector(selector, { timeout: 3000 });
      return await page.$eval(selector, el => el.textContent?.trim() || null);
    } catch {
      return null;
    }
  }
}

// ============================================================================
// LATAM SCRAPER
// ============================================================================

export class LatamScraper extends AirlineScraper {
  protected getCheckInUrl(): string {
    return 'https://www.latam.com/pt_br/apps/personas/meus-voos';
  }

  protected getAirlineName(): string {
    return 'LATAM';
  }

  protected getSelectors(): Record<string, string> {
    return {
      bookingCodeInput: 'input[name="documentNumber"], input[id="bookingCode"], input[placeholder*="Localizador"]',
      lastNameInput: 'input[name="lastName"], input[id="lastName"], input[placeholder*="Sobrenome"]',
      submitButton: 'button[type="submit"], button:has-text("Buscar"), button:has-text("Continuar")',
      flightStatus: '.flight-status, [data-testid="flight-status"], .status-badge',
      flightNumber: '.flight-number, [data-testid="flight-number"]',
      gate: '.gate-info, [data-testid="gate"]',
      terminal: '.terminal-info, [data-testid="terminal"]',
      seat: '.seat-number, [data-testid="seat"]',
      departureTime: '.departure-time, [data-testid="departure-time"]',
      arrivalTime: '.arrival-time, [data-testid="arrival-time"]',
      delay: '.delay-info, [data-testid="delay"]',
      origin: '.origin-airport, [data-testid="origin"]',
      destination: '.destination-airport, [data-testid="destination"]',
    };
  }

  protected async fillBookingForm(page: Page, bookingRef: string, lastName: string): Promise<void> {
    const selectors = this.getSelectors();

    console.log(`📝 Filling LATAM form: ${bookingRef} - ${lastName}`);

    // Try multiple selector variations
    const bookingFilled = await this.safeFill(page, selectors.bookingCodeInput, bookingRef);
    if (!bookingFilled) {
      throw new Error('Could not find booking code input field');
    }

    const lastNameFilled = await this.safeFill(page, selectors.lastNameInput, lastName);
    if (!lastNameFilled) {
      throw new Error('Could not find last name input field');
    }

    await this.sleep(500);

    // Click submit
    const clicked = await this.safeClick(page, selectors.submitButton);
    if (!clicked) {
      // Try pressing Enter as fallback
      await page.keyboard.press('Enter');
    }
  }

  protected async extractFlightData(page: Page): Promise<ScrapedFlightData> {
    const selectors = this.getSelectors();

    console.log('📊 Extracting LATAM flight data...');

    const data: ScrapedFlightData = {
      status: await this.safeExtractText(page, selectors.flightStatus),
      flightNumber: await this.safeExtractText(page, selectors.flightNumber),
      gate: await this.safeExtractText(page, selectors.gate),
      terminal: await this.safeExtractText(page, selectors.terminal),
      seat: await this.safeExtractText(page, selectors.seat),
      departureTime: await this.safeExtractText(page, selectors.departureTime),
      arrivalTime: await this.safeExtractText(page, selectors.arrivalTime),
      delay: await this.safeExtractText(page, selectors.delay),
      origin: await this.safeExtractText(page, selectors.origin),
      destination: await this.safeExtractText(page, selectors.destination),
    };

    // Take screenshot for debugging (optional)
    if (!this.config.headless) {
      await page.screenshot({ path: `latam-${Date.now()}.png` });
    }

    return data;
  }
}

// ============================================================================
// GOL SCRAPER
// ============================================================================

export class GolScraper extends AirlineScraper {
  protected getCheckInUrl(): string {
    return 'https://www.voegol.com.br/pt/informacoes/check-in';
  }

  protected getAirlineName(): string {
    return 'GOL';
  }

  protected getSelectors(): Record<string, string> {
    return {
      bookingCodeInput: 'input[name="reservationCode"], input[id="localizador"], input[placeholder*="Localizador"]',
      lastNameInput: 'input[name="lastName"], input[id="sobrenome"], input[placeholder*="Sobrenome"]',
      submitButton: 'button[type="submit"], button.btn-primary, button:has-text("Buscar")',
      flightStatus: '.reservation-status, .flight-status, [data-testid="status"]',
      flightNumber: '.flight-number, [data-testid="flight"]',
      gate: '.gate-info, [data-testid="gate"]',
      terminal: '.terminal-info',
      seat: '.seat-number, .seat-info',
      departureTime: '.departure-time, .horario-partida',
      arrivalTime: '.arrival-time, .horario-chegada',
      delay: '.delay-info, .atraso',
      origin: '.origin-code, .origem',
      destination: '.destination-code, .destino',
    };
  }

  protected async fillBookingForm(page: Page, bookingRef: string, lastName: string): Promise<void> {
    const selectors = this.getSelectors();

    console.log(`📝 Filling GOL form: ${bookingRef} - ${lastName}`);

    // Wait for page to be ready
    await this.sleep(1000);

    // Fill booking code
    const bookingFilled = await this.safeFill(page, selectors.bookingCodeInput, bookingRef);
    if (!bookingFilled) {
      throw new Error('Could not find GOL booking code input');
    }

    // Fill last name
    const lastNameFilled = await this.safeFill(page, selectors.lastNameInput, lastName);
    if (!lastNameFilled) {
      throw new Error('Could not find GOL last name input');
    }

    await this.sleep(500);

    // Submit
    const clicked = await this.safeClick(page, selectors.submitButton);
    if (!clicked) {
      await page.keyboard.press('Enter');
    }
  }

  protected async extractFlightData(page: Page): Promise<ScrapedFlightData> {
    const selectors = this.getSelectors();

    console.log('📊 Extracting GOL flight data...');

    return {
      status: await this.safeExtractText(page, selectors.flightStatus),
      flightNumber: await this.safeExtractText(page, selectors.flightNumber),
      gate: await this.safeExtractText(page, selectors.gate),
      terminal: await this.safeExtractText(page, selectors.terminal),
      seat: await this.safeExtractText(page, selectors.seat),
      departureTime: await this.safeExtractText(page, selectors.departureTime),
      arrivalTime: await this.safeExtractText(page, selectors.arrivalTime),
      delay: await this.safeExtractText(page, selectors.delay),
      origin: await this.safeExtractText(page, selectors.origin),
      destination: await this.safeExtractText(page, selectors.destination),
    };
  }
}

// ============================================================================
// AZUL SCRAPER
// ============================================================================

export class AzulScraper extends AirlineScraper {
  protected getCheckInUrl(): string {
    return 'https://www.voeazul.com.br/br/pt/home/minhas-viagens';
  }

  protected getAirlineName(): string {
    return 'Azul';
  }

  protected getSelectors(): Record<string, string> {
    return {
      bookingCodeInput: 'input[name="bookingCode"], input[id="pnr"], input[placeholder*="reserva"]',
      lastNameInput: 'input[name="lastName"], input[id="lastName"]',
      submitButton: 'button[type="submit"], button.submit-btn',
      flightStatus: '.flight-status, .status',
      flightNumber: '.flight-number, .numero-voo',
      gate: '.gate, .portao',
      terminal: '.terminal',
      seat: '.seat, .assento',
      departureTime: '.departure, .partida',
      arrivalTime: '.arrival, .chegada',
      delay: '.delay, .atraso',
      origin: '.origin, .origem',
      destination: '.destination, .destino',
    };
  }

  protected async fillBookingForm(page: Page, bookingRef: string, lastName: string): Promise<void> {
    const selectors = this.getSelectors();

    console.log(`📝 Filling Azul form: ${bookingRef} - ${lastName}`);

    await this.sleep(1000);

    await this.safeFill(page, selectors.bookingCodeInput, bookingRef);
    await this.safeFill(page, selectors.lastNameInput, lastName);

    await this.sleep(500);

    await this.safeClick(page, selectors.submitButton);
  }

  protected async extractFlightData(page: Page): Promise<ScrapedFlightData> {
    const selectors = this.getSelectors();

    console.log('📊 Extracting Azul flight data...');

    return {
      status: await this.safeExtractText(page, selectors.flightStatus),
      flightNumber: await this.safeExtractText(page, selectors.flightNumber),
      gate: await this.safeExtractText(page, selectors.gate),
      terminal: await this.safeExtractText(page, selectors.terminal),
      seat: await this.safeExtractText(page, selectors.seat),
      departureTime: await this.safeExtractText(page, selectors.departureTime),
      arrivalTime: await this.safeExtractText(page, selectors.arrivalTime),
      delay: await this.safeExtractText(page, selectors.delay),
      origin: await this.safeExtractText(page, selectors.origin),
      destination: await this.safeExtractText(page, selectors.destination),
    };
  }
}

// ============================================================================
// AVIANCA SCRAPER
// ============================================================================

export class AviancaScraper extends AirlineScraper {
  protected getCheckInUrl(): string {
    return 'https://www.avianca.com/br/pt/check-in/';
  }

  protected getAirlineName(): string {
    return 'Avianca';
  }

  protected getSelectors(): Record<string, string> {
    return {
      bookingCodeInput: 'input[name="pnr"], input[placeholder*="PNR"]',
      lastNameInput: 'input[name="surname"], input[placeholder*="surname"]',
      submitButton: 'button[type="submit"], .check-in-btn',
      flightStatus: '.status',
      flightNumber: '.flight-info .number',
      gate: '.gate',
      terminal: '.terminal',
      seat: '.seat-assignment',
      departureTime: '.departure-time',
      arrivalTime: '.arrival-time',
      delay: '.delay-notice',
      origin: '.departure-airport',
      destination: '.arrival-airport',
    };
  }

  protected async fillBookingForm(page: Page, bookingRef: string, lastName: string): Promise<void> {
    const selectors = this.getSelectors();

    console.log(`📝 Filling Avianca form: ${bookingRef} - ${lastName}`);

    await this.sleep(1000);

    await this.safeFill(page, selectors.bookingCodeInput, bookingRef);
    await this.safeFill(page, selectors.lastNameInput, lastName);

    await this.sleep(500);

    await this.safeClick(page, selectors.submitButton);
  }

  protected async extractFlightData(page: Page): Promise<ScrapedFlightData> {
    const selectors = this.getSelectors();

    console.log('📊 Extracting Avianca flight data...');

    return {
      status: await this.safeExtractText(page, selectors.flightStatus),
      flightNumber: await this.safeExtractText(page, selectors.flightNumber),
      gate: await this.safeExtractText(page, selectors.gate),
      terminal: await this.safeExtractText(page, selectors.terminal),
      seat: await this.safeExtractText(page, selectors.seat),
      departureTime: await this.safeExtractText(page, selectors.departureTime),
      arrivalTime: await this.safeExtractText(page, selectors.arrivalTime),
      delay: await this.safeExtractText(page, selectors.delay),
      origin: await this.safeExtractText(page, selectors.origin),
      destination: await this.safeExtractText(page, selectors.destination),
    };
  }
}

// ============================================================================
// SCRAPER FACTORY
// ============================================================================

export type AirlineCode = 'LATAM' | 'GOL' | 'AZUL' | 'AVIANCA';

export class AirlineScraperFactory {
  private static scrapers: Map<AirlineCode, AirlineScraper> = new Map();

  /**
   * Get scraper instance for airline
   */
  static getScraper(airlineCode: AirlineCode, config?: ScraperConfig): AirlineScraper {
    const cacheKey = airlineCode;

    if (!this.scrapers.has(cacheKey)) {
      let scraper: AirlineScraper;

      switch (airlineCode.toUpperCase()) {
        case 'LATAM':
        case 'LA':
        case 'JJ':
          scraper = new LatamScraper(config);
          break;

        case 'GOL':
        case 'G3':
          scraper = new GolScraper(config);
          break;

        case 'AZUL':
        case 'AD':
          scraper = new AzulScraper(config);
          break;

        case 'AVIANCA':
        case 'AV':
          scraper = new AviancaScraper(config);
          break;

        default:
          throw new Error(`Unsupported airline: ${airlineCode}`);
      }

      this.scrapers.set(cacheKey, scraper);
    }

    return this.scrapers.get(cacheKey)!;
  }

  /**
   * Detect airline from booking code
   */
  static detectAirline(bookingCode: string): AirlineCode | null {
    const code = bookingCode.toUpperCase().trim();

    // GOL: 6 characters or starts with G3
    if (code.length === 6 || code.startsWith('G3')) {
      return 'GOL';
    }

    // LATAM: starts with LA or JJ
    if (code.startsWith('LA') || code.startsWith('JJ')) {
      return 'LATAM';
    }

    // Azul: starts with AD
    if (code.startsWith('AD')) {
      return 'AZUL';
    }

    // Avianca: starts with AV
    if (code.startsWith('AV')) {
      return 'AVIANCA';
    }

    return null;
  }

  /**
   * Try all scrapers
   */
  static async scrapeAny(
    bookingRef: string,
    lastName: string,
    config?: ScraperConfig
  ): Promise<FlightStatus> {
    // First, try to detect airline
    const detectedAirline = this.detectAirline(bookingRef);

    if (detectedAirline) {
      console.log(`🎯 Detected airline: ${detectedAirline}`);
      const scraper = this.getScraper(detectedAirline, config);
      return await scraper.scrapeFlightStatus(bookingRef, lastName);
    }

    // If not detected, try all airlines
    console.log('🔄 Trying all airlines...');

    const airlines: AirlineCode[] = ['GOL', 'LATAM', 'AZUL', 'AVIANCA'];
    const errors: string[] = [];

    for (const airline of airlines) {
      try {
        console.log(`🔍 Trying ${airline}...`);
        const scraper = this.getScraper(airline, config);
        const result = await scraper.scrapeFlightStatus(bookingRef, lastName);

        if (result.success) {
          console.log(`✅ Found via ${airline}!`);
          return result;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${airline}: ${errorMsg}`);
        console.warn(`⚠️ ${airline} failed:`, errorMsg);
      }
    }

    // All failed
    throw new Error(
      `Could not find booking in any airline. Errors: ${errors.join('; ')}`
    );
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.scrapers.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  AirlineScraper,
  LatamScraper,
  GolScraper,
  AzulScraper,
  AviancaScraper,
};

export default AirlineScraperFactory;
