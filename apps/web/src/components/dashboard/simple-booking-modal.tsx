'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface SimpleBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SimpleBookingModal({ isOpen, onClose }: SimpleBookingModalProps) {
  const [bookingCode, setBookingCode] = useState('');
  const [lastName, setLastName] = useState('');
  const [airline, setAirline] = useState('GOL');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const apiUrl = window.location.origin;
      const response = await fetch(`${apiUrl}/api/v2/external-booking/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingCode: bookingCode.toUpperCase(),
          lastName: lastName.toUpperCase(),
          airline
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Reserva encontrada e cadastrada com sucesso!');
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      } else {
        setMessage('❌ ' + (result.error || 'Reserva não encontrada'));
      }
    } catch (error) {
      setMessage('❌ Erro ao buscar reserva');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Cadastrar Reserva</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Localizador *
            </label>
            <input
              type="text"
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ex: PDCDX"
              required
              maxLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Sobrenome *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ex: DINIZ"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Companhia Aérea *
            </label>
            <select
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="GOL">GOL</option>
              <option value="LATAM">LATAM</option>
              <option value="AZUL">AZUL</option>
            </select>
          </div>

          {message && (
            <div className={`p-3 rounded-lg ${
              message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Buscando...' : 'Buscar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
