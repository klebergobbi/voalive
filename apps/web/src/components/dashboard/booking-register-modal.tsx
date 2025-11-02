'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Label } from '@reservasegura/ui';

interface BookingRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingRegistered?: () => void;
}

export function BookingRegisterModal({ open, onOpenChange, onBookingRegistered }: BookingRegisterModalProps) {
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
    setError('');
    setSuccess('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            Cadastrar Reserva Manualmente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Localizador */}
            <div className="space-y-2">
              <Label htmlFor="bookingCode">
                Localizador <span className="text-red-600">*</span>
              </Label>
              <Input
                id="bookingCode"
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC123"
                maxLength={8}
                required
                className="font-mono"
              />
            </div>

            {/* Sobrenome */}
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Sobrenome <span className="text-red-600">*</span>
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value.toUpperCase())}
                placeholder="Ex: SILVA"
                required
              />
            </div>

            {/* Primeiro Nome */}
            <div className="space-y-2">
              <Label htmlFor="firstName">Primeiro Nome</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                placeholder="Ex: JOÃO"
              />
            </div>

            {/* Companhia Aérea */}
            <div className="space-y-2">
              <Label htmlFor="airline">
                Companhia Aérea <span className="text-red-600">*</span>
              </Label>
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
              <Label htmlFor="flightNumber">
                Número do Voo <span className="text-red-600">*</span>
              </Label>
              <Input
                id="flightNumber"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                placeholder="Ex: G31234"
                required
                className="font-mono"
              />
            </div>

            {/* Origem */}
            <div className="space-y-2">
              <Label htmlFor="origin">
                Origem (IATA) <span className="text-red-600">*</span>
              </Label>
              <Input
                id="origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                placeholder="Ex: GRU, CGH, SDU"
                maxLength={3}
                required
                className="font-mono"
              />
            </div>

            {/* Destino */}
            <div className="space-y-2">
              <Label htmlFor="destination">
                Destino (IATA) <span className="text-red-600">*</span>
              </Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                placeholder="Ex: SLZ, FOR, SSA"
                maxLength={3}
                required
                className="font-mono"
              />
            </div>

            {/* Data de Partida */}
            <div className="space-y-2">
              <Label htmlFor="departureDate">
                Data de Partida <span className="text-red-600">*</span>
              </Label>
              <Input
                id="departureDate"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                required
              />
            </div>

            {/* Horário de Partida */}
            <div className="space-y-2">
              <Label htmlFor="departureTime">
                Horário de Partida <span className="text-red-600">*</span>
              </Label>
              <Input
                id="departureTime"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
              />
            </div>

            {/* Data de Chegada */}
            <div className="space-y-2">
              <Label htmlFor="arrivalDate">Data de Chegada</Label>
              <Input
                id="arrivalDate"
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
              />
            </div>

            {/* Horário de Chegada */}
            <div className="space-y-2">
              <Label htmlFor="arrivalTime">Horário de Chegada</Label>
              <Input
                id="arrivalTime"
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
            </div>

            {/* Assento */}
            <div className="space-y-2">
              <Label htmlFor="seat">Assento</Label>
              <Input
                id="seat"
                value={seat}
                onChange={(e) => setSeat(e.target.value.toUpperCase())}
                placeholder="Ex: 15A"
                maxLength={4}
              />
            </div>

            {/* Classe */}
            <div className="space-y-2">
              <Label htmlFor="flightClass">Classe</Label>
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="passageiro@example.com"
              />
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 11 98888-7777"
              />
            </div>

            {/* Documento */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="document">CPF/Passaporte</Label>
              <Input
                id="document"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                placeholder="123.456.789-00"
              />
            </div>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="min-w-32">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Cadastrando...
                </div>
              ) : (
                '📝 Cadastrar Reserva'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
