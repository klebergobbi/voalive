/**
 * Airline Web Scraper - Usage Examples
 * Exemplos práticos de como usar os scrapers
 */

import AirlineScraperFactory, {
  LatamScraper,
  GolScraper,
  AzulScraper,
  AviancaScraper,
  ScraperConfig,
} from './airlineWebScraper';

import {
  ProxyManager,
  BrightDataProvider,
  OxylabsProvider,
  CustomProxyProvider,
  setupProxyFromEnv,
} from './proxyManager';

// ============================================================================
// EXEMPLO 1: Uso Básico - Scraper Específico
// ============================================================================

export async function example1_BasicUsage() {
  console.log('\n📚 EXEMPLO 1: Uso Básico\n');

  // Criar scraper da GOL
  const golScraper = new GolScraper({
    headless: true,
    timeout: 30000,
    maxRetries: 3,
  });

  try {
    const result = await golScraper.scrapeFlightStatus('PDCDX', 'DINIZ');

    if (result.success) {
      console.log('✅ Voo encontrado!');
      console.log('Número do voo:', result.flight?.flightNumber);
      console.log('Status:', result.flight?.status);
      console.log('Portão:', result.flight?.departure.gate);
      console.log('Horário:', result.flight?.departure.scheduledTime);
    } else {
      console.log('❌ Voo não encontrado:', result.error);
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

// ============================================================================
// EXEMPLO 2: Factory com Detecção Automática
// ============================================================================

export async function example2_FactoryWithAutoDetect() {
  console.log('\n📚 EXEMPLO 2: Factory com Detecção Automática\n');

  const bookingCodes = [
    { code: 'PDCDX', lastName: 'DINIZ' },      // GOL (6 caracteres)
    { code: 'G32067', lastName: 'SILVA' },     // GOL (G3)
    { code: 'LA1234', lastName: 'SANTOS' },    // LATAM (LA)
    { code: 'AD5678', lastName: 'COSTA' },     // Azul (AD)
  ];

  for (const booking of bookingCodes) {
    console.log(`\n🔍 Buscando: ${booking.code} - ${booking.lastName}`);

    const detectedAirline = AirlineScraperFactory.detectAirline(booking.code);
    console.log(`Companhia detectada: ${detectedAirline || 'Desconhecida'}`);

    if (detectedAirline) {
      const scraper = AirlineScraperFactory.getScraper(detectedAirline);

      try {
        const result = await scraper.scrapeFlightStatus(booking.code, booking.lastName);

        if (result.success) {
          console.log(`✅ Encontrado: ${result.flight?.flightNumber}`);
        } else {
          console.log(`❌ Não encontrado: ${result.error}`);
        }
      } catch (error) {
        console.error(`Erro: ${error instanceof Error ? error.message : error}`);
      }
    }

    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// ============================================================================
// EXEMPLO 3: Tentar Todas as Companhias
// ============================================================================

export async function example3_TryAllAirlines() {
  console.log('\n📚 EXEMPLO 3: Tentar Todas as Companhias\n');

  const bookingRef = 'ABC123';
  const lastName = 'SILVA';

  try {
    console.log(`🔄 Tentando todas as companhias para: ${bookingRef}`);

    const result = await AirlineScraperFactory.scrapeAny(bookingRef, lastName, {
      headless: true,
      timeout: 30000,
      maxRetries: 2, // Menos retries por companhia
    });

    if (result.success) {
      console.log('✅ Voo encontrado!');
      console.log('Companhia:', result.flight?.airline);
      console.log('Número:', result.flight?.flightNumber);
      console.log('Status:', result.flight?.status);
    }
  } catch (error) {
    console.error('❌ Não encontrado em nenhuma companhia:', error);
  }
}

// ============================================================================
// EXEMPLO 4: Configuração com Proxy
// ============================================================================

export async function example4_WithProxy() {
  console.log('\n📚 EXEMPLO 4: Configuração com Proxy\n');

  // Opção 1: Bright Data
  const proxyManager = new ProxyManager();

  proxyManager.addProvider('brightdata', new BrightDataProvider({
    username: 'your-username',
    password: 'your-password',
    zone: 'residential',
  }));

  proxyManager.setActiveProvider('brightdata');

  // Get proxy URL
  const proxyUrl = proxyManager.getProxyUrl();
  console.log('Proxy URL:', proxyUrl);

  // Use proxy with scraper
  const config: ScraperConfig = {
    headless: true,
    timeout: 45000,
    useProxy: true,
    proxyUrl: proxyUrl || undefined,
  };

  const scraper = new GolScraper(config);

  try {
    const result = await scraper.scrapeFlightStatus('PDCDX', 'DINIZ');

    // Record success/failure
    if (result.success) {
      proxyManager.recordSuccess();
      console.log('✅ Sucesso com proxy!');
    } else {
      proxyManager.recordFailure();
      console.log('❌ Falha com proxy');
    }

    // View stats
    console.log('Proxy stats:', proxyManager.getStats());
  } catch (error) {
    proxyManager.recordFailure();
    console.error('Erro:', error);
  }
}

// ============================================================================
// EXEMPLO 5: Proxy Rotation Automática
// ============================================================================

export async function example5_ProxyRotation() {
  console.log('\n📚 EXEMPLO 5: Proxy Rotation Automática\n');

  // Setup custom proxy list
  const proxyManager = new ProxyManager();

  proxyManager.addProvider('custom', new CustomProxyProvider([
    {
      host: 'proxy1.example.com',
      port: 8080,
      username: 'user1',
      password: 'pass1',
      protocol: 'http',
    },
    {
      host: 'proxy2.example.com',
      port: 8080,
      username: 'user2',
      password: 'pass2',
      protocol: 'http',
    },
    {
      host: 'proxy3.example.com',
      port: 8080,
      protocol: 'http',
    },
  ]));

  proxyManager.setActiveProvider('custom');

  // Make multiple requests with rotation
  for (let i = 0; i < 5; i++) {
    const proxyUrl = proxyManager.getProxyUrl();
    console.log(`Request ${i + 1} usando proxy: ${proxyUrl}`);

    // Simulate request
    const success = Math.random() > 0.3; // 70% success rate

    if (success) {
      proxyManager.recordSuccess();
      console.log('✅ Sucesso');
    } else {
      proxyManager.recordFailure();
      console.log('❌ Falha - rotacionando proxy');
      proxyManager.rotate();
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\nEstatísticas finais:', proxyManager.getStats());
}

// ============================================================================
// EXEMPLO 6: Setup via Environment Variables
// ============================================================================

export async function example6_EnvSetup() {
  console.log('\n📚 EXEMPLO 6: Setup via Environment Variables\n');

  // Set environment variables (normalmente feito via .env)
  process.env.PROXY_PROVIDER = 'brightdata';
  process.env.BRIGHTDATA_USERNAME = 'your-username';
  process.env.BRIGHTDATA_PASSWORD = 'your-password';
  process.env.BRIGHTDATA_ZONE = 'residential';

  // Setup proxy from env
  const proxyManager = setupProxyFromEnv();

  // Get proxy URL
  const proxyUrl = proxyManager.getProxyUrl();

  if (proxyUrl) {
    console.log('✅ Proxy configurado via ENV:', proxyUrl.substring(0, 50) + '...');

    // Use in scraper
    const scraper = new GolScraper({
      useProxy: true,
      proxyUrl,
    });

    console.log('Scraper configurado com proxy!');
  } else {
    console.log('⚠️ Nenhum proxy configurado');
  }
}

// ============================================================================
// EXEMPLO 7: User-Agent Rotation
// ============================================================================

export async function example7_UserAgentRotation() {
  console.log('\n📚 EXEMPLO 7: User-Agent Rotation\n');

  const scraper = new GolScraper({
    headless: true,
    userAgentRotation: true, // Enable UA rotation
    timeout: 30000,
  });

  // Make multiple requests - UA will rotate automatically
  for (let i = 0; i < 3; i++) {
    console.log(`\nRequest ${i + 1}:`);

    try {
      const result = await scraper.scrapeFlightStatus('TEST', 'USER');
      console.log('Status:', result.success ? 'Success' : 'Failed');
    } catch (error) {
      console.log('Error:', error instanceof Error ? error.message : error);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// ============================================================================
// EXEMPLO 8: Stealth Mode
// ============================================================================

export async function example8_StealthMode() {
  console.log('\n📚 EXEMPLO 8: Stealth Mode (Anti-Detection)\n');

  const scraper = new LatamScraper({
    headless: true,
    stealthMode: true, // Enable stealth mode
    timeout: 30000,
  });

  console.log('Stealth mode features:');
  console.log('- ✅ navigator.webdriver = false');
  console.log('- ✅ Plugins emulation');
  console.log('- ✅ Languages setting');
  console.log('- ✅ Chrome object');
  console.log('- ✅ Permissions handling');

  try {
    const result = await scraper.scrapeFlightStatus('ABC123', 'SILVA');
    console.log('\nResult:', result.success ? 'Success' : 'Failed');
  } catch (error) {
    console.log('Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// EXEMPLO 9: Retry Logic com Backoff
// ============================================================================

export async function example9_RetryLogic() {
  console.log('\n📚 EXEMPLO 9: Retry Logic com Exponential Backoff\n');

  const scraper = new AzulScraper({
    maxRetries: 5, // Try up to 5 times
    timeout: 20000,
  });

  console.log('Retry config:');
  console.log('- Max retries: 5');
  console.log('- Backoff: Exponencial (1s, 2s, 4s, 8s, 10s)');
  console.log('- Jitter: Random delay added');

  try {
    const result = await scraper.scrapeFlightStatus('INVALID', 'TEST');
    console.log('Result:', result);
  } catch (error) {
    console.log('Failed after all retries:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// EXEMPLO 10: Scraping Paralelo
// ============================================================================

export async function example10_ParallelScraping() {
  console.log('\n📚 EXEMPLO 10: Scraping Paralelo (Múltiplas Reservas)\n');

  const bookings = [
    { code: 'ABC123', lastName: 'SILVA', airline: 'GOL' as const },
    { code: 'DEF456', lastName: 'SANTOS', airline: 'LATAM' as const },
    { code: 'GHI789', lastName: 'COSTA', airline: 'AZUL' as const },
  ];

  console.log(`Buscando ${bookings.length} reservas em paralelo...\n`);

  const promises = bookings.map(async (booking) => {
    const scraper = AirlineScraperFactory.getScraper(booking.airline, {
      timeout: 30000,
      maxRetries: 2,
    });

    try {
      const result = await scraper.scrapeFlightStatus(booking.code, booking.lastName);
      return {
        booking: booking.code,
        success: result.success,
        airline: booking.airline,
      };
    } catch (error) {
      return {
        booking: booking.code,
        success: false,
        airline: booking.airline,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  const results = await Promise.all(promises);

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.booking} (${result.airline})`);
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\nResultado: ${successCount}/${bookings.length} encontrados`);
}

// ============================================================================
// MAIN - Execute Examples
// ============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        AIRLINE WEB SCRAPER - USAGE EXAMPLES                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  // Uncomment to run specific examples:

  // await example1_BasicUsage();
  // await example2_FactoryWithAutoDetect();
  // await example3_TryAllAirlines();
  // await example4_WithProxy();
  // await example5_ProxyRotation();
  // await example6_EnvSetup();
  // await example7_UserAgentRotation();
  // await example8_StealthMode();
  // await example9_RetryLogic();
  // await example10_ParallelScraping();

  console.log('\n✅ Examples completed!\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default {
  example1_BasicUsage,
  example2_FactoryWithAutoDetect,
  example3_TryAllAirlines,
  example4_WithProxy,
  example5_ProxyRotation,
  example6_EnvSetup,
  example7_UserAgentRotation,
  example8_StealthMode,
  example9_RetryLogic,
  example10_ParallelScraping,
};
