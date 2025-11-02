/**
 * Gerenciador de rotação de proxies
 * @module proxyRotator
 */

import dotenv from 'dotenv';

dotenv.config();

/**
 * @typedef {Object} ProxyConfig
 * @property {string} host - Host do proxy
 * @property {number} port - Porta do proxy
 * @property {string} [username] - Usuário para autenticação
 * @property {string} [password] - Senha para autenticação
 */

interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

/**
 * Provedor de proxy configurado
 */
const PROXY_PROVIDER = process.env.PROXY_PROVIDER || 'none';
const PROXY_USERNAME = process.env.PROXY_USERNAME || '';
const PROXY_PASSWORD = process.env.PROXY_PASSWORD || '';
const PROXY_ROTATION_INTERVAL = parseInt(process.env.PROXY_ROTATION_INTERVAL || '5', 10);

/**
 * Configurações de proxies por provedor
 */
const PROXY_CONFIGS: Record<string, () => string> = {
  brightdata: () => {
    // BrightData (Luminati) - formato: username-session-{random}:password@host:port
    const session = Math.random().toString(36).substring(7);
    return `${PROXY_USERNAME}-session-${session}:${PROXY_PASSWORD}@brd.superproxy.io:22225`;
  },
  oxylabs: () => {
    // Oxylabs - formato: customer-{username}:password@host:port
    return `${PROXY_USERNAME}:${PROXY_PASSWORD}@pr.oxylabs.io:7777`;
  },
  smartproxy: () => {
    // SmartProxy - formato: username:password@host:port
    return `${PROXY_USERNAME}:${PROXY_PASSWORD}@gate.smartproxy.com:7000`;
  },
  none: () => '',
};

/**
 * Classe de gerenciamento de proxies
 */
class ProxyRotator {
  private currentRotation: number = 0;
  private requestCount: number = 0;
  private readonly rotationInterval: number;
  private readonly provider: string;
  private customProxies: string[] = [];
  private blacklistedProxies: Set<string> = new Set();
  private proxyStats: Map<string, { success: number; failures: number }> = new Map();

  constructor(provider: string = PROXY_PROVIDER, rotationInterval: number = PROXY_ROTATION_INTERVAL) {
    this.provider = provider;
    this.rotationInterval = rotationInterval;
  }

  /**
   * Adiciona proxies customizados à rotação
   * @param {string[]} proxies - Lista de proxies no formato host:port ou username:password@host:port
   */
  addCustomProxies(proxies: string[]): void {
    this.customProxies = [...this.customProxies, ...proxies];
    console.log(`[Proxy Rotator] ${proxies.length} proxies customizados adicionados`);
  }

  /**
   * Obtém o próximo proxy da rotação
   * @returns {string | null} String do proxy ou null se sem proxy
   */
  getNextProxy(): string | null {
    this.requestCount++;

    // Sem proxy configurado
    if (this.provider === 'none' && this.customProxies.length === 0) {
      return null;
    }

    // Rotação a cada N requisições
    if (this.requestCount % this.rotationInterval === 0) {
      this.currentRotation++;
    }

    // Proxies customizados têm prioridade
    if (this.customProxies.length > 0) {
      const availableProxies = this.customProxies.filter(
        (proxy) => !this.blacklistedProxies.has(proxy)
      );

      if (availableProxies.length === 0) {
        console.warn('[Proxy Rotator] Todos os proxies customizados estão na blacklist');
        this.blacklistedProxies.clear(); // Reset blacklist
        return this.customProxies[0];
      }

      const index = this.currentRotation % availableProxies.length;
      return availableProxies[index];
    }

    // Usa provedor configurado
    const proxyGenerator = PROXY_CONFIGS[this.provider];
    if (!proxyGenerator) {
      console.warn(`[Proxy Rotator] Provedor desconhecido: ${this.provider}`);
      return null;
    }

    return proxyGenerator();
  }

  /**
   * Marca um proxy como falho
   * @param {string} proxy - Proxy que falhou
   */
  reportFailure(proxy: string): void {
    if (!proxy) return;

    const stats = this.proxyStats.get(proxy) || { success: 0, failures: 0 };
    stats.failures++;
    this.proxyStats.set(proxy, stats);

    // Blacklist após 3 falhas consecutivas
    if (stats.failures >= 3 && stats.failures > stats.success) {
      this.blacklistedProxies.add(proxy);
      console.warn(`[Proxy Rotator] Proxy blacklistado após múltiplas falhas: ${proxy}`);
    }
  }

  /**
   * Marca um proxy como bem-sucedido
   * @param {string} proxy - Proxy que funcionou
   */
  reportSuccess(proxy: string): void {
    if (!proxy) return;

    const stats = this.proxyStats.get(proxy) || { success: 0, failures: 0 };
    stats.success++;
    this.proxyStats.set(proxy, stats);

    // Remove da blacklist após 2 sucessos
    if (stats.success >= 2 && this.blacklistedProxies.has(proxy)) {
      this.blacklistedProxies.delete(proxy);
      console.log(`[Proxy Rotator] Proxy removido da blacklist: ${proxy}`);
    }
  }

  /**
   * Verifica se um proxy é válido
   * @param {string} proxy - String do proxy
   * @returns {boolean}
   */
  isValidProxy(proxy: string): boolean {
    if (!proxy) return false;

    // Formato: host:port ou username:password@host:port
    const proxyRegex = /^(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/;
    return proxyRegex.test(proxy);
  }

  /**
   * Formata proxy para uso com Playwright
   * @param {string} proxy - String do proxy
   * @returns {Object | null} Configuração de proxy formatada
   */
  formatProxyForPlaywright(proxy: string): { server: string; username?: string; password?: string } | null {
    if (!proxy || !this.isValidProxy(proxy)) {
      return null;
    }

    const proxyRegex = /^(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/;
    const match = proxy.match(proxyRegex);

    if (!match) return null;

    const [, username, password, host, port] = match;

    const config: any = {
      server: `http://${host}:${port}`,
    };

    if (username && password) {
      config.username = username;
      config.password = password;
    }

    return config;
  }

  /**
   * Retorna estatísticas dos proxies
   */
  getStats() {
    return {
      provider: this.provider,
      requestCount: this.requestCount,
      rotationInterval: this.rotationInterval,
      customProxiesCount: this.customProxies.length,
      blacklistedCount: this.blacklistedProxies.size,
      proxyStats: Array.from(this.proxyStats.entries()).map(([proxy, stats]) => ({
        proxy: this.sanitizeProxy(proxy),
        ...stats,
        successRate: stats.success / (stats.success + stats.failures),
      })),
    };
  }

  /**
   * Sanitiza string de proxy para logging (oculta credenciais)
   * @private
   */
  private sanitizeProxy(proxy: string): string {
    if (!proxy) return '';

    const proxyRegex = /^(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/;
    const match = proxy.match(proxyRegex);

    if (!match) return proxy;

    const [, username, , host, port] = match;

    if (username) {
      return `${username}:***@${host}:${port}`;
    }

    return `${host}:${port}`;
  }

  /**
   * Reseta estatísticas
   */
  reset(): void {
    this.requestCount = 0;
    this.currentRotation = 0;
    this.blacklistedProxies.clear();
    this.proxyStats.clear();
    console.log('[Proxy Rotator] Estatísticas resetadas');
  }

  /**
   * Remove um proxy específico
   */
  removeProxy(proxy: string): void {
    this.customProxies = this.customProxies.filter((p) => p !== proxy);
    this.blacklistedProxies.delete(proxy);
    this.proxyStats.delete(proxy);
  }

  /**
   * Lista proxies ativos (não blacklistados)
   */
  getActiveProxies(): string[] {
    return this.customProxies.filter((proxy) => !this.blacklistedProxies.has(proxy));
  }
}

/**
 * Instância global do rotator
 */
export const proxyRotator = new ProxyRotator();

/**
 * Testa um proxy fazendo uma requisição simples
 * @param {string} proxy - Proxy a ser testado
 * @returns {Promise<boolean>}
 */
export async function testProxy(proxy: string): Promise<boolean> {
  // Implementação básica - pode ser expandida com requisição HTTP real
  return proxyRotator.isValidProxy(proxy);
}

export default {
  proxyRotator,
  testProxy,
  ProxyRotator,
};
