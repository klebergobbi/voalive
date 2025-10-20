import FirecrawlApp from '@mendable/firecrawl-js';
import { DataSource } from '@prisma/client';

export interface FirecrawlConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ScrapingResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    url: string;
    timestamp: Date;
    source: DataSource;
  };
}

export class FirecrawlService {
  private app: FirecrawlApp;
  private config: FirecrawlConfig;

  constructor(config?: FirecrawlConfig) {
    this.config = config || { apiKey: process.env.FIRECRAWL_API_KEY || 'fc-2dda7f7f0e2c4ccb816cb21e7f372410' };
    this.app = new FirecrawlApp({ apiKey: this.config.apiKey });
  }

  async scrapeUrl(url: string, options?: any): Promise<ScrapingResult> {
    try {
      const result = await this.app.scrapeUrl(url, {
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        ...options
      });

      if (!result.success) {
        return {
          success: false,
          error: 'Failed to scrape URL',
          metadata: {
            url,
            timestamp: new Date(),
            source: this.getSourceFromUrl(url)
          }
        };
      }

      return {
        success: true,
        data: result.data,
        metadata: {
          url,
          timestamp: new Date(),
          source: this.getSourceFromUrl(url)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          url,
          timestamp: new Date(),
          source: this.getSourceFromUrl(url)
        }
      };
    }
  }

  async crawlSite(url: string, options?: any): Promise<ScrapingResult> {
    try {
      const crawlResponse = await this.app.crawlUrl(url, {
        limit: options?.limit || 10,
        scrapeOptions: {
          formats: ['markdown', 'html'],
          onlyMainContent: true,
          ...options?.scrapeOptions
        }
      });

      if (!crawlResponse.success) {
        return {
          success: false,
          error: 'Failed to crawl site',
          metadata: {
            url,
            timestamp: new Date(),
            source: this.getSourceFromUrl(url)
          }
        };
      }

      return {
        success: true,
        data: crawlResponse.data,
        metadata: {
          url,
          timestamp: new Date(),
          source: this.getSourceFromUrl(url)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          url,
          timestamp: new Date(),
          source: this.getSourceFromUrl(url)
        }
      };
    }
  }

  async mapSite(url: string): Promise<ScrapingResult> {
    try {
      const mapResponse = await this.app.mapUrl(url);

      if (!mapResponse.success) {
        return {
          success: false,
          error: 'Failed to map site',
          metadata: {
            url,
            timestamp: new Date(),
            source: this.getSourceFromUrl(url)
          }
        };
      }

      return {
        success: true,
        data: mapResponse.links,
        metadata: {
          url,
          timestamp: new Date(),
          source: this.getSourceFromUrl(url)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          url,
          timestamp: new Date(),
          source: this.getSourceFromUrl(url)
        }
      };
    }
  }

  async scrapeWithData(url: string, formData?: any, options?: any): Promise<any> {
    try {
      console.log(`🔥 FireCrawl: Scraping ${url} with data:`, formData);

      // Usar FireCrawl para fazer scraping inteligente do conteúdo
      const result = await this.app.scrapeUrl(url, {
        formats: ['markdown', 'html', 'rawHtml'],
        onlyMainContent: false, // Incluir formulários e dados
        waitFor: 3000, // Aguardar JavaScript carregar
        ...options
      });

      if (result.success && result.data) {
        console.log('✅ FireCrawl: Scraping bem-sucedido');
        return {
          html: result.data.html || result.data.rawHtml,
          markdown: result.data.markdown,
          content: result.data.content,
          metadata: result.data.metadata
        };
      } else {
        console.log('❌ FireCrawl: Falha no scraping');
        return null;
      }
    } catch (error) {
      console.error('❌ FireCrawl Error:', error);

      // Fallback: tentar com axios se FireCrawl falhar
      try {
        console.log('🔄 Tentando fallback com axios...');
        const axios = require('axios');
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
          },
          timeout: 10000
        });

        return {
          html: response.data,
          content: response.data
        };
      } catch (fallbackError) {
        console.error('❌ Axios fallback também falhou:', fallbackError);
        return null;
      }
    }
  }

  private getSourceFromUrl(url: string): DataSource {
    if (url.includes('flightradar24.com')) {
      return DataSource.FLIGHTRADAR24;
    }
    if (url.includes('flightaware.com')) {
      return DataSource.FLIGHTAWARE;
    }
    return DataSource.MANUAL;
  }
}

// Singleton instance
let firecrawlService: FirecrawlService;

export function getFirecrawlService(): FirecrawlService {
  if (!firecrawlService) {
    const apiKey = process.env.FIRECRAWL_API_KEY || 'fc-2dda7f7f0e2c4ccb816cb21e7f372410';
    firecrawlService = new FirecrawlService({ apiKey });
  }
  return firecrawlService;
}