/**
 * Script Simples - Buscar Voo
 *
 * Como usar:
 * node buscar-voo-simples.js G32067
 * node buscar-voo-simples.js LA3789
 * node buscar-voo-simples.js AD4506
 */

const https = require('https');

const numeroVoo = process.argv[2] || 'G31890';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✈️  BUSCAR VOO');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`🔍 Buscando voo: ${numeroVoo}...`);
console.log(`⏳ Aguarde até 30 segundos...\n`);

const postData = JSON.stringify({
  flightNumber: numeroVoo
});

const options = {
  hostname: 'www.reservasegura.pro',
  port: 443,
  path: '/api/v1/flight-search/search',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 30000
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);

      if (result.success && result.data) {
        const voo = result.data;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ VOO ENCONTRADO!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('📦 Informações Básicas:');
        console.log(`   Vôo: ${voo.numeroVoo}`);
        console.log(`   Companhia: ${voo.companhia}`);
        console.log(`   Rota: ${voo.origem} → ${voo.destino}`);
        console.log(`   Status: ${voo.status}`);
        console.log(`   Data: ${voo.dataPartida}`);

        console.log('\n⏰ Horários:');
        console.log(`   Partida Programada: ${voo.horarioPartida}`);
        console.log(`   Chegada Programada: ${voo.horarioChegada}`);

        if (voo.horarioPartidaReal) {
          console.log(`   Partida Real: ${voo.horarioPartidaReal}`);
        }

        if (voo.horarioChegadaReal) {
          console.log(`   Chegada Real: ${voo.horarioChegadaReal}`);
        }

        if (voo.horarioPartidaEstimado) {
          console.log(`   Partida Estimada: ${voo.horarioPartidaEstimado}`);
        }

        if (voo.horarioChegadaEstimado) {
          console.log(`   Chegada Estimada: ${voo.horarioChegadaEstimado}`);
        }

        if (voo.portao || voo.terminal) {
          console.log('\n🚪 Terminal e Portão:');
          if (voo.terminal) console.log(`   Terminal Partida: ${voo.terminal}`);
          if (voo.portao) console.log(`   Portão Partida: ${voo.portao}`);
          if (voo.terminalChegada) console.log(`   Terminal Chegada: ${voo.terminalChegada}`);
          if (voo.portaoChegada) console.log(`   Portão Chegada: ${voo.portaoChegada}`);
        }

        if (voo.posicao) {
          console.log('\n📍 Posição em Tempo Real:');
          console.log(`   Latitude: ${voo.posicao.latitude.toFixed(4)}°`);
          console.log(`   Longitude: ${voo.posicao.longitude.toFixed(4)}°`);
          if (voo.posicao.altitude) {
            console.log(`   Altitude: ${voo.posicao.altitude.toLocaleString()} ft`);
          }
          if (voo.posicao.velocidade) {
            console.log(`   Velocidade: ${voo.posicao.velocidade} km/h`);
          }
          if (voo.posicao.direcao) {
            console.log(`   Direção: ${voo.posicao.direcao}°`);
          }
        }

        if (voo.atrasado > 0) {
          console.log('\n⚠️  Atraso:');
          console.log(`   Tempo de Atraso: ${voo.atrasado} minutos`);
        }

        if (voo.aeronave || voo.registro) {
          console.log('\n✈️  Aeronave:');
          if (voo.aeronave) console.log(`   Tipo: ${voo.aeronave}`);
          if (voo.registro) console.log(`   Registro: ${voo.registro}`);
        }

        console.log(`\n📡 Fonte: ${result.source}`);
        console.log(`🕐 Atualizado: ${new Date(result.timestamp).toLocaleString('pt-BR')}`);

      } else {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('❌ VOO NÃO ENCONTRADO');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log(`📝 Mensagem: ${result.message || 'N/A'}\n`);

        if (result.suggestions) {
          console.log('💡 Sugestões:');
          result.suggestions.forEach((s, i) => {
            console.log(`   ${i + 1}. ${s}`);
          });
        }
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
      console.error('\n❌ Erro ao processar resposta:', error.message);
      console.log('\nResposta recebida:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Erro ao buscar voo:', error.message);

  console.log('\n💡 Dicas:');
  console.log('   1. Verifique sua conexão com a internet');
  console.log('   2. Certifique-se que o número do voo está correto');
  console.log('   3. Tente novamente em alguns minutos');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

req.on('timeout', () => {
  req.destroy();
  console.error('\n❌ Timeout: A busca demorou mais de 30 segundos');
  console.log('\n💡 Tente novamente em alguns minutos');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

req.write(postData);
req.end();
