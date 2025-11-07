/**
 * Scraper Factory
 * Factory pattern para instanciar scrapers apropriados
 */

import { BaseScraper } from './base.scraper';
import { LatamScraper } from './latam.scraper';
import { GolScraper } from './gol.scraper';
import { AzulScraper } from './azul.scraper';

export class ScraperFactory {
  private static instances: Map<string, BaseScraper> = new Map();

  /**
   * Retorna scraper para a companhia aérea especificada
   */
  static getScraper(airline: string): BaseScraper {
    const normalizedAirline = airline.toLowerCase().trim();

    // Retornar instância existente se disponível
    if (this.instances.has(normalizedAirline)) {
      return this.instances.get(normalizedAirline)!;
    }

    // Criar nova instância
    let scraper: BaseScraper;

    switch (normalizedAirline) {
      case 'latam':
      case 'tam':
      case 'lan':
      case 'la':
        scraper = new LatamScraper();
        break;

      case 'gol':
      case 'g3':
        scraper = new GolScraper();
        break;

      case 'azul':
      case 'ad':
        scraper = new AzulScraper();
        break;

      default:
        throw new Error(
          `Companhia aérea não suportada: ${airline}. ` +
          `Companhias suportadas: LATAM, GOL, AZUL`
        );
    }

    // Armazenar instância
    this.instances.set(normalizedAirline, scraper);

    return scraper;
  }

  /**
   * Lista companhias aéreas suportadas
   */
  static getSupportedAirlines(): string[] {
    return ['LATAM', 'GOL', 'AZUL'];
  }

  /**
   * Verifica se uma companhia é suportada
   */
  static isSupported(airline: string): boolean {
    const normalized = airline.toLowerCase();
    const supported = ['latam', 'tam', 'lan', 'la', 'gol', 'g3', 'azul', 'ad'];
    return supported.includes(normalized);
  }

  /**
   * Limpa cache de instâncias
   */
  static clearCache(): void {
    this.instances.clear();
  }
}
