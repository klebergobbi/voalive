/**
 * Serviço principal de scraping de reservas aéreas
 * @module scraperService
 */

import { BrowserContext, Page } from 'playwright';
import * as playwrightConfig from '../../shared/config/playwrightConfig';
import * as proxyService from './proxyService';
import { criarHashReserva, ReservaData } from './changeDetectionService';
import {
  ScrapingError,
  CaptchaError,
  TwoFAError,
  SessionExpiredError,
  TimeoutError,
} from '../../shared/utils/errorHandler';

// Importar scrapers específicos
import { scrapeLATAM } from './scrapers/latamScraper';
import { scrapeGOL } from './scrapers/golScraper';
import { scrapeAZUL } from './scrapers/azulScraper';
import { scrapeAVIANCA } from './scrapers/aviancaScraper';

/**
 * Mapeamento de companhias para suas funções de scraping
 */
const SCRAPERS: Record<string, Function> = {
  LATAM: scrapeLATAM,
  GOL: scrapeGOL,
  AZUL: scrapeAZUL,
  AVIANCA: scrapeAVIANCA,
};

/**
 * URLs de gerenciamento de reservas por companhia
 */
export const URLS_COMPANHIAS: Record<string, string> = {
  LATAM: 'https://www.latam.com/pt_br/minhas-reservas',
  GOL: 'https://www.voegol.com.br/gerenciar-reserva',
  AZUL: 'https://www.voeazul.com.br/minhas-reservas',
  AVIANCA: 'https://www.avianca.com.br/gerenciar-reserva',
};

/**
 * Opções de monitoramento
 */
export interface MonitorOptions {
  codigoReserva: string;
  email: string;
  senha: string;
  companhiaAerea: string;
  proxy?: string | null;
  timeout?: number;
  retries?: number;
}

/**
 * Monitora uma reserva aérea com retry e timeout
 * @param {MonitorOptions} options - Opções de monitoramento
 * @returns {Promise<ReservaData>}
 */
export async function monitorarReserva(options: MonitorOptions): Promise<ReservaData> {
  const {
    codigoReserva,
    email,
    senha,
    companhiaAerea,
    proxy = null,
    timeout = 30000,
    retries = 3,
  } = options;

  console.log(`[Scraper Service] Iniciando monitoramento: ${codigoReserva} - ${companhiaAerea}`);

  // Validações
  if (!SCRAPERS[companhiaAerea]) {
    throw new ScrapingError(`Companhia aérea não suportada: ${companhiaAerea}`);
  }

  let ultimoErro: Error | null = null;
  let tentativas = 0;

  while (tentativas < retries) {
    tentativas++;

    try {
      const resultado = await executarScrapingComTimeout(
        {
          codigoReserva,
          email,
          senha,
          companhiaAerea,
          proxy,
        },
        timeout
      );

      console.log(
        `[Scraper Service] Sucesso no monitoramento: ${codigoReserva} (tentativa ${tentativas})`
      );

      return resultado;
    } catch (error) {
      ultimoErro = error as Error;
      console.warn(
        `[Scraper Service] Tentativa ${tentativas}/${retries} falhou:`,
        (error as Error).message
      );

      // Não tenta novamente em casos específicos
      if (
        error instanceof CaptchaError ||
        error instanceof TwoFAError
      ) {
        throw error;
      }

      // Exponential backoff
      if (tentativas < retries) {
        const delay = Math.pow(2, tentativas) * 1000; // 2s, 4s, 8s
        console.log(`[Scraper Service] Aguardando ${delay}ms antes de tentar novamente...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new ScrapingError(
    `Falha após ${retries} tentativas: ${ultimoErro?.message}`,
    { codigoReserva, companhiaAerea, erro: ultimoErro?.message }
  );
}

/**
 * Executa scraping com timeout configurável
 * @private
 */
async function executarScrapingComTimeout(
  options: Omit<MonitorOptions, 'timeout' | 'retries'>,
  timeout: number
): Promise<ReservaData> {
  return new Promise(async (resolve, reject) => {
    // Timeout handler
    const timeoutId = setTimeout(() => {
      reject(
        new TimeoutError(`Scraping excedeu o timeout de ${timeout}ms`, {
          companhia: options.companhiaAerea,
          codigoReserva: options.codigoReserva,
        })
      );
    }, timeout);

    try {
      const resultado = await executarScraping(options);
      clearTimeout(timeoutId);
      resolve(resultado);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Executa o scraping propriamente dito
 * @private
 */
async function executarScraping(
  options: Omit<MonitorOptions, 'timeout' | 'retries'>
): Promise<ReservaData> {
  const { codigoReserva, email, senha, companhiaAerea, proxy } = options;

  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // Cria contexto com proxy se fornecido
    const proxyConfig = proxy ? proxyService.formatarParaPlaywright(proxy) : null;

    context = await playwrightConfig.createContext({
      proxy: proxyConfig?.server,
      userAgent: gerarUserAgent(),
    });

    page = await playwrightConfig.createPage(context);

    // Executa scraper específico da companhia
    const scraperFn = SCRAPERS[companhiaAerea];
    const dados = await scraperFn(page, { codigoReserva, email, senha });

    // Adiciona metadados
    const resultado: ReservaData = {
      ...dados,
      codigoReserva,
      companhiaAerea,
      dataAtualizacao: new Date(),
      hash: '', // Será preenchido a seguir
    };

    // Gera hash para comparação futura
    resultado.hash = criarHashReserva(resultado);

    // Reporta sucesso do proxy
    if (proxy) {
      proxyService.reportarSucesso(proxy);
    }

    return resultado;
  } catch (error) {
    // Reporta falha do proxy
    if (proxy) {
      proxyService.reportarFalha(proxy, error as Error);
    }

    // Trata erros específicos
    if ((error as Error).message.includes('captcha')) {
      throw new CaptchaError('Captcha detectado durante o scraping', {
        companhia: companhiaAerea,
        codigoReserva,
      });
    }

    if ((error as Error).message.includes('2fa') || (error as Error).message.includes('verificação')) {
      throw new TwoFAError('Autenticação de dois fatores necessária', {
        companhia: companhiaAerea,
        codigoReserva,
      });
    }

    if (
      (error as Error).message.includes('sessão expirada') ||
      (error as Error).message.includes('login novamente')
    ) {
      throw new SessionExpiredError('Sessão expirada, necessário novo login', {
        companhia: companhiaAerea,
        codigoReserva,
      });
    }

    throw new ScrapingError(`Erro no scraping: ${(error as Error).message}`, {
      companhia: companhiaAerea,
      codigoReserva,
      erro: (error as Error).message,
    });
  } finally {
    // Cleanup
    if (page) await page.close();
    if (context) await playwrightConfig.closeContext(context);
  }
}

/**
 * Gera um user agent realista
 * @private
 */
function gerarUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  ];

  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Verifica se uma companhia é suportada
 * @param {string} companhiaAerea - Nome da companhia
 * @returns {boolean}
 */
export function isCompanhiaSuportada(companhiaAerea: string): boolean {
  return companhiaAerea in SCRAPERS;
}

/**
 * Lista companhias suportadas
 * @returns {string[]}
 */
export function listarCompanhiasSuportadas(): string[] {
  return Object.keys(SCRAPERS);
}

/**
 * Testa conexão com uma companhia aérea
 * @param {string} companhiaAerea - Nome da companhia
 * @returns {Promise<boolean>}
 */
export async function testarConexao(companhiaAerea: string): Promise<boolean> {
  if (!isCompanhiaSuportada(companhiaAerea)) {
    return false;
  }

  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    context = await playwrightConfig.createContext();
    page = await playwrightConfig.createPage(context);

    const url = URLS_COMPANHIAS[companhiaAerea];
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

    return true;
  } catch (error) {
    console.error(`[Scraper Service] Falha ao testar conexão com ${companhiaAerea}:`, error);
    return false;
  } finally {
    if (page) await page.close();
    if (context) await playwrightConfig.closeContext(context);
  }
}

export default {
  monitorarReserva,
  isCompanhiaSuportada,
  listarCompanhiasSuportadas,
  testarConexao,
  URLS_COMPANHIAS,
};
