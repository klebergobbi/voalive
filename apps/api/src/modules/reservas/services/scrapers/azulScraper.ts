/**
 * Scraper específico para Azul Linhas Aéreas
 * @module azulScraper
 */

import { Page } from 'playwright';
import { ReservaData } from '../changeDetectionService';

interface Credentials {
  codigoReserva: string;
  email: string;
  senha: string;
}

const SELETORES = {
  inputCodigoReserva: 'input[name="locator"], #reservation-code',
  inputSobrenome: 'input[name="lastName"]',
  botaoBuscar: 'button:has-text("Buscar reserva")',

  status: '[class*="booking-status"]',
  numeroVoo: '[class*="flight-number"]',
  dataVoo: '[class*="flight-date"]',
  origem: '[class*="origin"]',
  destino: '[class*="destination"]',
  horarioDecolagem: '[class*="departure-time"]',
  horarioPouso: '[class*="arrival-time"]',
  portao: '[class*="gate"]',
  aeronave: '[class*="aircraft"]',

  passageiros: '[class*="passenger"]',
  nomePassageiro: '[class*="pax-name"]',
  assentoPassageiro: '[class*="seat"]',
};

export async function scrapeAZUL(page: Page, credentials: Credentials): Promise<Partial<ReservaData>> {
  const { codigoReserva, email } = credentials;

  console.log('[AZUL Scraper] Iniciando scraping...');

  await page.goto('https://www.voeazul.com.br/minhas-reservas', {
    waitUntil: 'networkidle',
    timeout: 15000,
  });

  await page.fill(SELETORES.inputCodigoReserva, codigoReserva);
  await page.fill(SELETORES.inputSobrenome, email.split('@')[0]);
  await page.click(SELETORES.botaoBuscar);

  await page.waitForLoadState('networkidle', { timeout: 10000 });

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

  console.log('[AZUL Scraper] Dados extraídos com sucesso');
  return dados;
}

async function getText(page: Page, selector: string, defaultValue?: string): Promise<string | undefined> {
  try {
    const element = await page.$(selector);
    return element ? (await element.textContent())?.trim() || defaultValue : defaultValue;
  } catch {
    return defaultValue;
  }
}

async function extractPassengers(page: Page) {
  const passageiros: any[] = [];
  try {
    const elementos = await page.$$(SELETORES.passageiros);
    for (const el of elementos) {
      passageiros.push({
        nome: await el.$(SELETORES.nomePassageiro).then(e => e?.textContent()).then(t => t?.trim() || 'N/A'),
        assento: await el.$(SELETORES.assentoPassageiro).then(e => e?.textContent()).then(t => t?.trim() || 'N/A'),
        status: 'CONFIRMADO',
      });
    }
  } catch (error) {
    console.warn('[AZUL Scraper] Erro ao extrair passageiros');
  }
  return passageiros;
}

export default { scrapeAZUL };
