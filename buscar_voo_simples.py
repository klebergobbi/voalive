#!/usr/bin/env python3
"""
Script Simples - Buscar Voo

Como usar:
python buscar_voo_simples.py G32067
python buscar_voo_simples.py LA3789
python buscar_voo_simples.py AD4506
"""

import requests
import sys
import json
from datetime import datetime

def buscar_voo(numero_voo):
    print('━' * 45)
    print('✈️  BUSCAR VOO')
    print('━' * 45)
    print(f'\n🔍 Buscando voo: {numero_voo}...')
    print('⏳ Aguarde até 30 segundos...\n')

    try:
        response = requests.post(
            'https://www.reservasegura.pro/api/v1/flight-search/search',
            json={'flightNumber': numero_voo},
            headers={'Content-Type': 'application/json'},
            timeout=30
        )

        result = response.json()

        if response.status_code == 200 and result.get('success'):
            voo = result['data']

            print('━' * 45)
            print('✅ VOO ENCONTRADO!')
            print('━' * 45)

            print('\n📦 Informações Básicas:')
            print(f'   Vôo: {voo["numeroVoo"]}')
            print(f'   Companhia: {voo["companhia"]}')
            print(f'   Rota: {voo["origem"]} → {voo["destino"]}')
            print(f'   Status: {voo["status"]}')
            print(f'   Data: {voo["dataPartida"]}')

            print('\n⏰ Horários:')
            print(f'   Partida Programada: {voo["horarioPartida"]}')
            print(f'   Chegada Programada: {voo["horarioChegada"]}')

            if voo.get('horarioPartidaReal'):
                print(f'   Partida Real: {voo["horarioPartidaReal"]}')

            if voo.get('horarioChegadaReal'):
                print(f'   Chegada Real: {voo["horarioChegadaReal"]}')

            if voo.get('horarioPartidaEstimado'):
                print(f'   Partida Estimada: {voo["horarioPartidaEstimado"]}')

            if voo.get('horarioChegadaEstimado'):
                print(f'   Chegada Estimada: {voo["horarioChegadaEstimado"]}')

            if voo.get('portao') or voo.get('terminal'):
                print('\n🚪 Terminal e Portão:')
                if voo.get('terminal'):
                    print(f'   Terminal Partida: {voo["terminal"]}')
                if voo.get('portao'):
                    print(f'   Portão Partida: {voo["portao"]}')
                if voo.get('terminalChegada'):
                    print(f'   Terminal Chegada: {voo["terminalChegada"]}')
                if voo.get('portaoChegada'):
                    print(f'   Portão Chegada: {voo["portaoChegada"]}')

            if voo.get('posicao'):
                pos = voo['posicao']
                print('\n📍 Posição em Tempo Real:')
                print(f'   Latitude: {pos["latitude"]:.4f}°')
                print(f'   Longitude: {pos["longitude"]:.4f}°')
                if pos.get('altitude'):
                    print(f'   Altitude: {pos["altitude"]:,} ft')
                if pos.get('velocidade'):
                    print(f'   Velocidade: {pos["velocidade"]} km/h')
                if pos.get('direcao'):
                    print(f'   Direção: {pos["direcao"]}°')

            if voo.get('atrasado', 0) > 0:
                print('\n⚠️  Atraso:')
                print(f'   Tempo de Atraso: {voo["atrasado"]} minutos')

            if voo.get('aeronave') or voo.get('registro'):
                print('\n✈️  Aeronave:')
                if voo.get('aeronave'):
                    print(f'   Tipo: {voo["aeronave"]}')
                if voo.get('registro'):
                    print(f'   Registro: {voo["registro"]}')

            print(f'\n📡 Fonte: {result.get("source", "API")}')

            timestamp = datetime.fromisoformat(result['timestamp'].replace('Z', '+00:00'))
            print(f'🕐 Atualizado: {timestamp.strftime("%d/%m/%Y %H:%M:%S")}')

        else:
            print('━' * 45)
            print('❌ VOO NÃO ENCONTRADO')
            print('━' * 45)

            print(f'\n📝 Mensagem: {result.get("message", "N/A")}\n')

            if result.get('suggestions'):
                print('💡 Sugestões:')
                for i, sugestao in enumerate(result['suggestions'], 1):
                    print(f'   {i}. {sugestao}')

        print('\n' + '━' * 45)

    except requests.exceptions.Timeout:
        print('\n❌ Timeout: A busca demorou mais de 30 segundos')
        print('\n💡 Tente novamente em alguns minutos')
        print('━' * 45)

    except requests.exceptions.RequestException as e:
        print(f'\n❌ Erro ao buscar voo: {str(e)}')
        print('\n💡 Dicas:')
        print('   1. Verifique sua conexão com a internet')
        print('   2. Certifique-se que o número do voo está correto')
        print('   3. Tente novamente em alguns minutos')
        print('\n' + '━' * 45)

    except Exception as e:
        print(f'\n❌ Erro inesperado: {str(e)}')
        print('━' * 45)


if __name__ == '__main__':
    if len(sys.argv) > 1:
        numero_voo = sys.argv[1].upper()
    else:
        numero_voo = 'G31890'  # Voo padrão

    buscar_voo(numero_voo)
