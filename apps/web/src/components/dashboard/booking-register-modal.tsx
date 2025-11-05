'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface BookingRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BookingRegisterModal({ isOpen, onClose, onSuccess }: BookingRegisterModalProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  // 📋 SEÇÃO 1: DADOS DO PASSAGEIRO (11 campos)
  const [fullName, setFullName] = useState('');
  const [passengerType, setPassengerType] = useState('ADULTO');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('Brasileira');
  const [documentType, setDocumentType] = useState('RG');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentValidity, setDocumentValidity] = useState('');
  const [documentCountry, setDocumentCountry] = useState('Brasil');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // ✈️ SEÇÃO 2: DADOS DO VOO (12 campos)
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDatetime, setDepartureDatetime] = useState('');
  const [returnDatetime, setReturnDatetime] = useState('');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [flightClass, setFlightClass] = useState('ECONÔMICA');
  const [preferredSeat, setPreferredSeat] = useState('');
  const [baggageCount, setBaggageCount] = useState('1');
  const [pnrCode, setPnrCode] = useState('');
  const [mileageProgram, setMileageProgram] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  // 💳 SEÇÃO 3: PAGAMENTO E FATURAMENTO (12 campos)
  const [paymentMethod, setPaymentMethod] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [taxesAmount, setTaxesAmount] = useState('');
  const [currency, setCurrency] = useState('BRL');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [issueStatus, setIssueStatus] = useState('PENDENTE');
  const [billingName, setBillingName] = useState('');
  const [billingDocument, setBillingDocument] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [ticketDelivery, setTicketDelivery] = useState('E-MAIL');

  // 📝 SEÇÃO 4: OBSERVAÇÕES INTERNAS (6 campos)
  const [agentCode, setAgentCode] = useState('');
  const [reservationDate, setReservationDate] = useState(new Date().toISOString().slice(0, 16));
  const [originChannel, setOriginChannel] = useState('SISTEMA');
  const [reservationStatus, setReservationStatus] = useState('CONFIRMADA');
  const [travelReason, setTravelReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const apiUrl = window.location.origin;
      const response = await fetch(`${apiUrl}/api/v2/external-booking/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Dados básicos (compatibilidade)
          bookingCode: pnrCode.toUpperCase(),
          lastName: fullName.split(' ').pop() || fullName,
          firstName: fullName.split(' ')[0],
          fullName: fullName,
          airline: airline,
          flightNumber: flightNumber.toUpperCase(),
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          departureDate: departureDatetime,
          arrivalDate: returnDatetime || null,
          seat: preferredSeat || null,
          class: flightClass,
          checkInStatus: 'PENDING',
          bookingStatus: reservationStatus,
          email: contactEmail || billingEmail || null,
          phone: contactPhone || billingPhone || null,
          document: documentNumber || null,
          purchaseDate: reservationDate,
          totalAmount: totalAmount ? parseFloat(totalAmount) : null,
          autoUpdate: true,
          source: 'MANUAL',

          // Dados estendidos do formulário completo
          extendedData: {
            passenger: {
              type: passengerType,
              birthDate,
              gender,
              nationality,
              documentType,
              documentValidity,
              documentCountry
            },
            flight: {
              returnDatetime,
              baggageCount: parseInt(baggageCount),
              mileageProgram,
              specialRequest
            },
            billing: {
              paymentMethod,
              taxesAmount: taxesAmount ? parseFloat(taxesAmount) : null,
              currency,
              refundPolicy,
              issueStatus,
              billingName,
              billingDocument,
              billingAddress,
              ticketDelivery
            },
            internal: {
              agentCode,
              originChannel,
              travelReason,
              additionalNotes
            }
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Reserva cadastrada com sucesso!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
          window.location.reload();
        }, 2000);
      } else {
        setMessage(`❌ ${result.error || 'Erro ao cadastrar reserva'}`);
      }
    } catch (error) {
      setMessage('❌ Erro ao cadastrar reserva');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 0, label: '👤 Passageiro', icon: '👤' },
    { id: 1, label: '✈️ Voo', icon: '✈️' },
    { id: 2, label: '💳 Pagamento', icon: '💳' },
    { id: 3, label: '📝 Observações', icon: '📝' }
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-4xl m-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">📋 Cadastrar Nova Reserva</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* SEÇÃO 1: DADOS DO PASSAGEIRO */}
          {activeTab === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: João Silva Santos"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tipo de Passageiro *
                  </label>
                  <select
                    value={passengerType}
                    onChange={(e) => setPassengerType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="ADULTO">Adulto</option>
                    <option value="CRIANCA">Criança</option>
                    <option value="BEBE">Bebê</option>
                    <option value="IDOSO">Idoso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Data de Nascimento *
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Sexo *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nacionalidade
                  </label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: Brasileira"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="RG">RG</option>
                    <option value="CPF">CPF</option>
                    <option value="PASSAPORTE">Passaporte</option>
                    <option value="CNH">CNH</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Número do Documento *
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: 123456789"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Validade do Documento
                  </label>
                  <input
                    type="date"
                    value={documentValidity}
                    onChange={(e) => setDocumentValidity(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    País Emissor
                  </label>
                  <input
                    type="text"
                    value={documentCountry}
                    onChange={(e) => setDocumentCountry(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: Brasil"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Telefone de Contato *
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="(11) 98765-4321"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 2: DADOS DO VOO */}
          {activeTab === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Origem (Aeroporto/Cidade) *
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: GRU"
                    maxLength={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Destino (Aeroporto/Cidade) *
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: GIG"
                    maxLength={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Data e Hora do Voo (Ida) *
                  </label>
                  <input
                    type="datetime-local"
                    value={departureDatetime}
                    onChange={(e) => setDepartureDatetime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Data e Hora do Voo (Volta)
                  </label>
                  <input
                    type="datetime-local"
                    value={returnDatetime}
                    onChange={(e) => setReturnDatetime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
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
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="GOL">GOL</option>
                    <option value="LATAM">LATAM</option>
                    <option value="AZUL">AZUL</option>
                    <option value="AVIANCA">AVIANCA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Número do Voo *
                  </label>
                  <input
                    type="text"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: G31234"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Classe Tarifária *
                  </label>
                  <select
                    value={flightClass}
                    onChange={(e) => setFlightClass(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="ECONÔMICA">Econômica</option>
                    <option value="EXECUTIVA">Executiva</option>
                    <option value="PRIMEIRA_CLASSE">Primeira Classe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Assento Preferencial
                  </label>
                  <input
                    type="text"
                    value={preferredSeat}
                    onChange={(e) => setPreferredSeat(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: 15A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Número de Bagagens
                  </label>
                  <input
                    type="number"
                    value={baggageCount}
                    onChange={(e) => setBaggageCount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                    max="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Código de Reserva (PNR) *
                  </label>
                  <input
                    type="text"
                    value={pnrCode}
                    onChange={(e) => setPnrCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: ABCDEF"
                    maxLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Programa de Milhagem
                  </label>
                  <input
                    type="text"
                    value={mileageProgram}
                    onChange={(e) => setMileageProgram(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: Smiles, TudoAzul"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Solicitação Especial
                  </label>
                  <textarea
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                    placeholder="Ex: Cadeira de rodas, refeição especial"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 3: PAGAMENTO E FATURAMENTO */}
          {activeTab === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Forma de Pagamento *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="CREDITO">Cartão de Crédito</option>
                    <option value="DEBITO">Cartão de Débito</option>
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Valor Total (R$) *
                  </label>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: 1500.00"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Taxas e Impostos (R$)
                  </label>
                  <input
                    type="number"
                    value={taxesAmount}
                    onChange={(e) => setTaxesAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: 150.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Moeda
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="BRL">Real (BRL)</option>
                    <option value="USD">Dólar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Política de Reembolso/Alteração
                  </label>
                  <input
                    type="text"
                    value={refundPolicy}
                    onChange={(e) => setRefundPolicy(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: Flexível, Não reembolsável"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status de Emissão
                  </label>
                  <select
                    value={issueStatus}
                    onChange={(e) => setIssueStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="EMITIDO">Emitido</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Nome do Responsável pela Compra *
                  </label>
                  <input
                    type="text"
                    value={billingName}
                    onChange={(e) => setBillingName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: João Silva"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    CPF/CNPJ para Faturamento *
                  </label>
                  <input
                    type="text"
                    value={billingDocument}
                    onChange={(e) => setBillingDocument(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: 123.456.789-00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Telefone de Contato
                  </label>
                  <input
                    type="tel"
                    value={billingPhone}
                    onChange={(e) => setBillingPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="(11) 98765-4321"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Endereço de Cobrança
                  </label>
                  <input
                    type="text"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Rua, número, cidade, estado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    E-mail de Faturamento
                  </label>
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="faturamento@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Forma de Envio do Bilhete
                  </label>
                  <select
                    value={ticketDelivery}
                    onChange={(e) => setTicketDelivery(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="E-MAIL">E-mail</option>
                    <option value="SMS">SMS</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="RETIRADA">Retirada no Local</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 4: OBSERVAÇÕES INTERNAS */}
          {activeTab === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Código do Atendente/Agente
                  </label>
                  <input
                    type="text"
                    value={agentCode}
                    onChange={(e) => setAgentCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: AG001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Data e Hora da Criação
                  </label>
                  <input
                    type="datetime-local"
                    value={reservationDate}
                    onChange={(e) => setReservationDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Canal de Origem
                  </label>
                  <select
                    value={originChannel}
                    onChange={(e) => setOriginChannel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="SISTEMA">Sistema</option>
                    <option value="TELEFONE">Telefone</option>
                    <option value="E-MAIL">E-mail</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="PRESENCIAL">Presencial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status da Reserva
                  </label>
                  <select
                    value={reservationStatus}
                    onChange={(e) => setReservationStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="CONFIRMADA">Confirmada</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Motivo da Viagem
                  </label>
                  <input
                    type="text"
                    value={travelReason}
                    onChange={(e) => setTravelReason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: Negócios, Lazer, Família"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Observações Adicionais
                  </label>
                  <textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={4}
                    placeholder="Digite observações gerais sobre a reserva..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg ${
              message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}
        </form>

        {/* Footer with Navigation */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Passo {activeTab + 1} de 4
          </div>
          <div className="flex gap-2">
            {activeTab > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab(activeTab - 1)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                ← Anterior
              </button>
            )}
            {activeTab < 3 ? (
              <button
                type="button"
                onClick={() => setActiveTab(activeTab + 1)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Próximo →
              </button>
            ) : (
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Cadastrando...' : '✅ Cadastrar Reserva'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
