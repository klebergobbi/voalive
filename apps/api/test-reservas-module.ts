/**
 * Script de teste do módulo de monitoramento de reservas
 * Execute: npx tsx test-reservas-module.ts
 */

import * as reservasQueue from './src/modules/reservas/queues/reservasQueue';
import * as scraperService from './src/modules/reservas/services/scraperService';
import { encrypt } from './src/modules/shared/utils/encryption';

/**
 * Teste 1: Listar companhias suportadas
 */
async function test1() {
  console.log('\n========== TESTE 1: Companhias Suportadas ==========');

  const companhias = scraperService.listarCompanhiasSuportadas();
  console.log('✓ Companhias:', companhias);
  console.log('✓ Total:', companhias.length);

  for (const companhia of companhias) {
    console.log(`  - ${companhia}: ${scraperService.URLS_COMPANHIAS[companhia]}`);
  }
}

/**
 * Teste 2: Validar conexão com companhia
 */
async function test2() {
  console.log('\n========== TESTE 2: Testar Conexão ==========');

  const companhia = 'LATAM';
  console.log(`Testando conexão com ${companhia}...`);

  try {
    const sucesso = await scraperService.testarConexao(companhia);
    console.log(sucesso ? '✓ Conexão OK' : '✗ Conexão FALHOU');
  } catch (error) {
    console.error('✗ Erro:', (error as Error).message);
  }
}

/**
 * Teste 3: Adicionar reserva à fila (simulação)
 */
async function test3() {
  console.log('\n========== TESTE 3: Adicionar à Fila ==========');

  const reserva = {
    codigoReserva: 'TEST123',
    email: 'teste@email.com',
    senhaEncriptada: encrypt('senha123'),
    companhiaAerea: 'LATAM',
  };

  try {
    const jobId = await reservasQueue.adicionarReserva(reserva);
    console.log('✓ Reserva adicionada à fila');
    console.log('  Job ID:', jobId);

    // Aguarda 2 segundos
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Consulta estatísticas
    const stats = await reservasQueue.obterEstatisticas();
    console.log('✓ Estatísticas da fila:', stats);

    // Remove da fila
    await reservasQueue.removerReserva(reserva.codigoReserva);
    console.log('✓ Reserva removida da fila');
  } catch (error) {
    console.error('✗ Erro:', (error as Error).message);
  }
}

/**
 * Teste 4: Criptografia
 */
async function test4() {
  console.log('\n========== TESTE 4: Criptografia ==========');

  const { encrypt, decrypt } = require('./src/modules/shared/utils/encryption');

  const senha = 'minha_senha_secreta_123';
  console.log('Senha original:', senha);

  const encriptada = encrypt(senha);
  console.log('✓ Encriptada:', encriptada);

  const decriptada = decrypt(encriptada);
  console.log('✓ Decriptada:', decriptada);

  console.log(senha === decriptada ? '✓ Match!' : '✗ Não match');
}

/**
 * Teste 5: Detecção de mudanças
 */
async function test5() {
  console.log('\n========== TESTE 5: Detecção de Mudanças ==========');

  const changeDetection = require('./src/modules/reservas/services/changeDetectionService');

  const reservaAnterior = {
    codigoReserva: 'ABC123',
    companhiaAerea: 'LATAM',
    status: 'CONFIRMADO',
    voo: 'LA3000',
    dataVoo: '2024-01-25',
    origem: 'GRU',
    destino: 'GIG',
    passageiros: [
      { nome: 'João Silva', assento: '12A', status: 'CONFIRMADO' },
    ],
    portao: 'G10',
    horarioDecolagem: '14:30',
    dataAtualizacao: new Date('2024-01-20T10:00:00'),
    hash: '',
  };

  reservaAnterior.hash = changeDetection.criarHashReserva(reservaAnterior);

  const reservaAtual = {
    ...reservaAnterior,
    portao: 'G15', // Mudou!
    horarioDecolagem: '14:45', // Mudou!
    dataAtualizacao: new Date(),
  };

  reservaAtual.hash = changeDetection.criarHashReserva(reservaAtual);

  const mudancas = changeDetection.detectarMudancas(reservaAtual, reservaAnterior);

  console.log(`✓ Detectadas ${mudancas.length} mudanças:`);
  mudancas.forEach((m) => {
    console.log(`  [${m.severidade}] ${m.descricao}`);
  });

  const formatado = changeDetection.formatarMudancasParaNotificacao(mudancas);
  console.log('\nNotificação formatada:');
  console.log(formatado);
}

/**
 * Teste 6: Proxy Service
 */
async function test6() {
  console.log('\n========== TESTE 6: Proxy Service ==========');

  const proxyService = require('./src/modules/reservas/services/proxyService');

  console.log('✓ Obtendo proxy...');
  const proxy = proxyService.obterProximo('LATAM');
  console.log('  Proxy:', proxy || 'Nenhum configurado');

  const stats = proxyService.obterEstatisticas();
  console.log('✓ Estatísticas:', stats);
}

/**
 * Executa todos os testes
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  TESTE DO MÓDULO DE MONITORAMENTO DE RESERVAS     ║');
  console.log('╚════════════════════════════════════════════════════╝');

  try {
    await test1();
    await test2();
    await test3();
    await test4();
    await test5();
    await test6();

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  ✓ TODOS OS TESTES CONCLUÍDOS                     ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n✗ Erro durante testes:', error);
  } finally {
    // Cleanup
    const { closeConnections } = require('./src/modules/shared/config/redisConfig');
    const { shutdown } = require('./src/modules/shared/config/playwrightConfig');

    await closeConnections();
    await shutdown();

    process.exit(0);
  }
}

// Executa se rodado diretamente
if (require.main === module) {
  runAllTests();
}

export { runAllTests };
