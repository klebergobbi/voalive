/**
 * Configuração Playwright com Browser Pool e Context Management
 * @module playwrightConfig
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

/**
 * @typedef {Object} PlaywrightConfig
 * @property {boolean} headless - Modo headless
 * @property {number} timeout - Timeout padrão
 * @property {number} maxConcurrentBrowsers - Máximo de browsers simultâneos
 */

const CONFIG = {
  headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT || '30000', 10),
  maxConcurrentBrowsers: parseInt(process.env.MAX_CONCURRENT_BROWSERS || '5', 10),
  slowMo: parseInt(process.env.PLAYWRIGHT_SLOW_MO || '0', 10),
};

/**
 * Pool de browsers ativos
 */
class BrowserPool {
  private browsers: Browser[] = [];
  private activeBrowsers: number = 0;
  private readonly maxBrowsers: number;

  constructor(maxBrowsers: number = 5) {
    this.maxBrowsers = maxBrowsers;
  }

  /**
   * Obtém um browser do pool ou cria um novo
   */
  async getBrowser(): Promise<Browser> {
    // Tenta reusar um browser existente
    for (const browser of this.browsers) {
      if (browser.isConnected()) {
        this.activeBrowsers++;
        return browser;
      }
    }

    // Se atingiu o limite, aguarda
    if (this.activeBrowsers >= this.maxBrowsers) {
      throw new Error(
        `[Playwright] Limite de ${this.maxBrowsers} browsers simultâneos atingido`
      );
    }

    // Cria novo browser
    const browser = await this.createBrowser();
    this.browsers.push(browser);
    this.activeBrowsers++;
    return browser;
  }

  /**
   * Cria um novo browser com configurações otimizadas
   */
  private async createBrowser(): Promise<Browser> {
    try {
      const browser = await chromium.launch({
        headless: CONFIG.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-default-browser-check',
          '--safebrowsing-disable-auto-update',
          '--disable-blink-features=AutomationControlled',
        ],
        slowMo: CONFIG.slowMo,
      });

      console.log(`[Playwright] Browser criado. Total: ${this.browsers.length + 1}`);
      return browser;
    } catch (error) {
      console.error('[Playwright] Erro ao criar browser:', error);
      throw error;
    }
  }

  /**
   * Libera um browser (não fecha, apenas marca como disponível)
   */
  releaseBrowser(): void {
    if (this.activeBrowsers > 0) {
      this.activeBrowsers--;
    }
  }

  /**
   * Fecha todos os browsers
   */
  async closeAll(): Promise<void> {
    console.log(`[Playwright] Fechando ${this.browsers.length} browsers...`);

    const closePromises = this.browsers.map(async (browser) => {
      try {
        if (browser.isConnected()) {
          await browser.close();
        }
      } catch (error) {
        console.error('[Playwright] Erro ao fechar browser:', error);
      }
    });

    await Promise.allSettled(closePromises);
    this.browsers = [];
    this.activeBrowsers = 0;
    console.log('[Playwright] Todos os browsers fechados');
  }

  /**
   * Retorna estatísticas do pool
   */
  getStats() {
    return {
      totalBrowsers: this.browsers.length,
      activeBrowsers: this.activeBrowsers,
      availableBrowsers: this.browsers.length - this.activeBrowsers,
      maxBrowsers: this.maxBrowsers,
      connectedBrowsers: this.browsers.filter((b) => b.isConnected()).length,
    };
  }

  /**
   * Limpa browsers desconectados
   */
  cleanup(): void {
    this.browsers = this.browsers.filter((browser) => browser.isConnected());
  }
}

/**
 * Instância global do pool de browsers
 */
export const browserPool = new BrowserPool(CONFIG.maxConcurrentBrowsers);

/**
 * Cria um novo contexto de navegação com configurações realistas
 * @param {Object} options - Opções do contexto
 * @param {string} [options.proxy] - Configuração de proxy
 * @returns {Promise<BrowserContext>}
 */
export async function createContext(options: {
  proxy?: string;
  userAgent?: string;
} = {}): Promise<BrowserContext> {
  try {
    const browser = await browserPool.getBrowser();

    const contextOptions: any = {
      viewport: {
        width: 1920,
        height: 1080,
      },
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      userAgent:
        options.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      javaScriptEnabled: true,
      bypassCSP: true,
      ignoreHTTPSErrors: true,
      permissions: ['geolocation'],
      geolocation: { latitude: -23.5505, longitude: -46.6333 }, // São Paulo
    };

    // Adiciona proxy se fornecido
    if (options.proxy) {
      const proxyParts = options.proxy.split('@');
      let proxyConfig: any;

      if (proxyParts.length === 2) {
        // Proxy com autenticação: username:password@host:port
        const [auth, server] = proxyParts;
        const [username, password] = auth.split(':');
        proxyConfig = {
          server: `http://${server}`,
          username,
          password,
        };
      } else {
        // Proxy sem autenticação: host:port
        proxyConfig = {
          server: `http://${options.proxy}`,
        };
      }

      contextOptions.proxy = proxyConfig;
    }

    const context = await browser.newContext(contextOptions);

    // Adiciona headers realistas
    await context.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
    });

    // Remove indicadores de automação
    await context.addInitScript(() => {
      // Remove navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Mock de plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Mock de languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['pt-BR', 'pt', 'en-US', 'en'],
      });

      // Chrome runtime
      (window as any).chrome = {
        runtime: {},
      };

      // Permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);
    });

    return context;
  } catch (error) {
    browserPool.releaseBrowser();
    console.error('[Playwright] Erro ao criar contexto:', error);
    throw error;
  }
}

/**
 * Cria uma nova página com timeout configurado
 * @param {BrowserContext} context - Contexto do browser
 * @returns {Promise<Page>}
 */
export async function createPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  page.setDefaultTimeout(CONFIG.timeout);
  page.setDefaultNavigationTimeout(CONFIG.timeout);

  // Listener de erros
  page.on('pageerror', (error) => {
    console.error('[Playwright Page] Erro na página:', error.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('[Playwright Console]', msg.text());
    }
  });

  return page;
}

/**
 * Fecha contexto e libera browser
 * @param {BrowserContext} context - Contexto a ser fechado
 */
export async function closeContext(context: BrowserContext): Promise<void> {
  try {
    await context.close();
    browserPool.releaseBrowser();
  } catch (error) {
    console.error('[Playwright] Erro ao fechar contexto:', error);
    browserPool.releaseBrowser();
  }
}

/**
 * Health check do Playwright
 */
export async function healthCheck(): Promise<boolean> {
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    context = await createContext();
    page = await createPage(context);
    await page.goto('about:blank', { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('[Playwright Health Check] Falhou:', error);
    return false;
  } finally {
    if (page) await page.close();
    if (context) await closeContext(context);
  }
}

/**
 * Graceful shutdown
 */
export async function shutdown(): Promise<void> {
  console.log('[Playwright] Iniciando shutdown...');
  await browserPool.closeAll();
  console.log('[Playwright] Shutdown completo');
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

// Cleanup periódico de browsers desconectados (a cada 5 minutos)
setInterval(() => {
  browserPool.cleanup();
}, 5 * 60 * 1000);

export default {
  createContext,
  createPage,
  closeContext,
  healthCheck,
  shutdown,
  browserPool,
  CONFIG,
};
