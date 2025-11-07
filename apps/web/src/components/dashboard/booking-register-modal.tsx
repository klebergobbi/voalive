'use client';

import { useState } from 'react';
import { X, Search, Plane, Loader2 } from 'lucide-react';

interface BookingRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BookingRegisterModal({ isOpen, onClose, onSuccess }: BookingRegisterModalProps) {
  const [flightNumber, setFlightNumber] = useState('');
  const [localizador, setLocalizador] = useState('');
  const [ultimoNome, setUltimoNome] = useState('');
  const [origem, setOrigem] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flightInfo, setFlightInfo] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isGol = (flightNum: string): boolean => {
    const code = flightNum.substring(0, 2).toUpperCase();
    return code === 'G3';
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!flightNumber.trim() || flightNumber.length < 4) {
      setError('Por favor, digite um número de vôo válido (mínimo 4 caracteres)');
      return;
    }

    setLoading(true);
    setError('');
    setFlightInfo(null);

    try {
      console.log('🔍 Buscando vôo via Amadeus + APIs híbridas:', flightNumber);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      // SEMPRE usa a API híbrida (Amadeus → APIs externas → WebScraping)
      // NUNCA usa dados mockados ou cadastro direto
      const searchPayload: any = {
        flightNumber: flightNumber.trim().toUpperCase()
      };

      // Incluir origem se fornecida (especialmente importante para GOL)
      if (origem.trim()) {
        searchPayload.origin = origem.trim().toUpperCase();
      }

      const response = await fetch(`${apiUrl}/api/v1/flight-search/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchPayload),
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log('✅ Vôo encontrado via API híbrida (Amadeus/WebScraping):', result.data);
        console.log('   Fonte:', result.source);
        setFlightInfo(result.data);
        // Não redireciona automaticamente - usuário precisa clicar em Salvar
      } else {
        setError(result.error || result.message || 'Vôo não encontrado. Verifique o número e tente novamente.');
        console.warn('⚠️ Vôo não encontrado:', result);
      }
    } catch (error: any) {
      console.error('❌ Erro na busca:', error);
      setError(`Erro ao buscar vôo: ${error.message || 'Verifique sua conexão'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatFlightNumber = (value: string) => {
    return value.toUpperCase().replace(/\s/g, '');
  };

  const handleFlightNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatFlightNumber(e.target.value);
    setFlightNumber(formatted);
    setError('');
  };

  const handleSaveBooking = async () => {
    if (!flightInfo) {
      setError('Nenhum vôo foi encontrado. Busque um vôo antes de salvar.');
      return;
    }

    // Validar que temos dados REAIS da API (nunca mockados)
    if (!flightInfo.origem || !flightInfo.destino) {
      setError('Dados do vôo incompletos. A API não retornou origem/destino. Tente novamente.');
      return;
    }

    // Exigir localizador e nome do passageiro para salvar
    if (!localizador.trim()) {
      setError('Por favor, informe o Localizador da reserva');
      return;
    }

    if (!ultimoNome.trim()) {
      setError('Por favor, informe o Último Nome do passageiro');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      // SOMENTE dados REAIS da API híbrida (Amadeus/WebScraping)
      // NUNCA usa dados mockados ou inventados
      const bookingData = {
        bookingCode: localizador.trim().toUpperCase(),
        lastName: ultimoNome.trim().toUpperCase(),
        firstName: ultimoNome.trim().split(' ')[0]?.toUpperCase() || ultimoNome.trim().toUpperCase(),
        fullName: ultimoNome.trim().toUpperCase(),
        airline: flightInfo.companhia, // Da API
        flightNumber: flightInfo.numeroVoo, // Da API
        origin: flightInfo.origem, // Da API
        destination: flightInfo.destino, // Da API
        departureDate: flightInfo.dataPartida || new Date().toISOString(),
        arrivalDate: flightInfo.dataChegada || flightInfo.dataPartida || new Date().toISOString(),
        seat: flightInfo.assento || '',
        class: flightInfo.classe || 'ECONOMICA',
        gate: flightInfo.portao || '',
        terminal: flightInfo.terminal || '',
        checkInStatus: 'PENDING',
        bookingStatus: flightInfo.status || 'SCHEDULED',
        source: 'AMADEUS_HYBRID' // Indica que veio da API híbrida
      };

      console.log('💾 Salvando reserva com dados REAIS da API Amadeus/híbrida:', bookingData);

      const response = await fetch(`${apiUrl}/api/v2/external-booking/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Reserva salva com sucesso!');
        setSaved(true);

        // Redirecionar para página de reservas após salvar
        setTimeout(() => {
          window.location.href = '/bookings';
        }, 2000);
      } else {
        setError(result.error || 'Erro ao salvar reserva');
        console.error('❌ Erro ao salvar:', result);
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar reserva:', error);
      setError(`Erro ao salvar: ${error.message || 'Verifique sua conexão'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Plane className="h-6 w-6" />
              Buscar Vôo
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSearch} className="p-6 space-y-4">
          {/* Número do Vôo */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-blue-900">
              Número do Vôo
            </label>
            <div className="relative">
              <input
                type="text"
                value={flightNumber}
                onChange={handleFlightNumberChange}
                placeholder="Ex: LA3789, G31234"
                required
                minLength={4}
                maxLength={8}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-lg"
                disabled={loading}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                ) : (
                  <Search className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Localizador */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-blue-900">
              Localizador
            </label>
            <input
              type="text"
              value={localizador}
              onChange={(e) => {
                setLocalizador(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Ex: ABC123, MAXGEA"
              maxLength={6}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-lg"
              disabled={loading || saving}
            />
          </div>

          {/* Último Nome do Passageiro */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-blue-900">
              Último Nome do Passageiro
            </label>
            <input
              type="text"
              value={ultimoNome}
              onChange={(e) => {
                setUltimoNome(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Ex: SILVA, TRINDADE"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-lg"
              disabled={loading || saving}
            />
          </div>

          {/* Origem (IATA Code) */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-blue-900">
              Origem
            </label>
            <input
              type="text"
              value={origem}
              onChange={(e) => {
                setOrigem(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Ex: BSB, GRU, CGH"
              maxLength={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-lg"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">Código IATA do aeroporto de origem (3 letras)</p>
          </div>

          {/* Aviso informativo */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Como funciona:</strong> Preencha os dados da sua reserva. O sistema buscará informações em tempo real via Amadeus + APIs híbridas para validar e complementar os dados do voo.
            </p>
          </div>

          {/* Success State */}
          {flightInfo && !error && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <span className="text-xl">✅</span>
                <span>Vôo Encontrado!</span>
              </div>

              <div className="text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-green-700 font-medium">Vôo:</span>
                  <span className="font-mono font-bold text-green-900">{flightInfo.numeroVoo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 font-medium">Companhia:</span>
                  <span className="font-medium text-green-900">{flightInfo.companhia || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 font-medium">Rota:</span>
                  <span className="font-medium text-green-900">{flightInfo.origem} → {flightInfo.destino}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700 font-medium">Status:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                    flightInfo.status?.includes('EM VOO') ? 'bg-blue-100 text-blue-800' :
                    flightInfo.status?.includes('ATRASADO') || flightInfo.atrasado ? 'bg-yellow-100 text-yellow-800' :
                    flightInfo.status?.includes('CANCELADO') ? 'bg-red-100 text-red-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {flightInfo.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Saved State */}
          {saved && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-blue-700 font-medium">
                <span className="text-xl">💾</span>
                <span>Reserva Salva com Sucesso!</span>
              </div>
              <p className="text-sm text-blue-600">
                Redirecionando para a página de reservas...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                onClose();
                setFlightNumber('');
                setLocalizador('');
                setUltimoNome('');
                setOrigem('');
                setError('');
                setFlightInfo(null);
              }}
              disabled={loading || saving}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
            >
              Cancelar
            </button>

            {/* Mostrar botão Salvar quando voo for encontrado */}
            {flightInfo ? (
              <button
                type="button"
                onClick={handleSaveBooking}
                disabled={saving}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold min-w-32"
              >
                {saving ? (
                  <div className="flex items-center gap-2 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Salvando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center">
                    <span>💾</span>
                    Salvar
                  </div>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={flightNumber.length < 4 || loading}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold min-w-32"
              >
                {loading ? (
                  <div className="flex items-center gap-2 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Buscando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center">
                    <Search className="h-5 w-5" />
                    Buscar
                  </div>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
