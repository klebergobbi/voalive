'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface MonitoringResult {
  success: boolean;
  message: string;
  data?: {
    totalBookings: number;
    checked: number;
    errors: number;
    results?: Array<{
      bookingCode: string;
      airline: string;
      status: string;
      error?: string;
    }>;
  };
  timestamp: string;
}

export function MonitoringButton() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [result, setResult] = useState<MonitoringResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleMonitoring = async () => {
    setIsMonitoring(true);
    setResult(null);
    setShowDetails(false);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const response = await fetch(`${apiUrl}/api/airline-monitoring/check-all-active`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        console.log('✅ Monitoramento concluído:', data);
      } else {
        console.error('❌ Erro no monitoramento:', data);
      }
    } catch (error: any) {
      console.error('❌ Erro ao executar monitoramento:', error);
      setResult({
        success: false,
        message: `Erro de conexão: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsMonitoring(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-2 border-transparent hover:border-green-400">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center shadow-md">
            <RefreshCw className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-blue-900">Monitoramento Automático</h3>
            <p className="text-sm text-gray-600">
              Verifica todas as reservas ativas
            </p>
          </div>
        </div>
      </div>

      {/* Botão de Acionamento */}
      <button
        onClick={handleMonitoring}
        disabled={isMonitoring}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 ${
          isMonitoring
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg'
        }`}
      >
        {isMonitoring ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Verificando reservas...
          </>
        ) : (
          <>
            <RefreshCw className="w-5 h-5" />
            Executar Monitoramento Agora
          </>
        )}
      </button>

      {/* Aviso durante monitoramento */}
      {isMonitoring && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>
              <strong>Aguarde:</strong> O processo pode levar alguns minutos dependendo do número de reservas.
            </span>
          </p>
        </div>
      )}

      {/* Resultado */}
      {result && !isMonitoring && (
        <div className={`mt-4 p-4 rounded-lg border-2 ${
          result.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <h4 className={`font-semibold mb-1 ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.success ? 'Monitoramento Concluído!' : 'Erro no Monitoramento'}
              </h4>

              <p className={`text-sm mb-2 ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message}
              </p>

              {result.data && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-white/50 p-2 rounded">
                      <div className="text-gray-600 text-xs">Total</div>
                      <div className="font-bold text-lg text-blue-900">
                        {result.data.totalBookings}
                      </div>
                    </div>
                    <div className="bg-white/50 p-2 rounded">
                      <div className="text-gray-600 text-xs">Verificadas</div>
                      <div className="font-bold text-lg text-green-600">
                        {result.data.checked}
                      </div>
                    </div>
                    <div className="bg-white/50 p-2 rounded">
                      <div className="text-gray-600 text-xs">Erros</div>
                      <div className="font-bold text-lg text-red-600">
                        {result.data.errors}
                      </div>
                    </div>
                  </div>

                  {result.data.results && result.data.results.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        {showDetails ? '▼' : '▶'} Ver detalhes das verificações
                      </button>

                      {showDetails && (
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                          {result.data.results.map((item, index) => (
                            <div
                              key={index}
                              className={`p-2 rounded text-xs ${
                                item.status === 'checked'
                                  ? 'bg-green-100 border border-green-200'
                                  : 'bg-red-100 border border-red-200'
                              }`}
                            >
                              <div className="font-semibold">
                                {item.bookingCode} ({item.airline})
                              </div>
                              {item.error && (
                                <div className="text-red-700 mt-1">{item.error}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-500 mt-2">
                {new Date(result.timestamp).toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
