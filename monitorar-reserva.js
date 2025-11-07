#!/usr/bin/env node

/**
 * 🎯 SCRIPT DE MONITORAMENTO DE RESERVAS POR NÚMERO
 *
 * Este script permite monitorar voos através do número da reserva (localizador/PNR)
 * usando web scraping avançado nas companhias aéreas.
 *
 * Uso: node monitorar-reserva.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuração da API
const API_URL = 'http://localhost:4000';

// Cores para terminal
const cores = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(msg, cor = cores.white) {
  console.log(`${cor}${msg}${cores.reset}`);
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(`${cores.cyan}${prompt}${cores.reset}`, resolve);
  });
}

async function verificarAPI() {
  try {
    log('\n🔍 Verificando conexão com API...', cores.blue);
    const response = await fetch(`${API_URL}/api/health/reservas`);

    if (!response.ok) {
      throw new Error('API não está respondendo');
    }

    const health = await response.json();

    log('\n✅ API está funcionando!', cores.green);
    log(`   Redis: ${health.checks.redis}`, cores.dim);
    log(`   Playwright: ${health.checks.playwright}`, cores.dim);
    log(`   Queue: ${health.checks.queue}`, cores.dim);

    return true;
  } catch (error) {
    log('\n❌ ERRO: API não está rodando!', cores.red);
    log('\n💡 Inicie a API primeiro:', cores.yellow);
    log('   cd C:/Projetos/VoaLive/apps/api', cores.dim);
    log('   npm run dev', cores.dim);
    return false;
  }
}

async function listarCompanhias() {
  try {
    const response = await fetch(`${API_URL}/api/reservas/companhias`);
    const data = await response.json();

    if (data.sucesso) {
      log('\n✈️  Companhias Disponíveis:', cores.bright);
      data.dados.companhias.forEach((cia, idx) => {
        log(`   ${idx + 1}. ${cia}`, cores.cyan);
      });
      return data.dados.companhias;
    }
  } catch (error) {
    log('❌ Erro ao listar companhias', cores.red);
    return [];
  }
}

async function iniciarMonitoramento(dados) {
  try {
    log('\n🚀 Iniciando monitoramento...', cores.blue);
    log(`   Reserva: ${dados.codigoReserva}`, cores.dim);
    log(`   Companhia: ${dados.companhiaAerea}`, cores.dim);

    const response = await fetch(`${API_URL}/api/reservas/monitorar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dados)
    });

    const result = await response.json();

    if (result.sucesso) {
      log('\n✅ MONITORAMENTO INICIADO COM SUCESSO!', cores.green + cores.bright);
      log('\n📊 Informações:', cores.cyan);
      log(`   Job ID: ${result.dados.jobId}`, cores.dim);
      log(`   Status: ${result.dados.status}`, cores.dim);
      log(`   Próxima verificação: ${new Date(result.dados.proximaVerificacao).toLocaleString('pt-BR')}`, cores.dim);

      log('\n⏱️  Aguarde 10-15 segundos para a primeira verificação...', cores.yellow);

      // Aguardar 15 segundos e consultar status
      await new Promise(resolve => setTimeout(resolve, 15000));

      await consultarStatus(dados.codigoReserva);

      return true;
    } else {
      log(`\n❌ Erro: ${result.mensagem || 'Falha ao iniciar monitoramento'}`, cores.red);

      if (result.erro) {
        log(`\nDetalhes: ${result.erro}`, cores.dim);
      }

      return false;
    }
  } catch (error) {
    log(`\n❌ Erro ao iniciar monitoramento: ${error.message}`, cores.red);
    return false;
  }
}

async function consultarStatus(codigoReserva) {
  try {
    log('\n🔍 Consultando status da reserva...', cores.blue);

    const response = await fetch(`${API_URL}/api/reservas/${codigoReserva}/status`);
    const result = await response.json();

    if (result.sucesso && result.dados.reserva) {
      const reserva = result.dados.reserva;

      log('\n✈️  DADOS DA RESERVA:', cores.green + cores.bright);
      log(`\n📋 Informações Básicas:`, cores.cyan);
      log(`   Status: ${reserva.status || 'N/A'}`, cores.white);
      log(`   Voo: ${reserva.voo || 'N/A'}`, cores.white);
      log(`   Data: ${reserva.dataVoo || 'N/A'}`, cores.white);
      log(`   Rota: ${reserva.origem || 'N/A'} → ${reserva.destino || 'N/A'}`, cores.white);

      if (reserva.horarioDecolagem || reserva.horarioPouso) {
        log(`\n⏰ Horários:`, cores.cyan);
        log(`   Decolagem: ${reserva.horarioDecolagem || 'N/A'}`, cores.white);
        log(`   Pouso: ${reserva.horarioPouso || 'N/A'}`, cores.white);
      }

      if (reserva.portao || reserva.terminal) {
        log(`\n🚪 Embarque:`, cores.cyan);
        if (reserva.portao) log(`   Portão: ${reserva.portao}`, cores.white);
        if (reserva.terminal) log(`   Terminal: ${reserva.terminal}`, cores.white);
      }

      if (reserva.passageiros && reserva.passageiros.length > 0) {
        log(`\n👥 Passageiros (${reserva.passageiros.length}):`, cores.cyan);
        reserva.passageiros.forEach((p, idx) => {
          log(`   ${idx + 1}. ${p.nome}`, cores.white);
          if (p.assento) log(`      Assento: ${p.assento}`, cores.dim);
          if (p.status) log(`      Status: ${p.status}`, cores.dim);
        });
      }

      log(`\n🕐 Última atualização: ${new Date(result.dados.ultimaAtualizacao).toLocaleString('pt-BR')}`, cores.dim);

      // Verificar mudanças
      await consultarMudancas(codigoReserva);

    } else {
      log('\n⏳ Ainda processando... Dados ainda não disponíveis.', cores.yellow);
      log('   A primeira verificação pode levar até 30 segundos.', cores.dim);
    }
  } catch (error) {
    log(`\n❌ Erro ao consultar status: ${error.message}`, cores.red);
  }
}

async function consultarMudancas(codigoReserva) {
  try {
    // Buscar o ID do monitor primeiro
    const statusResponse = await fetch(`${API_URL}/api/reservas/${codigoReserva}/status`);
    const statusData = await statusResponse.json();

    if (!statusData.dados || !statusData.dados.monitorId) {
      return;
    }

    const response = await fetch(`${API_URL}/api/reservas/changes/${statusData.dados.monitorId}`);
    const result = await response.json();

    if (result.sucesso && result.dados && result.dados.length > 0) {
      log(`\n🔔 MUDANÇAS DETECTADAS (${result.dados.length}):`, cores.yellow + cores.bright);

      result.dados.forEach((mudanca, idx) => {
        const severidadeCor = {
          'CRITICAL': cores.red,
          'IMPORTANT': cores.yellow,
          'INFO': cores.blue
        }[mudanca.severidade] || cores.white;

        log(`\n   ${idx + 1}. ${mudanca.descricao}`, severidadeCor);
        log(`      Tipo: ${mudanca.changeType}`, cores.dim);
        log(`      Severidade: ${mudanca.severidade}`, cores.dim);
        log(`      Detectado em: ${new Date(mudanca.detectedAt).toLocaleString('pt-BR')}`, cores.dim);

        if (mudanca.oldValue && mudanca.newValue) {
          log(`      Antes: ${mudanca.oldValue}`, cores.dim);
          log(`      Depois: ${mudanca.newValue}`, cores.dim);
        }
      });
    } else {
      log('\n✅ Nenhuma mudança detectada até o momento.', cores.green);
    }
  } catch (error) {
    // Silencioso - mudanças são opcionais
  }
}

async function menuPrincipal() {
  log('\n' + '='.repeat(60), cores.cyan);
  log('  🎯 MONITORAMENTO DE VOOS POR NÚMERO DE RESERVA', cores.bright + cores.cyan);
  log('='.repeat(60), cores.cyan);

  // Verificar API
  const apiOk = await verificarAPI();
  if (!apiOk) {
    process.exit(1);
  }

  // Listar companhias
  const companhias = await listarCompanhias();
  if (companhias.length === 0) {
    log('\n❌ Não foi possível listar companhias', cores.red);
    process.exit(1);
  }

  // Coletar dados da reserva
  log('\n' + '─'.repeat(60), cores.dim);
  log('📝 DADOS DA SUA RESERVA:', cores.bright);
  log('─'.repeat(60), cores.dim);

  const companhiaNum = await question('\n1. Escolha a companhia (1-4): ');
  const companhiaIndex = parseInt(companhiaNum) - 1;

  if (companhiaIndex < 0 || companhiaIndex >= companhias.length) {
    log('\n❌ Companhia inválida!', cores.red);
    process.exit(1);
  }

  const companhiaAerea = companhias[companhiaIndex];
  const codigoReserva = await question('\n2. Digite o CÓDIGO DA RESERVA (localizador/PNR): ');
  const email = await question('\n3. Digite o EMAIL usado na reserva: ');
  const senha = await question('\n4. Digite a SENHA da reserva (ou sobrenome): ');

  if (!codigoReserva || !email || !senha) {
    log('\n❌ Todos os campos são obrigatórios!', cores.red);
    process.exit(1);
  }

  const dados = {
    codigoReserva: codigoReserva.trim().toUpperCase(),
    email: email.trim(),
    senha: senha.trim(),
    companhiaAerea
  };

  // Confirmar dados
  log('\n' + '─'.repeat(60), cores.dim);
  log('📋 CONFIRME OS DADOS:', cores.bright);
  log('─'.repeat(60), cores.dim);
  log(`   Companhia: ${dados.companhiaAerea}`, cores.white);
  log(`   Código: ${dados.codigoReserva}`, cores.white);
  log(`   Email: ${dados.email}`, cores.white);
  log(`   Senha: ${'*'.repeat(senha.length)}`, cores.white);

  const confirma = await question('\n5. Confirma? (S/n): ');

  if (confirma.toLowerCase() === 'n') {
    log('\n❌ Cancelado pelo usuário', cores.yellow);
    process.exit(0);
  }

  // Iniciar monitoramento
  const sucesso = await iniciarMonitoramento(dados);

  if (sucesso) {
    log('\n' + '─'.repeat(60), cores.green);
    log('🎉 MONITORAMENTO ATIVO!', cores.green + cores.bright);
    log('─'.repeat(60), cores.green);

    log('\n📌 O sistema irá:', cores.cyan);
    log('   ✓ Verificar sua reserva a cada 10 minutos', cores.white);
    log('   ✓ Detectar mudanças automaticamente', cores.white);
    log('   ✓ Notificar você em tempo real', cores.white);

    log('\n💡 Consultar status novamente:', cores.yellow);
    log(`   curl http://localhost:4000/api/reservas/${dados.codigoReserva}/status`, cores.dim);

    log('\n💡 Ver histórico de mudanças:', cores.yellow);
    log(`   curl http://localhost:4000/api/reservas/${dados.codigoReserva}/historico`, cores.dim);

    log('\n💡 Parar monitoramento:', cores.yellow);
    log(`   curl -X DELETE http://localhost:4000/api/reservas/${dados.codigoReserva}/monitorar`, cores.dim);
  }

  rl.close();
}

// Executar
if (require.main === module) {
  menuPrincipal().catch(error => {
    log(`\n❌ Erro fatal: ${error.message}`, cores.red);
    console.error(error);
    process.exit(1);
  });
}
