/**
 * Scraper específico para LATAM Airlines
 * @module latamScraper
 */

import { Page } from 'playwright';
import { ReservaData } from '../changeDetectionService';

/**
 * Credenciais de login
 */
interface Credentials {
  codigoReserva: string;
  email: string;
  senha: string;
}

/**
 * Seletores CSS para LATAM
 */
const SELETORES = {
  // Página inicial
  inputCodigoReserva: 'input[name="bookingCode"], input[id="booking-code"]',
  inputSobrenome: 'input[name="lastName"], input[id="last-name"]',
  botaoBuscar: 'button[type="submit"], button:has-text("Buscar")',

  // Login (se necessário)
  inputEmail: 'input[type="email"], input[name="email"]',
  inputSenha: 'input[type="password"], input[name="password"]',
  botaoLogin: 'button[type="submit"]:has-text("Entrar")',

  // Dados da reserva
  status: '.booking-status, .reservation-status, [class*="status"]',
  numeroVoo: '.flight-number, [class*="flight-number"]',
  dataVoo: '.flight-date, [class*="date"]',
  origem: '.origin, .departure-city, [class*="origin"]',
  destino: '.destination, .arrival-city, [class*="destination"]',
  horarioDecolagem: '.departure-time, [class*="departure"]',
  horarioPouso: '.arrival-time, [class*="arrival"]',
  portao: '.gate, [class*="gate"]',
  aeronave: '.aircraft, [class*="aircraft"]',

  // Passageiros
  passageiros: '.passenger, [class*="passenger"]',
  nomePassageiro: '.passenger-name, [class*="name"]',
  assentoPassageiro: '.seat, [class*="seat"]',
  statusPassageiro: '.passenger-status, [class*="pax-status"]',

  // Erros
  captcha: '[class*="captcha"], #captcha',
  erro2FA: '[class*="2fa"], [class*="verification"]',
  erroSessao: '[class*="session"], [class*="expired"]',
};

/**
 * Faz scraping da reserva LATAM
 * @param {Page} page - Página do Playwright
 * @param {Credentials} credentials - Credenciais de acesso
 * @returns {Promise<Partial<ReservaData>>}
 */
export async function scrapeLATAM(
  page: Page,
  credentials: Credentials
): Promise<Partial<ReservaData>> {
  const { codigoReserva, email, senha } = credentials;

  console.log('[LATAM Scraper] Iniciando scraping...');

  try {
    // Navega para página de gerenciamento
    await page.goto('https://www.latam.com/pt_br/minhas-reservas', {
      waitUntil: 'networkidle',
      timeout: 15000,
    });

    // Verifica captcha
    await verificarCaptcha(page);

    // Preenche código da reserva
    await page.waitForSelector(SELETORES.inputCodigoReserva, { timeout: 5000 });
    await page.fill(SELETORES.inputCodigoReserva, codigoReserva);

    // Preenche sobrenome (email como fallback)
    const sobrenome = email.split('@')[0];
    await page.fill(SELETORES.inputSobrenome, sobrenome);

    // Clica em buscar
    await page.click(SELETORES.botaoBuscar);

    // Aguarda carregamento
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verifica se precisa login
    const precisaLogin = await page.isVisible(SELETORES.inputEmail);
    if (precisaLogin) {
      await realizarLogin(page, email, senha);
    }

    // Verifica 2FA
    await verificar2FA(page);

    // Extrai dados da reserva
    const dados = await extrairDados(page);

    console.log('[LATAM Scraper] Dados extraídos com sucesso');

    return dados;
  } catch (error) {
    console.error('[LATAM Scraper] Erro:', (error as Error).message);
    throw error;
  }
}

/**
 * Verifica se há captcha na página
 * @private
 */
async function verificarCaptcha(page: Page): Promise<void> {
  const temCaptcha = await page.isVisible(SELETORES.captcha);
  if (temCaptcha) {
    throw new Error('captcha detectado');
  }
}

/**
 * Verifica se há 2FA
 * @private
 */
async function verificar2FA(page: Page): Promise<void> {
  const tem2FA = await page.isVisible(SELETORES.erro2FA);
  if (tem2FA) {
    throw new Error('2fa necessário');
  }
}

/**
 * Realiza login se necessário
 * @private
 */
async function realizarLogin(page: Page, email: string, senha: string): Promise<void> {
  console.log('[LATAM Scraper] Realizando login...');

  await page.fill(SELETORES.inputEmail, email);
  await page.fill(SELETORES.inputSenha, senha);
  await page.click(SELETORES.botaoLogin);

  await page.waitForLoadState('networkidle', { timeout: 10000 });

  // Verifica se login foi bem-sucedido
  const loginFalhou = await page.isVisible('text=senha incorreta, text=usuário inválido');
  if (loginFalhou) {
    throw new Error('Falha no login');
  }
}

/**
 * Extrai dados da página de reserva
 * @private
 */
async function extrairDados(page: Page): Promise<Partial<ReservaData>> {
  // Aguarda elementos principais
  await page.waitForSelector(SELETORES.status, { timeout: 5000 }).catch(() => null);

  // Extrai dados principais
  const status = await extrairTexto(page, SELETORES.status, 'CONFIRMADO');
  const voo = await extrairTexto(page, SELETORES.numeroVoo, 'N/A');
  const dataVoo = await extrairTexto(page, SELETORES.dataVoo, 'N/A');
  const origem = await extrairTexto(page, SELETORES.origem, 'N/A');
  const destino = await extrairTexto(page, SELETORES.destino, 'N/A');
  const horarioDecolagem = await extrairTexto(page, SELETORES.horarioDecolagem);
  const horarioPouso = await extrairTexto(page, SELETORES.horarioPouso);
  const portao = await extrairTexto(page, SELETORES.portao);
  const aeronave = await extrairTexto(page, SELETORES.aeronave);

  // Extrai passageiros
  const passageiros = await extrairPassageiros(page);

  // Calcula duração (estimativa)
  let duracao: string | undefined;
  if (horarioDecolagem && horarioPouso) {
    duracao = calcularDuracao(horarioDecolagem, horarioPouso);
  }

  return {
    status,
    voo,
    dataVoo,
    origem,
    destino,
    passageiros,
    portao,
    horarioDecolagem,
    horarioPouso,
    duracao,
    aeronave,
  };
}

/**
 * Extrai texto de um seletor
 * @private
 */
async function extrairTexto(
  page: Page,
  seletor: string,
  padrao?: string
): Promise<string | undefined> {
  try {
    const elemento = await page.$(seletor);
    if (elemento) {
      const texto = await elemento.textContent();
      return texto?.trim() || padrao;
    }
    return padrao;
  } catch (error) {
    return padrao;
  }
}

/**
 * Extrai dados dos passageiros
 * @private
 */
async function extrairPassageiros(
  page: Page
): Promise<Array<{ nome: string; assento: string; status: string }>> {
  const passageiros: Array<{ nome: string; assento: string; status: string }> = [];

  try {
    const elementos = await page.$$(SELETORES.passageiros);

    for (const elemento of elementos) {
      const nome = await elemento
        .$(SELETORES.nomePassageiro)
        .then((el) => el?.textContent())
        .then((t) => t?.trim() || 'N/A');

      const assento = await elemento
        .$(SELETORES.assentoPassageiro)
        .then((el) => el?.textContent())
        .then((t) => t?.trim() || 'N/A');

      const status = await elemento
        .$(SELETORES.statusPassageiro)
        .then((el) => el?.textContent())
        .then((t) => t?.trim() || 'CONFIRMADO');

      passageiros.push({ nome, assento, status });
    }
  } catch (error) {
    console.warn('[LATAM Scraper] Erro ao extrair passageiros:', error);
  }

  return passageiros;
}

/**
 * Calcula duração entre dois horários
 * @private
 */
function calcularDuracao(inicio: string, fim: string): string {
  try {
    // Implementação simplificada - pode ser melhorada
    return 'N/A';
  } catch (error) {
    return 'N/A';
  }
}

export default { scrapeLATAM };
