'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface BookingRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingRegistered?: () => void;
}

export function BookingRegisterModal({ open, onOpenChange, onBookingRegistered }: BookingRegisterModalProps) {
  if (!open) return null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Campos obrigatórios
  const [bookingCode, setBookingCode] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');

  // Campos opcionais
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [seat, setSeat] = useState('');
  const [flightClass, setFlightClass] = useState('Econômica');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [enableMonitoring, setEnableMonitoring] = useState(true); // Monitoramento ativo por padrão

  // Auto-save: quando todos os campos obrigatórios estiverem preenchidos
  useEffect(() => {
    // Verificar se todos os campos obrigatórios estão preenchidos
    if (bookingCode && lastName && airline && flightNumber && origin && destination && departureDate && departureTime) {
      // Auto-save após 2 segundos de inatividade
      const timer = setTimeout(() => {
        console.log('✍️ Auto-salvando rascunho da reserva...');
        // Aqui você pode adicionar lógica para salvar um rascunho se desejar
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [bookingCode, lastName, airline, flightNumber, origin, destination, departureDate, departureTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validações
      if (!bookingCode || !lastName || !airline || !flightNumber || !origin || !destination || !departureDate || !departureTime) {
        setError('Preencha todos os campos obrigatórios');
        setLoading(false);
        return;
      }

      // Montar data/hora de partida
      const departureDateTimeStr = `${departureDate}T${departureTime}:00.000Z`;

      // Montar data/hora de chegada (se informada)
      let arrivalDateTimeStr = undefined;
      if (arrivalDate && arrivalTime) {
        arrivalDateTimeStr = `${arrivalDate}T${arrivalTime}:00.000Z`;
      }

      const fullName = firstName ? `${firstName} ${lastName}` : lastName;

      const payload = {
        bookingCode: bookingCode.toUpperCase().trim(),
        lastName: lastName.toUpperCase().trim(),
        firstName: firstName ? firstName.toUpperCase().trim() : undefined,
        fullName: fullName.trim(),
        airline: airline.toUpperCase().trim(),
        flightNumber: flightNumber.toUpperCase().trim(),
        origin: origin.toUpperCase().trim(),
        destination: destination.toUpperCase().trim(),
        departureDate: departureDateTimeStr,
        arrivalDate: arrivalDateTimeStr,
        seat: seat.trim() || undefined,
        class: flightClass,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        document: document.trim() || undefined,
        source: 'MANUAL',
        purchaseDate: new Date().toISOString(),
        autoUpdate: enableMonitoring, // Ativar monitoramento se marcado
      };

      console.log('📝 Cadastrando reserva:', payload);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/v2/external-booking/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Reserva cadastrada:', result.data);
        setSuccess(`Reserva ${bookingCode} cadastrada com sucesso! Você pode buscá-la usando o localizador e sobrenome.`);

        // Limpar campos após 2 segundos
        setTimeout(() => {
          resetForm();
          onOpenChange(false);
          if (onBookingRegistered) onBookingRegistered();
        }, 2000);
      } else {
        setError(result.message || result.error || 'Erro ao cadastrar reserva');
      }
    } catch (error) {
      console.error('❌ Erro ao cadastrar reserva:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBookingCode('');
    setLastName('');
    setFirstName('');
    setAirline('');
    setFlightNumber('');
    setOrigin('');
    setDestination('');
    setDepartureDate('');
    setDepartureTime('');
    setArrivalDate('');
    setArrivalTime('');
    setSeat('');
    setFlightClass('Econômica');
    setEmail('');
    setPhone('');
    setDocument('');
    setEnableMonitoring(true);
    setError('');
    setSuccess('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <h3 className="text-xl font-bold">Cadastrar Reserva Manualmente</h3>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700 p-1"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            {/* Localizador */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="bookingCode">
                Localizador <span className="text-red-600">*</span>
              </label>
              <input
                id="bookingCode"
                type="text"
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC123"
                maxLength={8}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>

            {/* Sobrenome */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="lastName">
                Sobrenome <span className="text-red-600">*</span>
              </label>
              <input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value.toUpperCase())}
                placeholder="Ex: SILVA"
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Primeiro Nome */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="firstName">Primeiro Nome</label>
              <input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                placeholder="Ex: JOÃO"
              />
            </div>

            {/* Companhia Aérea */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="airline">
                Companhia Aérea <span className="text-red-600">*</span>
              </label>
              <select
                id="airline"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Selecione...</option>
                <option value="GOL">GOL</option>
                <option value="LATAM">LATAM</option>
                <option value="AZUL">AZUL</option>
              </select>
            </div>

            {/* Número do Voo */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="flightNumber">
                Número do Voo <span className="text-red-600">*</span>
              </label>
              <input
                id="flightNumber"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                placeholder="Ex: G31234"
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>

            {/* Origem */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="origin">
                Origem (IATA) <span className="text-red-600">*</span>
              </label>
              <input
                id="origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                placeholder="Ex: GRU, CGH, SDU"
                maxLength={3}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>

            {/* Destino */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="destination">
                Destino (IATA) <span className="text-red-600">*</span>
              </label>
              <input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                placeholder="Ex: SLZ, FOR, SSA"
                maxLength={3}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>

            {/* Data de Partida */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="departureDate">
                Data de Partida <span className="text-red-600">*</span>
              </label>
              <input
                id="departureDate"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Horário de Partida */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="departureTime">
                Horário de Partida <span className="text-red-600">*</span>
              </label>
              <input
                id="departureTime"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Data de Chegada */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="arrivalDate">Data de Chegada</label>
              <input
                id="arrivalDate"
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Horário de Chegada */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="arrivalTime">Horário de Chegada</label>
              <input
                id="arrivalTime"
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Assento */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="seat">Assento</label>
              <input
                id="seat"
                value={seat}
                onChange={(e) => setSeat(e.target.value.toUpperCase())}
                placeholder="Ex: 15A"
                maxLength={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Classe */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="flightClass">Classe</label>
              <select
                id="flightClass"
                value={flightClass}
                onChange={(e) => setFlightClass(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="Econômica">Econômica</option>
                <option value="Executiva">Executiva</option>
                <option value="Primeira Classe">Primeira Classe</option>
              </select>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="passageiro@example.com"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2" htmlFor="phone">Telefone</label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 11 98888-7777"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Documento */}
            <div className="space-y-2 col-span-2">
              <label className="block text-sm font-medium mb-2" htmlFor="document">CPF/Passaporte</label>
              <input
                id="document"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                placeholder="123.456.789-00"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Checkbox de Monitoramento */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableMonitoring}
                onChange={(e) => setEnableMonitoring(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-blue-900 flex items-center gap-2">
                  📊 Ativar Monitoramento Automático
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-normal">
                    Recomendado
                  </span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  O sistema irá monitorar esta reserva automaticamente e notificar sobre:
                  cancelamentos, mudanças de horário, portão, assento e status do voo.
                </p>
                <p className="text-xs text-blue-600 mt-2 italic">
                  ⏱️ Verificação automática a cada 15 minutos
                </p>
              </div>
            </label>
          </div>

          {/* Mensagens */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <span>❌</span>
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600 flex items-center gap-2">
                <span>✅</span>
                {success}
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-w-32 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Cadastrando...
                </div>
              ) : (
                '📝 Cadastrar Reserva'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
