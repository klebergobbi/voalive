/**
 * Serviço de gerenciamento de proxies
 * @module proxyService
 */

import { proxyRotator } from '../../shared/utils/proxyRotator';
import { ProxyError } from '../../shared/utils/errorHandler';

/**
 * Interface de configuração de proxy
 */
export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

/**
 * Obtém o próximo proxy disponível
 * @param {string} [companhiaAerea] - Companhia aérea (para rate limiting específico)
 * @returns {string | null} String do proxy ou null
 */
export function obterProximo(companhiaAerea?: string): string | null {
  try {
    const proxy = proxyRotator.getNextProxy();

    if (proxy) {
      console.log(`[Proxy Service] Proxy selecionado para ${companhiaAerea || 'requisição'}`);
    }

    return proxy;
  } catch (error) {
    console.error('[Proxy Service] Erro ao obter proxy:', error);
    return null;
  }
}

/**
 * Formata proxy para uso com Playwright
 * @param {string | null} proxy - String do proxy
 * @returns {ProxyConfig | null}
 */
export function formatarParaPlaywright(proxy: string | null): ProxyConfig | null {
  if (!proxy) return null;

  try {
    return proxyRotator.formatProxyForPlaywright(proxy);
  } catch (error) {
    console.error('[Proxy Service] Erro ao formatar proxy:', error);
    return null;
  }
}

/**
 * Reporta sucesso de um proxy
 * @param {string | null} proxy - Proxy que funcionou
 */
export function reportarSucesso(proxy: string | null): void {
  if (!proxy) return;

  proxyRotator.reportSuccess(proxy);
  console.log('[Proxy Service] Sucesso reportado para proxy');
}

/**
 * Reporta falha de um proxy
 * @param {string | null} proxy - Proxy que falhou
 * @param {Error} [erro] - Erro ocorrido
 */
export function reportarFalha(proxy: string | null, erro?: Error): void {
  if (!proxy) return;

  proxyRotator.reportFailure(proxy);
  console.warn('[Proxy Service] Falha reportada para proxy:', erro?.message);
}

/**
 * Adiciona proxies customizados ao pool
 * @param {string[]} proxies - Lista de proxies
 */
export function adicionarProxies(proxies: string[]): void {
  const proxiesValidos = proxies.filter((p) => proxyRotator.isValidProxy(p));

  if (proxiesValidos.length !== proxies.length) {
    console.warn(
      `[Proxy Service] ${proxies.length - proxiesValidos.length} proxies inválidos foram ignorados`
    );
  }

  proxyRotator.addCustomProxies(proxiesValidos);
  console.log(`[Proxy Service] ${proxiesValidos.length} proxies adicionados`);
}

/**
 * Obtém estatísticas dos proxies
 * @returns {Object}
 */
export function obterEstatisticas() {
  return proxyRotator.getStats();
}

/**
 * Remove um proxy específico do pool
 * @param {string} proxy - Proxy a ser removido
 */
export function removerProxy(proxy: string): void {
  proxyRotator.removeProxy(proxy);
  console.log(`[Proxy Service] Proxy removido: ${proxy}`);
}

/**
 * Lista proxies ativos (não blacklistados)
 * @returns {string[]}
 */
export function listarAtivos(): string[] {
  return proxyRotator.getActiveProxies();
}

/**
 * Reseta estatísticas de todos os proxies
 */
export function resetarEstatisticas(): void {
  proxyRotator.reset();
  console.log('[Proxy Service] Estatísticas resetadas');
}

/**
 * Carrega proxies de provedor externo
 * @param {string} provider - Nome do provedor (brightdata, oxylabs, etc.)
 * @returns {Promise<boolean>} True se carregou com sucesso
 */
export async function carregarDeProvedor(provider: string): Promise<boolean> {
  try {
    // Implementação básica - pode ser expandida para buscar de APIs
    console.log(`[Proxy Service] Carregando proxies do provedor: ${provider}`);

    // Por enquanto, usa configuração do .env
    const proxy = proxyRotator.getNextProxy();

    if (!proxy) {
      throw new ProxyError(`Nenhum proxy disponível no provedor: ${provider}`);
    }

    return true;
  } catch (error) {
    console.error('[Proxy Service] Erro ao carregar de provedor:', error);
    return false;
  }
}

/**
 * Verifica se há proxies disponíveis
 * @returns {boolean}
 */
export function temProxiesDisponiveis(): boolean {
  const ativos = proxyRotator.getActiveProxies();
  return ativos.length > 0;
}

/**
 * Executa com retry usando diferentes proxies em caso de falha
 * @param {Function} fn - Função a ser executada
 * @param {number} maxTentativas - Máximo de tentativas
 * @returns {Promise<any>}
 */
export async function executarComRetry<T>(
  fn: (proxy: string | null) => Promise<T>,
  maxTentativas: number = 3
): Promise<T> {
  let ultimoErro: Error | null = null;
  let tentativas = 0;

  while (tentativas < maxTentativas) {
    tentativas++;
    const proxy = obterProximo();

    try {
      console.log(`[Proxy Service] Tentativa ${tentativas}/${maxTentativas}`);
      const resultado = await fn(proxy);
      reportarSucesso(proxy);
      return resultado;
    } catch (error) {
      ultimoErro = error as Error;
      reportarFalha(proxy, error as Error);
      console.warn(
        `[Proxy Service] Tentativa ${tentativas} falhou:`,
        (error as Error).message
      );

      // Se não for erro de proxy, não tenta novamente
      if (!(error instanceof ProxyError)) {
        throw error;
      }

      // Aguarda antes de tentar novamente (exponential backoff)
      if (tentativas < maxTentativas) {
        const delay = Math.pow(2, tentativas) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new ProxyError(
    `Falha após ${maxTentativas} tentativas com diferentes proxies`,
    { ultimoErro: ultimoErro?.message }
  );
}

/**
 * Health check dos proxies ativos
 * @returns {Promise<Object>}
 */
export async function healthCheck(): Promise<{
  total: number;
  ativos: number;
  taxa_sucesso: number;
}> {
  const stats = obterEstatisticas();
  const ativos = listarAtivos();

  let totalRequisicoes = 0;
  let totalSucessos = 0;

  for (const proxyStat of stats.proxyStats) {
    totalRequisicoes += proxyStat.success + proxyStat.failures;
    totalSucessos += proxyStat.success;
  }

  return {
    total: stats.customProxiesCount,
    ativos: ativos.length,
    taxa_sucesso: totalRequisicoes > 0 ? totalSucessos / totalRequisicoes : 0,
  };
}

export default {
  obterProximo,
  formatarParaPlaywright,
  reportarSucesso,
  reportarFalha,
  adicionarProxies,
  obterEstatisticas,
  removerProxy,
  listarAtivos,
  resetarEstatisticas,
  carregarDeProvedor,
  temProxiesDisponiveis,
  executarComRetry,
  healthCheck,
};
