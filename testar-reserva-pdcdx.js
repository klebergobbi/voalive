#!/usr/bin/env node

/**
 * 🧪 TESTE DA RESERVA PDCDX
 *
 * Este script testa o sistema de monitoramento com a reserva real PDCDX
 *
 * Dados da reserva:
 * - Localizador: PDCDX
 * - Sobrenome: Diniz
 * - Origem: SLZ (São Luís)
 * - Companhia: GOL
 */

const API_URL = process.env.API_URL || 'http://localhost:4000';

// Cores para terminal
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, cor = c.reset) {
  console.log(`${cor}${msg}${c.reset}`);
}

function hr(char = '─', length = 70) {
  log(char.repeat(length), c.cyan);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testarAPI() {
  log('\n🔍 1. Verificando conexão com API...', c.blue);

  try {
    const response = await fetch(`${API_URL}/health`);

    if (!response.ok) {
      throw new Error('API não respondeu');
    }

    log('   ✅ API está online!', c.green);
    return true;
  } catch (error) {
    log('   ❌ API não está rodando!', c.red);
    log('\n💡 Inicie a API primeiro:', c.yellow);
    log('   cd C:/Projetos/VoaLive/apps/api', c.reset);
    log('   npm run dev\n', c.reset);
    return false;
  }
}

async function buscarReservaPorLocalizador() {
  log('\n🔍 2. Buscando reserva PDCDX usando web scraping...', c.blue);

  const dados = {
    localizador: 'PDCDX',
    sobrenome: 'Diniz',
    origem: 'SLZ'
  };

  log(`   📋 Localizador: ${dados.localizador}`, c.cyan);
  log(`   👤 Sobrenome: ${dados.sobrenome}`, c.cyan);
  log(`   ✈️  Origem: ${dados.origem}`, c.cyan);

  try {
    log('\n   ⏳ Fazendo scraping nos sites das companhias aéreas...', c.yellow);
    log('   (Isso pode levar 10-30 segundos)\n', c.yellow);

    const response = await fetch(`${API_URL}/api/airline-booking/search-booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dados)
    });

    const result = await response.json();

    if (result.success && result.data) {
      log('\n   ✅ RESERVA ENCONTRADA!', c.green + c.bright);

      hr();
      log('   📊 DADOS DA RESERVA', c.bright);
      hr();

      const booking = result.data;

      // Informações básicas
      if (booking.localizador) {
        log(`   🎫 Localizador: ${booking.localizador}`, c.white);
      }

      if (booking.numeroVoo) {
        log(`   ✈️  Voo: ${booking.numeroVoo}`, c.white);
      }

      if (booking.companhia) {
        log(`   🏢 Companhia: ${booking.companhia}`, c.white);
      }

      if (booking.status) {
        const statusCor = booking.status.includes('CONFIRM') ? c.green : c.yellow;
        log(`   📍 Status: ${booking.status}`, statusCor);
      }

      // Rota e horários
      if (booking.origem && booking.destino) {
        log(`\n   🛫 Rota:`, c.cyan);
        log(`      ${booking.origem} → ${booking.destino}`, c.white);
      }

      if (booking.dataVoo) {
        log(`\n   📅 Data: ${booking.dataVoo}`, c.white);
      }

      if (booking.horarioDecolagem || booking.horarioPouso) {
        log(`\n   ⏰ Horários:`, c.cyan);
        if (booking.horarioDecolagem) {
          log(`      Decolagem: ${booking.horarioDecolagem}`, c.white);
        }
        if (booking.horarioPouso) {
          log(`      Pouso: ${booking.horarioPouso}`, c.white);
        }
      }

      // Embarque
      if (booking.portao || booking.terminal) {
        log(`\n   🚪 Embarque:`, c.cyan);
        if (booking.portao) log(`      Portão: ${booking.portao}`, c.white);
        if (booking.terminal) log(`      Terminal: ${booking.terminal}`, c.white);
      }

      // Passageiros
      if (booking.passageiros && booking.passageiros.length > 0) {
        log(`\n   👥 Passageiros (${booking.passageiros.length}):`, c.cyan);
        booking.passageiros.forEach((p, idx) => {
          log(`      ${idx + 1}. ${p.nome}`, c.white);
          if (p.assento) log(`         Assento: ${p.assento}`, c.reset);
          if (p.status) log(`         Status: ${p.status}`, c.reset);
        });
      }

      // Informações extras
      if (booking.aeronave) {
        log(`\n   ✈️  Aeronave: ${booking.aeronave}`, c.white);
      }

      if (booking.duracaoVoo) {
        log(`   ⏱️  Duração: ${booking.duracaoVoo}`, c.white);
      }

      hr();

      return booking;

    } else {
      log('\n   ⚠️  Reserva não encontrada via scraping', c.yellow);

      if (result.message) {
        log(`\n   📝 Mensagem: ${result.message}`, c.yellow);
      }

      if (result.instructions && result.instructions.length > 0) {
        log('\n   💡 Instruções:', c.cyan);
        result.instructions.forEach(inst => {
          log(`      • ${inst}`, c.white);
        });
      }

      return null;
    }

  } catch (error) {
    log(`\n   ❌ Erro ao buscar reserva: ${error.message}`, c.red);
    console.error(error);
    return null;
  }
}

async function iniciarMonitoramento(booking) {
  log('\n🔍 3. Iniciando monitoramento automático...', c.blue);

  // Para iniciar o monitoramento, precisaríamos:
  // 1. Estar logado (ter um token JWT)
  // 2. Conectar conta da companhia aérea
  // 3. Adicionar a reserva para monitoramento

  log('\n   📝 Para monitorar esta reserva automaticamente:', c.cyan);
  log('   \n   Opção 1: Script interativo', c.yellow);
  log('   node monitorar-reserva.js\n', c.white);

  log('   Opção 2: Via API (necessita autenticação)', c.yellow);
  log(`   curl -X POST ${API_URL}/api/reservas/monitorar \\`, c.white);
  log('     -H "Content-Type: application/json" \\', c.white);
  log('     -H "Authorization: Bearer SEU_TOKEN" \\', c.white);
  log('     -d \'{', c.white);
  log(`       "codigoReserva": "${booking?.localizador || 'PDCDX'}",`, c.white);
  log('       "email": "seu@email.com",', c.white);
  log('       "senha": "sua-senha",', c.white);
  log('       "companhiaAerea": "GOL"', c.white);
  log('     }\'\n', c.white);

  log('   💡 O sistema irá:', c.cyan);
  log('      ✓ Verificar a reserva a cada 10 minutos', c.white);
  log('      ✓ Detectar mudanças automaticamente', c.white);
  log('      ✓ Notificar você em tempo real', c.white);
  log('      ✓ Manter histórico completo\n', c.white);
}

async function testarValidacaoLocalizador() {
  log('\n🔍 EXTRA: Validando formato do localizador...', c.blue);

  try {
    const response = await fetch(`${API_URL}/api/airline-booking/validate-localizador`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ localizador: 'PDCDX' })
    });

    const result = await response.json();

    if (result.success) {
      log(`   ✅ Formato válido: ${result.data.isValid}`, c.green);
      log(`   📏 Comprimento: ${result.data.length} caracteres`, c.white);
      log(`   🏢 Companhia sugerida: ${result.data.suggestedAirline}`, c.white);
    }

  } catch (error) {
    log(`   ⚠️  Erro na validação: ${error.message}`, c.yellow);
  }
}

async function main() {
  hr('=');
  log('  🧪 TESTE DA RESERVA PDCDX - VoaLive Monitoramento', c.bright + c.cyan);
  hr('=');

  log('\n📋 Informações da Reserva:', c.bright);
  log('   Localizador: PDCDX', c.white);
  log('   Sobrenome: Diniz', c.white);
  log('   Origem: SLZ (São Luís - MA)', c.white);
  log('   Companhia: GOL (detectado automaticamente)', c.white);

  hr();

  // 1. Testar conexão com API
  const apiOk = await testarAPI();
  if (!apiOk) {
    process.exit(1);
  }

  // 2. Buscar reserva por localizador (web scraping)
  const booking = await buscarReservaPorLocalizador();

  if (booking) {
    // 3. Mostrar como iniciar monitoramento
    await iniciarMonitoramento(booking);

    // 4. Validar localizador (extra)
    await testarValidacaoLocalizador();

    hr('=');
    log('\n  ✅ TESTE CONCLUÍDO COM SUCESSO!', c.green + c.bright);
    hr('=');

    log('\n📌 Próximos Passos:', c.cyan);
    log('   1. Use o script: node monitorar-reserva.js', c.white);
    log('   2. Ou integre via API REST com autenticação', c.white);
    log('   3. Configure notificações (email/push/SMS)', c.white);
    log('   4. Acompanhe mudanças em tempo real\n', c.white);

  } else {
    hr('=');
    log('\n  ⚠️  TESTE CONCLUÍDO - Reserva não encontrada', c.yellow + c.bright);
    hr('=');

    log('\n❓ Possíveis motivos:', c.cyan);
    log('   • Localizador incorreto', c.white);
    log('   • Sobrenome incorreto', c.white);
    log('   • Reserva já expirou ou foi cancelada', c.white);
    log('   • Site da companhia está com proteção extra', c.white);
    log('   • PNRs não são acessíveis via scraping público\n', c.white);

    log('💡 Alternativa:', c.cyan);
    log('   Use o NÚMERO DO VOO ao invés do localizador', c.white);
    log('   Exemplo: G31704, LA4567, AD2123\n', c.white);
  }

  log('📚 Documentação completa:', c.cyan);
  log('   COMO-USAR-MONITORAMENTO.md\n', c.white);
}

// Executar
if (require.main === module) {
  main().catch(error => {
    log(`\n❌ Erro fatal: ${error.message}`, c.red);
    console.error(error);
    process.exit(1);
  });
}
