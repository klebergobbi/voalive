/**
 * Scraper específico para GOL Linhas Aéreas
 * Versão melhorada com anti-detecção e detecção de cancelamento
 * @module golScraper
 */

import { Page } from 'playwright';
import { ReservaData } from '../changeDetectionService';

interface Credentials {
  codigoReserva: string;
  email: string;
  senha: string;
}

const SELETORES = {
  inputCodigoReserva: 'input[name="reservationCode"], #booking-code, input[placeholder*="código"], input[placeholder*="reserva"]',
  inputSobrenome: 'input[name="lastName"], #last-name, input[placeholder*="sobrenome"], input[placeholder*="nome"]',
  botaoBuscar: 'button:has-text("Consultar"), button:has-text("Buscar"), button[type="submit"], button:has-text("Continuar")',

  // Status - incluindo indicadores de cancelamento
  status: '.reservation-status, [data-testid="status"], .booking-status, .status-badge',
  statusCancelado: 'text=/cancelad[oa]/i, text=/cancelamento/i, .cancelled, .canceled, [data-status="cancelled"]',
  mensagemErro: '.error-message, .alert-danger, .error, [role="alert"]',
  mensagemCancelamento: 'text=/reserva.*cancelad[oa]/i, text=/bilhete.*cancelad[o]/i, text=/voo.*cancelad[o]/i',

  numeroVoo: '.flight-number, [data-testid="flight"], .flight-code',
  dataVoo: '.flight-date, .departure-date',
  origem: '.origin-code, .origin, [data-testid="origin"]',
  destino: '.destination-code, .destination, [data-testid="destination"]',
  horarioDecolagem: '.departure-time, .departure',
  horarioPouso: '.arrival-time, .arrival',
  portao: '.gate-info, .gate',
  aeronave: '.aircraft-type, .aircraft',

  passageiros: '.passenger-item, .passenger, .pax-item',
  nomePassageiro: '.passenger-name, .pax-name',
  assentoPassageiro: '.seat-number, .seat',
};

// User-Agents realistas atualizados
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
];

/**
 * Delay aleatório para simular comportamento humano
 */
async function randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`[GOL Scraper] Aguardando ${delay}ms...`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Simula movimentos de mouse humanos
 */
async function humanMouseMovement(page: Page): Promise<void> {
  try {
    const x = Math.floor(Math.random() * 800) + 100;
    const y = Math.floor(Math.random() * 600) + 100;
    await page.mouse.move(x, y, { steps: 10 });
    await randomDelay(100, 300);
  } catch (error) {
    // Ignora erros de mouse movement
  }
}

/**
 * Configura contexto anti-detecção STEALTH MODE
 * Baseado em puppeteer-extra-plugin-stealth
 */
async function setupAntiDetection(page: Page): Promise<void> {
  // User-Agent aleatório
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  await page.setExtraHTTPHeaders({
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
  });

  // STEALTH MODE: Remover TODOS os indicadores de automação
  await page.addInitScript(() => {
    // 1. Remove navigator.webdriver
    // @ts-ignore
    delete Object.getPrototypeOf(navigator).webdriver;
    // @ts-ignore
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // 2. Chrome runtime completo
    // @ts-ignore
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };

    // 3. Plugins realistas (Chrome, Edge, PDF)
    // @ts-ignore
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        return [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format' },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
        ];
      },
    });

    // 4. Languages naturalistas
    // @ts-ignore
    Object.defineProperty(navigator, 'languages', {
      get: () => ['pt-BR', 'pt', 'en-US', 'en'],
    });

    // 5. Permissions API mock
    const originalQuery = window.navigator.permissions.query;
    // @ts-ignore
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters)
    );

    // 6. MediaDevices mock
    if (!navigator.mediaDevices) {
      // @ts-ignore
      navigator.mediaDevices = {};
    }
    if (!navigator.mediaDevices.enumerateDevices) {
      // @ts-ignore
      navigator.mediaDevices.enumerateDevices = () => Promise.resolve([]);
    }

    // 7. Battery API mock
    // @ts-ignore
    if (!navigator.getBattery) {
      // @ts-ignore
      navigator.getBattery = () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1,
      });
    }

    // 8. Connection API mock
    // @ts-ignore
    if (!navigator.connection) {
      // @ts-ignore
      navigator.connection = {
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false,
      };
    }

    // 9. Hardware Concurrency
    // @ts-ignore
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

    // 10. Device Memory
    // @ts-ignore
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

    // 11. MaxTouchPoints
    // @ts-ignore
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });

    // 12. Vendor
    // @ts-ignore
    Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' });

    // 13. Platform
    // @ts-ignore
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });

    // 14. Canvas fingerprinting protection
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      // Adiciona noise aleatório para evitar fingerprinting
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] += Math.floor(Math.random() * 3) - 1;
        }
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, args);
    };

    // 15. WebGL fingerprinting protection
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
        return 'Intel Inc.';
      }
      if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
        return 'Intel Iris OpenGL Engine';
      }
      return getParameter.apply(this, [parameter]);
    };

    // 16. AudioContext fingerprinting protection
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const originalCreateOscillator = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function() {
        const oscillator = originalCreateOscillator.apply(this);
        const originalStart = oscillator.start;
        oscillator.start = function(...args: any[]) {
          // Adiciona variação aleatória para evitar fingerprinting
          return originalStart.apply(this, args);
        };
        return oscillator;
      };
    }

    // 17. Screen resolution realista
    // @ts-ignore
    Object.defineProperty(screen, 'width', { get: () => 1920 });
    // @ts-ignore
    Object.defineProperty(screen, 'height', { get: () => 1080 });
    // @ts-ignore
    Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
    // @ts-ignore
    Object.defineProperty(screen, 'availHeight', { get: () => 1040 });

    console.log('[Stealth Mode] ✅ Todas as proteções ativadas');
  });

  console.log('[GOL Scraper] 🥷 STEALTH MODE configurado');
}

/**
 * Detecta se a reserva foi cancelada
 */
async function detectCancellation(page: Page): Promise<{ cancelled: boolean; reason?: string }> {
  console.log('[GOL Scraper] Verificando status de cancelamento...');

  // Verificar múltiplos indicadores de cancelamento
  const checks = [
    // Texto explícito de cancelamento
    page.locator(SELETORES.statusCancelado).first().isVisible().catch(() => false),
    page.locator(SELETORES.mensagemCancelamento).first().isVisible().catch(() => false),

    // Mensagens de erro
    page.locator(SELETORES.mensagemErro).first().isVisible().catch(() => false),
  ];

  const results = await Promise.all(checks);
  const hasCancellationIndicator = results.some(r => r === true);

  if (hasCancellationIndicator) {
    // Tentar capturar a mensagem específica
    let reason = 'Reserva cancelada';

    try {
      const statusElement = await page.locator(SELETORES.statusCancelado).first();
      if (await statusElement.isVisible()) {
        const text = await statusElement.textContent();
        if (text) reason = text.trim();
      }
    } catch (e) {
      // Tenta pegar mensagem de erro
      try {
        const errorElement = await page.locator(SELETORES.mensagemErro).first();
        if (await errorElement.isVisible()) {
          const text = await errorElement.textContent();
          if (text) reason = text.trim();
        }
      } catch (e2) {}
    }

    console.log(`[GOL Scraper] ❌ CANCELAMENTO DETECTADO: ${reason}`);
    return { cancelled: true, reason };
  }

  // Verificar se o status contém palavras-chave de cancelamento
  try {
    const statusText = await getText(page, SELETORES.status, '');
    const lowerStatus = statusText?.toLowerCase() || '';

    if (lowerStatus.includes('cancelad') ||
        lowerStatus.includes('canceled') ||
        lowerStatus.includes('cancelled') ||
        lowerStatus.includes('inválid') ||
        lowerStatus.includes('não encontrad')) {
      console.log(`[GOL Scraper] ❌ CANCELAMENTO DETECTADO no status: ${statusText}`);
      return { cancelled: true, reason: statusText };
    }
  } catch (e) {}

  // Verificar se a página de erro foi carregada
  const pageContent = await page.content();
  const contentLower = pageContent.toLowerCase();

  if (contentLower.includes('reserva não encontrada') ||
      contentLower.includes('reserva cancelada') ||
      contentLower.includes('código de reserva inválido') ||
      contentLower.includes('bilhete cancelado')) {
    console.log('[GOL Scraper] ❌ CANCELAMENTO DETECTADO no conteúdo da página');
    return { cancelled: true, reason: 'Reserva não encontrada ou cancelada' };
  }

  console.log('[GOL Scraper] ✅ Reserva ativa (não cancelada)');
  return { cancelled: false };
}

export async function scrapeGOL(page: Page, credentials: Credentials): Promise<Partial<ReservaData>> {
  const { codigoReserva, email, senha } = credentials;

  console.log('[GOL Scraper] Iniciando scraping com anti-detecção...');

  // Configurar anti-detecção
  await setupAntiDetection(page);

  // Delay inicial aleatório
  await randomDelay(1000, 2000);

  // Navegar para a página
  console.log('[GOL Scraper] Navegando para página de gerenciar reserva...');
  await page.goto('https://www.voegol.com.br/gerenciar-reserva', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  // Verificar se a página foi bloqueada (403, erro, etc)
  const pageContent = await page.content();
  if (pageContent.includes('403') || pageContent.includes('Acesso negado') || pageContent.includes('Access Denied')) {
    console.log('[GOL Scraper] ❌ Página bloqueada (403) - site detectou automação');
    throw new Error('Página bloqueada pela GOL (erro 403) - proteção anti-bot ativa');
  }

  // Simular movimento humano
  await humanMouseMovement(page);
  await randomDelay(1500, 2500);

  // Preencher formulário com delays
  console.log('[GOL Scraper] Aguardando campo de código de reserva...');

  // Tentar encontrar o campo com timeout menor e capturar erro específico
  try {
    await page.waitForSelector(SELETORES.inputCodigoReserva, { timeout: 15000, state: 'visible' });
  } catch (error) {
    // Se não encontrou, pode ser que a página não carregou ou foi bloqueada
    console.log('[GOL Scraper] ⚠️ Campo não encontrado - verificando se página está acessível...');
    const url = page.url();
    console.log('[GOL Scraper] URL atual:', url);

    // Tirar screenshot para debug
    try {
      await page.screenshot({ path: '/tmp/gol-error.png', fullPage: false });
      console.log('[GOL Scraper] Screenshot salvo em /tmp/gol-error.png');
    } catch (e) {}

    throw new Error(`Campo de código de reserva não encontrado. URL: ${url}. Possível bloqueio ou mudança na estrutura do site.`);
  }
  await randomDelay(500, 1000);

  console.log('[GOL Scraper] Preenchendo código de reserva...');
  await page.fill(SELETORES.inputCodigoReserva, codigoReserva, { timeout: 30000 });
  await randomDelay(500, 1000);

  console.log('[GOL Scraper] Aguardando campo de sobrenome...');
  await page.waitForSelector(SELETORES.inputSobrenome, { timeout: 30000, state: 'visible' });
  await randomDelay(300, 600);

  console.log('[GOL Scraper] Preenchendo sobrenome...');
  const sobrenome = email.split('@')[0];
  await page.fill(SELETORES.inputSobrenome, sobrenome, { timeout: 30000 });
  await randomDelay(500, 1000);

  // Simular movimento antes de clicar
  await humanMouseMovement(page);
  await randomDelay(300, 700);

  // Aguardar e clicar no botão
  console.log('[GOL Scraper] Aguardando botão buscar...');
  await page.waitForSelector(SELETORES.botaoBuscar, { timeout: 30000, state: 'visible' });
  await randomDelay(200, 500);

  console.log('[GOL Scraper] Clicando em buscar...');
  await page.click(SELETORES.botaoBuscar, { timeout: 30000 });

  // Aguardar carregamento
  await randomDelay(3000, 5000);
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

  // IMPORTANTE: Verificar cancelamento ANTES de extrair dados
  const cancellationCheck = await detectCancellation(page);

  if (cancellationCheck.cancelled) {
    console.log('[GOL Scraper] ⚠️ Reserva cancelada detectada!');
    return {
      status: 'CANCELADO',
      observacoes: cancellationCheck.reason,
      voo: 'N/A',
      dataVoo: 'N/A',
    };
  }

  // Extrair dados normalmente se não estiver cancelada
  console.log('[GOL Scraper] Extraindo dados da reserva...');
  const dados = {
    status: await getText(page, SELETORES.status, 'CONFIRMADO'),
    voo: await getText(page, SELETORES.numeroVoo, 'N/A'),
    dataVoo: await getText(page, SELETORES.dataVoo, 'N/A'),
    origem: await getText(page, SELETORES.origem, 'N/A'),
    destino: await getText(page, SELETORES.destino, 'N/A'),
    horarioDecolagem: await getText(page, SELETORES.horarioDecolagem),
    horarioPouso: await getText(page, SELETORES.horarioPouso),
    portao: await getText(page, SELETORES.portao),
    aeronave: await getText(page, SELETORES.aeronave),
    passageiros: await extractPassengers(page),
  };

  console.log('[GOL Scraper] ✅ Dados extraídos com sucesso');
  console.log(`[GOL Scraper] Status final: ${dados.status}`);

  return dados;
}

async function getText(page: Page, selector: string, defaultValue?: string): Promise<string | undefined> {
  try {
    const element = await page.locator(selector).first();
    const isVisible = await element.isVisible().catch(() => false);
    if (isVisible) {
      const text = await element.textContent();
      return text?.trim() || defaultValue;
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

async function extractPassengers(page: Page) {
  const passageiros: any[] = [];
  try {
    const elementos = await page.locator(SELETORES.passageiros).all();
    for (const el of elementos) {
      const nome = await el.locator(SELETORES.nomePassageiro).first().textContent().catch(() => 'N/A');
      const assento = await el.locator(SELETORES.assentoPassageiro).first().textContent().catch(() => 'N/A');

      passageiros.push({
        nome: nome?.trim() || 'N/A',
        assento: assento?.trim() || 'N/A',
        status: 'CONFIRMADO',
      });
    }
  } catch (error) {
    console.warn('[GOL Scraper] Erro ao extrair passageiros:', error);
  }
  return passageiros;
}

export default { scrapeGOL };
