'use client';

import { Dialog, DialogContent } from '@reservasegura/ui';
import { Plane, User, Luggage, Package, ShoppingBag } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PassengerInfo {
  firstName: string;
  lastName: string;
}

interface BaggageInfo {
  personalItem: { included: boolean; quantity: number; description: string };
  carryOn: { included: boolean; quantity: number; weight: string; description: string };
  checked: { included: boolean; quantity: number; weight: string; description: string };
}

interface FlightLeg {
  flightNumber: string;
  date: string;
  departureTime: string;
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  arrivalTime: string;
  arrivalDate?: string;
  duration: string;
}

interface BookingDetails {
  locator: string;
  airline: string;
  airlineLogo?: string;
  passengers: PassengerInfo[];
  baggage: BaggageInfo;
  outboundFlights: FlightLeg[];
  outboundDate: string;
  returnFlights?: FlightLeg[];
  returnDate?: string;
}

interface BookingDetailsViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingDetails | null;
}

export function BookingDetailsView({ open, onOpenChange, booking }: BookingDetailsViewProps) {
  if (!booking) return null;

  const getAirlineColor = (airline: string) => {
    const colors: { [key: string]: string } = {
      'AZUL': '#002F87',
      'GOL': '#FF6C00',
      'LATAM': '#E50856',
      'DEFAULT': '#1E40AF'
    };
    return colors[airline.toUpperCase()] || colors.DEFAULT;
  };

  const airlineColor = getAirlineColor(booking.airline);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header com Localizador */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-t-lg -mt-6 -mx-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-90">Código de Reserva</p>
              <h2 className="text-3xl font-bold tracking-wider">{booking.locator}</h2>
            </div>
            <div className="flex gap-4 items-center">
              {/* Logo da Companhia */}
              <div
                className="bg-white p-3 rounded-lg flex items-center justify-center"
                style={{ minWidth: '100px', minHeight: '60px' }}
              >
                <span className="text-2xl font-bold" style={{ color: airlineColor }}>
                  {booking.airline}
                </span>
              </div>
              {/* QR Code */}
              <div className="bg-white p-2 rounded-lg">
                <QRCodeSVG value={booking.locator} size={80} />
                <p className="text-xs text-center text-gray-600 mt-1">Clique ou Leia o QR CODE</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações da Passagem */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Informações da sua passagem</h3>

            {/* Viajantes */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-700">VIAJANTES {booking.passengers.length}</span>
              </div>
              {booking.passengers.map((passenger, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {passenger.firstName} {passenger.lastName}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bagagens */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Item Pessoal */}
              <div className={`border-2 rounded-lg p-4 text-center ${
                booking.baggage.personalItem.included
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-semibold ${
                    booking.baggage.personalItem.included ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {booking.baggage.personalItem.included ? 'Incluído' : 'Não Incluído'}
                  </span>
                  <div className="flex gap-2">
                    <button className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center text-gray-600 hover:bg-gray-200">
                      −
                    </button>
                    <button className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center text-gray-600 hover:bg-gray-200">
                      +
                    </button>
                  </div>
                </div>
                <ShoppingBag className={`h-12 w-12 mx-auto mb-2 ${
                  booking.baggage.personalItem.included ? 'text-green-600' : 'text-gray-400'
                }`} />
                <div className="font-bold text-lg mb-1">
                  ITEM PESSOAL {booking.baggage.personalItem.quantity}
                </div>
                <p className="text-xs text-gray-600">{booking.baggage.personalItem.description}</p>
              </div>

              {/* Bagagem de Mão */}
              <div className={`border-2 rounded-lg p-4 text-center ${
                booking.baggage.carryOn.included
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-semibold ${
                    booking.baggage.carryOn.included ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {booking.baggage.carryOn.included ? 'Incluído' : 'Não Incluído'}
                  </span>
                  <div className="flex gap-2">
                    <button className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center text-gray-600 hover:bg-gray-200">
                      −
                    </button>
                    <button className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center text-gray-600 hover:bg-gray-200">
                      +
                    </button>
                  </div>
                </div>
                <Package className={`h-12 w-12 mx-auto mb-2 ${
                  booking.baggage.carryOn.included ? 'text-green-600' : 'text-gray-400'
                }`} />
                <div className="font-bold text-lg mb-1">
                  BAGAGEM DE MÃO {booking.baggage.carryOn.quantity}
                </div>
                <p className="text-xs text-gray-600">{booking.baggage.carryOn.description}</p>
              </div>

              {/* Bagagem Despachada */}
              <div className={`border-2 rounded-lg p-4 text-center ${
                booking.baggage.checked.included
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-semibold ${
                    booking.baggage.checked.included ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {booking.baggage.checked.included ? 'Incluído' : 'Não Incluído'}
                  </span>
                  <div className="flex gap-2">
                    <button className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center text-gray-600 hover:bg-gray-200">
                      −
                    </button>
                    <button className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center text-gray-600 hover:bg-gray-200">
                      +
                    </button>
                  </div>
                </div>
                <Luggage className={`h-12 w-12 mx-auto mb-2 ${
                  booking.baggage.checked.included ? 'text-green-600' : 'text-gray-400'
                }`} />
                <div className="font-bold text-lg mb-1">
                  BAGAGEM DESPACHADA {booking.baggage.checked.quantity}
                </div>
                <p className="text-xs text-gray-600">{booking.baggage.checked.description}</p>
              </div>
            </div>

            {/* Voos de Ida */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Plane className="h-5 w-5 text-blue-600" />
                <span className="font-bold text-lg">VOOS DE IDA</span>
                <span className="text-sm text-gray-600">Início: {booking.outboundDate}</span>
              </div>

              <div className="space-y-3">
                {booking.outboundFlights.map((flight, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between">
                      {/* Número do Voo e Data */}
                      <div className="flex-shrink-0 w-32">
                        <div className="font-bold text-gray-700">{flight.flightNumber}</div>
                        <div className="text-sm text-gray-600">{flight.date}</div>
                      </div>

                      {/* Horário de Partida */}
                      <div className="flex-shrink-0 w-20">
                        <div className="text-xl font-bold text-white bg-blue-600 rounded px-2 py-1 text-center">
                          {flight.departureTime}
                        </div>
                      </div>

                      {/* Origem */}
                      <div className="flex-shrink-0 w-32 text-center">
                        <div className="text-sm text-gray-600">{flight.originName}</div>
                        <div className="text-2xl font-bold text-gray-900">{flight.origin}</div>
                      </div>

                      {/* Ícone de Avião e Duração */}
                      <div className="flex-shrink-0 flex flex-col items-center">
                        <Plane className="h-6 w-6 text-gray-400" />
                        <div className="text-xs text-gray-500 mt-1">{flight.duration}</div>
                      </div>

                      {/* Destino */}
                      <div className="flex-shrink-0 w-32 text-center">
                        <div className="text-sm text-gray-600">{flight.destinationName}</div>
                        <div className="text-2xl font-bold text-gray-900">{flight.destination}</div>
                      </div>

                      {/* Horário de Chegada */}
                      <div className="flex-shrink-0 w-20">
                        <div className="text-xl font-bold text-white bg-blue-900 rounded px-2 py-1 text-center">
                          {flight.arrivalTime}
                        </div>
                      </div>

                      {/* Data de Chegada */}
                      <div className="flex-shrink-0 w-32">
                        <div className="text-sm text-gray-600">{flight.arrivalDate || flight.date}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Voos de Volta */}
            {booking.returnFlights && booking.returnFlights.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Plane className="h-5 w-5 text-cyan-600 transform rotate-180" />
                  <span className="font-bold text-lg">VOOS DE VOLTA</span>
                  <span className="text-sm text-gray-600">Início: {booking.returnDate}</span>
                </div>

                <div className="space-y-3">
                  {booking.returnFlights.map((flight, index) => (
                    <div key={index} className="border border-gray-300 rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between">
                        {/* Número do Voo e Data */}
                        <div className="flex-shrink-0 w-32">
                          <div className="font-bold text-gray-700">{flight.flightNumber}</div>
                          <div className="text-sm text-gray-600">{flight.date}</div>
                        </div>

                        {/* Horário de Partida */}
                        <div className="flex-shrink-0 w-20">
                          <div className="text-xl font-bold text-white bg-cyan-500 rounded px-2 py-1 text-center">
                            {flight.departureTime}
                          </div>
                        </div>

                        {/* Origem */}
                        <div className="flex-shrink-0 w-32 text-center">
                          <div className="text-sm text-gray-600">{flight.originName}</div>
                          <div className="text-2xl font-bold text-gray-900">{flight.origin}</div>
                        </div>

                        {/* Ícone de Avião e Duração */}
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <Plane className="h-6 w-6 text-gray-400" />
                          <div className="text-xs text-gray-500 mt-1">{flight.duration}</div>
                        </div>

                        {/* Destino */}
                        <div className="flex-shrink-0 w-32 text-center">
                          <div className="text-sm text-gray-600">{flight.destinationName}</div>
                          <div className="text-2xl font-bold text-gray-900">{flight.destination}</div>
                        </div>

                        {/* Horário de Chegada */}
                        <div className="flex-shrink-0 w-20">
                          <div className="text-xl font-bold text-white bg-cyan-700 rounded px-2 py-1 text-center">
                            {flight.arrivalTime}
                          </div>
                        </div>

                        {/* Data de Chegada */}
                        <div className="flex-shrink-0 w-32">
                          <div className="text-sm text-gray-600">{flight.arrivalDate || flight.date}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
