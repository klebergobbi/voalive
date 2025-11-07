/**
 * Proxy Manager
 * Gerencia proxies rotativos para evitar bloqueios
 *
 * Suporta:
 * - Bright Data (ex-Luminati)
 * - Oxylabs
 * - SmartProxy
 * - Proxies customizados
 */

export interface Proxy {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  country?: string;
  city?: string;
  sticky?: boolean; // Session persistence
}

export interface ProxyProvider {
  name: string;
  getProxyUrl(): string;
  rotate(): void;
  getStats(): ProxyStats;
}

export interface ProxyStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  currentProxy: string;
  rotationCount: number;
  lastRotation: Date | null;
}

/**
 * Bright Data Proxy Provider
 */
export class BrightDataProvider implements ProxyProvider {
  name = 'BrightData';
  private username: string;
  private password: string;
  private zone: string;
  private stats: ProxyStats;

  constructor(config: {
    username: string;
    password: string;
    zone?: string;
  }) {
    this.username = config.username;
    this.password = config.password;
    this.zone = config.zone || 'residential';

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      currentProxy: '',
      rotationCount: 0,
      lastRotation: null,
    };
  }

  getProxyUrl(): string {
    // Bright Data format: http://username-zone-session-rand123:password@proxy.brightdata.com:22225
    const sessionId = `rand${Math.random().toString(36).substring(7)}`;
    const proxyUser = `${this.username}-zone-${this.zone}-session-${sessionId}`;
    const url = `http://${proxyUser}:${this.password}@brd.superproxy.io:22225`;

    this.stats.currentProxy = url;
    this.stats.totalRequests++;

    return url;
  }

  rotate(): void {
    this.stats.rotationCount++;
    this.stats.lastRotation = new Date();
    // Bright Data rotates automatically with session parameter
  }

  recordSuccess(): void {
    this.stats.successfulRequests++;
  }

  recordFailure(): void {
    this.stats.failedRequests++;
  }

  getStats(): ProxyStats {
    return { ...this.stats };
  }
}

/**
 * Oxylabs Proxy Provider
 */
export class OxylabsProvider implements ProxyProvider {
  name = 'Oxylabs';
  private username: string;
  private password: string;
  private stats: ProxyStats;

  constructor(config: {
    username: string;
    password: string;
  }) {
    this.username = config.username;
    this.password = config.password;

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      currentProxy: '',
      rotationCount: 0,
      lastRotation: null,
    };
  }

  getProxyUrl(): string {
    // Oxylabs format: http://username:password@pr.oxylabs.io:7777
    const sessionId = Math.random().toString(36).substring(7);
    const url = `http://${this.username}_session-${sessionId}:${this.password}@pr.oxylabs.io:7777`;

    this.stats.currentProxy = url;
    this.stats.totalRequests++;

    return url;
  }

  rotate(): void {
    this.stats.rotationCount++;
    this.stats.lastRotation = new Date();
  }

  recordSuccess(): void {
    this.stats.successfulRequests++;
  }

  recordFailure(): void {
    this.stats.failedRequests++;
  }

  getStats(): ProxyStats {
    return { ...this.stats };
  }
}

/**
 * Custom Proxy List Provider
 */
export class CustomProxyProvider implements ProxyProvider {
  name = 'CustomProxy';
  private proxies: Proxy[];
  private currentIndex: number;
  private stats: ProxyStats;

  constructor(proxies: Proxy[]) {
    if (proxies.length === 0) {
      throw new Error('At least one proxy is required');
    }

    this.proxies = proxies;
    this.currentIndex = 0;

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      currentProxy: '',
      rotationCount: 0,
      lastRotation: null,
    };
  }

  getProxyUrl(): string {
    const proxy = this.proxies[this.currentIndex];

    let url = `${proxy.protocol}://`;

    if (proxy.username && proxy.password) {
      url += `${proxy.username}:${proxy.password}@`;
    }

    url += `${proxy.host}:${proxy.port}`;

    this.stats.currentProxy = url;
    this.stats.totalRequests++;

    return url;
  }

  rotate(): void {
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    this.stats.rotationCount++;
    this.stats.lastRotation = new Date();
  }

  recordSuccess(): void {
    this.stats.successfulRequests++;
  }

  recordFailure(): void {
    this.stats.failedRequests++;
    // Auto-rotate on failure
    this.rotate();
  }

  getStats(): ProxyStats {
    return { ...this.stats };
  }

  addProxy(proxy: Proxy): void {
    this.proxies.push(proxy);
  }

  removeProxy(index: number): void {
    if (this.proxies.length > 1) {
      this.proxies.splice(index, 1);

      if (this.currentIndex >= this.proxies.length) {
        this.currentIndex = 0;
      }
    }
  }

  getProxies(): Proxy[] {
    return [...this.proxies];
  }
}

/**
 * Proxy Manager
 * Gerencia múltiplos providers
 */
export class ProxyManager {
  private providers: Map<string, ProxyProvider>;
  private activeProvider: string | null;

  constructor() {
    this.providers = new Map();
    this.activeProvider = null;
  }

  /**
   * Add proxy provider
   */
  addProvider(name: string, provider: ProxyProvider): void {
    this.providers.set(name, provider);

    if (!this.activeProvider) {
      this.activeProvider = name;
    }
  }

  /**
   * Set active provider
   */
  setActiveProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not found`);
    }

    this.activeProvider = name;
  }

  /**
   * Get current proxy URL
   */
  getProxyUrl(): string | null {
    if (!this.activeProvider) {
      return null;
    }

    const provider = this.providers.get(this.activeProvider);
    return provider ? provider.getProxyUrl() : null;
  }

  /**
   * Rotate proxy
   */
  rotate(): void {
    if (!this.activeProvider) return;

    const provider = this.providers.get(this.activeProvider);
    if (provider) {
      provider.rotate();
    }
  }

  /**
   * Record success
   */
  recordSuccess(): void {
    if (!this.activeProvider) return;

    const provider = this.providers.get(this.activeProvider);
    if (provider && 'recordSuccess' in provider) {
      (provider as any).recordSuccess();
    }
  }

  /**
   * Record failure
   */
  recordFailure(): void {
    if (!this.activeProvider) return;

    const provider = this.providers.get(this.activeProvider);
    if (provider && 'recordFailure' in provider) {
      (provider as any).recordFailure();
    }
  }

  /**
   * Get stats for all providers
   */
  getStats(): Record<string, ProxyStats> {
    const stats: Record<string, ProxyStats> = {};

    for (const [name, provider] of this.providers) {
      stats[name] = provider.getStats();
    }

    return stats;
  }

  /**
   * Get active provider
   */
  getActiveProvider(): ProxyProvider | null {
    if (!this.activeProvider) return null;
    return this.providers.get(this.activeProvider) || null;
  }

  /**
   * List providers
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Remove provider
   */
  removeProvider(name: string): void {
    this.providers.delete(name);

    if (this.activeProvider === name) {
      this.activeProvider = this.providers.size > 0
        ? Array.from(this.providers.keys())[0]
        : null;
    }
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
    this.activeProvider = null;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let proxyManagerInstance: ProxyManager | null = null;

/**
 * Get ProxyManager instance
 */
export function getProxyManager(): ProxyManager {
  if (!proxyManagerInstance) {
    proxyManagerInstance = new ProxyManager();
  }

  return proxyManagerInstance;
}

/**
 * Setup proxy from environment variables
 */
export function setupProxyFromEnv(): ProxyManager {
  const manager = getProxyManager();

  const provider = process.env.PROXY_PROVIDER;

  if (provider === 'brightdata') {
    const username = process.env.BRIGHTDATA_USERNAME;
    const password = process.env.BRIGHTDATA_PASSWORD;
    const zone = process.env.BRIGHTDATA_ZONE || 'residential';

    if (username && password) {
      manager.addProvider('brightdata', new BrightDataProvider({
        username,
        password,
        zone,
      }));
      manager.setActiveProvider('brightdata');
      console.log('✅ Bright Data proxy configured');
    }
  } else if (provider === 'oxylabs') {
    const username = process.env.OXYLABS_USERNAME;
    const password = process.env.OXYLABS_PASSWORD;

    if (username && password) {
      manager.addProvider('oxylabs', new OxylabsProvider({
        username,
        password,
      }));
      manager.setActiveProvider('oxylabs');
      console.log('✅ Oxylabs proxy configured');
    }
  } else if (provider === 'custom') {
    // Parse custom proxy list from env
    const proxyList = process.env.PROXY_LIST;

    if (proxyList) {
      const proxies = proxyList.split(',').map(proxyStr => {
        const [host, port, username, password] = proxyStr.split(':');
        return {
          host,
          port: parseInt(port, 10),
          username,
          password,
          protocol: 'http' as const,
        };
      });

      manager.addProvider('custom', new CustomProxyProvider(proxies));
      manager.setActiveProvider('custom');
      console.log(`✅ Custom proxies configured (${proxies.length} proxies)`);
    }
  }

  return manager;
}

export default ProxyManager;
