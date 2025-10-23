'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Label } from '@reservasegura/ui';

interface BookingData {
  localizador: string;
  sobrenome: string;
  origem: string;
  destino: string;
  dataPartida: string;
  dataChegada: string;
  horarioPartida: string;
  horarioChegada: string;
  numeroVoo: string;
  companhia: 'GOL' | 'LATAM' | 'AZUL';
  status: string;
  portaoEmbarque?: string;
  terminal?: string;
  assento?: string;
  classe: string;
  passageiro: string;
}

interface BookingSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingFound: (booking: BookingData) => void;
}

export function BookingSearchModal({ open, onOpenChange, onBookingFound }: BookingSearchModalProps) {
  const [searchData, setSearchData] = useState({
    localizador: '',
    sobrenome: '',
    origem: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationInfo, setValidationInfo] = useState<any>(null);

  const validateLocalizador = async (localizador: string) => {
    if (localizador.length >= 5) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/api/v1/airline-booking/validate-localizador`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ localizador }),
        });

        const result = await response.json();
        if (result.success) {
          setValidationInfo(result.data);
        }
      } catch (error) {
        console.error('Erro ao validar localizador:', error);
      }
    }
  };

  const handleLocalizadorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSearchData(prev => ({ ...prev, localizador: value }));
    setError('');
    validateLocalizador(value);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Buscando reserva:', searchData);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/v1/airline-booking/search-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchData),
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log('✅ Reserva encontrada:', result.data);
        onBookingFound(result.data);
        onOpenChange(false);
        // Reset form
        setSearchData({ localizador: '', sobrenome: '', origem: '' });
        setValidationInfo(null);
      } else {
        setError(result.error || 'Reserva não encontrada');
      }
    } catch (error) {
      console.error('❌ Erro na busca:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = searchData.localizador.length >= 5 &&
                     searchData.sobrenome.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">✈️</span>
            Buscar Vôo
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Digite o localizador, sobrenome e opcionalmente a origem para buscar seu vôo nas companhias aéreas.
          </p>
        </DialogHeader>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="localizador">Localizador *</Label>
            <div className="space-y-1">
              <Input
                id="localizador"
                value={searchData.localizador}
                onChange={handleLocalizadorChange}
                placeholder="Ex: ABC123, LA1234, G31234"
                required
                minLength={5}
                maxLength={8}
                className={validationInfo?.isValid === false ? 'border-red-500' : validationInfo?.isValid ? 'border-green-500' : ''}
              />
              {validationInfo && (
                <div className="text-xs">
                  {validationInfo.isValid ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <span>✓</span>
                      Localizador válido - Sugerida: {validationInfo.suggestedAirline}
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <span>⚠</span>
                      Localizador deve ter 5-8 caracteres alfanuméricos
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sobrenome">Sobrenome do Passageiro *</Label>
            <Input
              id="sobrenome"
              value={searchData.sobrenome}
              onChange={(e) => setSearchData(prev => ({ ...prev, sobrenome: e.target.value.toUpperCase() }))}
              placeholder="Ex: SILVA"
              required
              minLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="origem">Aeroporto de Origem (opcional)</Label>
            <Input
              id="origem"
              value={searchData.origem}
              onChange={(e) => setSearchData(prev => ({ ...prev, origem: e.target.value.toUpperCase() }))}
              placeholder="Ex: GRU, CGH, SDU"
              maxLength={3}
            />
            <div className="text-xs text-gray-500">
              Se não souber, deixe em branco - será detectado automaticamente
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <span>❌</span>
                {error}
              </p>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-gray-500">
              Suporta: GOL, LATAM, Azul
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || loading}
                className="min-w-24"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Buscando...
                  </div>
                ) : (
                  'Buscar'
                )}
              </Button>
            </div>
          </div>
        </form>

        <div className="pt-2 border-t text-xs text-gray-400">
          <p>💡 <strong>Dica:</strong> O localizador é o código de 5-8 caracteres fornecido pela companhia aérea no momento da compra.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}