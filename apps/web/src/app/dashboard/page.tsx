'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Search, Plane, Calendar, User, LogOut, Bell } from 'lucide-react';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { BookingRegisterModal } from '../../components/dashboard/booking-register-modal';
import { MonitoringButton } from '../../components/dashboard/monitoring-button';
import { NotificationBell } from '../../components/notifications/notification-bell';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const [showBookingRegisterModal, setShowBookingRegisterModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        {/* Header Minimalista */}
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                  <Plane className="w-6 h-6 text-white transform rotate-45" strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-blue-900">Reserva Segura</h1>
                  <p className="text-xs text-cyan-600 font-medium uppercase tracking-wide">Dashboard</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <NotificationBell />
                <button
                  onClick={() => window.location.href = '/profile'}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Perfil"
                >
                  <User className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - 3 Cards Principais */}
        <div className="container mx-auto px-6 py-12">
          {/* Título e Subtítulo */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-blue-900 mb-2">Simples e Rápido</h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              Busque, compre, reserve e viaje. Tudo isso em apenas 3 cliques.
              <br />
              Todo conforto e controle de suas viagens na palma da mão.
            </p>
          </div>

          {/* 3 Cards de Ação - Versão Compacta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
            {/* Card 1: Buscar */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center text-center hover:scale-105 border-2 border-transparent hover:border-cyan-400"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                <Search className="w-8 h-8 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-1">1. Buscar</h3>
              <p className="text-sm text-gray-600">
                Pesquise seus voos e reservas
              </p>
            </button>

            {/* Card 2: Reservar */}
            <button
              onClick={() => setShowBookingRegisterModal(true)}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center text-center hover:scale-105 border-2 border-transparent hover:border-blue-400"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                <Calendar className="w-8 h-8 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-1">2. Reservar</h3>
              <p className="text-sm text-gray-600">
                Cadastre uma nova reserva
              </p>
            </button>

            {/* Card 3: Viagem */}
            <button
              onClick={() => window.location.href = '/flights'}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center text-center hover:scale-105 border-2 border-transparent hover:border-purple-400"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                <Plane className="w-8 h-8 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-1">3. Viagem</h3>
              <p className="text-sm text-gray-600">
                Gerencie suas viagens
              </p>
            </button>
          </div>

          {/* Seção de Monitoramento */}
          <div className="mt-8 max-w-5xl mx-auto">
            <MonitoringButton />
          </div>

          {/* Seção de Recursos */}
          <div className="mt-16 bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-blue-900 mb-6 text-center">
              Reserve com Segurança
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-blue-900 mb-2">Pagamento Seguro</h4>
                <p className="text-sm text-gray-600">Via pagamentos 3x17, garantia de 3 a 7 semanas de reembolso</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-blue-900 mb-2">Seguro 24/7</h4>
                <p className="text-sm text-gray-600">Sua tranquilidade é nossa prioridade</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-semibold text-blue-900 mb-2">Acompanhamento</h4>
                <p className="text-sm text-gray-600">Monitoramento automático de alterações</p>
              </div>
            </div>
          </div>

          {/* Logos das Companhias Aéreas */}
          <div className="mt-8 flex flex-col items-center">
            <h4 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider">Parceiros</h4>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <div className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <Image src="/airlines/gol.png" alt="GOL Linhas Aéreas" width={80} height={32} className="h-8 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <Image src="/airlines/latam.png" alt="LATAM Airlines" width={80} height={32} className="h-8 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <Image src="/airlines/azul.png" alt="Azul Linhas Aéreas" width={80} height={32} className="h-8 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Busca */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">Buscar Voos e Reservas</h3>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Busca por Localizador */}
              <div>
                <label className="block text-sm font-semibold text-blue-900 mb-2">
                  Localizador da Reserva
                </label>
                <input
                  type="text"
                  placeholder="Ex: ABC123"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-lg"
                />
              </div>

              {/* Busca por Nome */}
              <div>
                <label className="block text-sm font-semibold text-blue-900 mb-2">
                  Nome do Passageiro
                </label>
                <input
                  type="text"
                  placeholder="Digite o nome completo"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              {/* Botões de Navegação Rápida */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    window.location.href = '/flights';
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Ver Todos os Voos
                </button>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    window.location.href = '/flights';
                  }}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  Ver Todos os Voos
                </button>
              </div>

              <button
                onClick={() => setShowSearchModal(false)}
                className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Reserva */}
      <BookingRegisterModal
        isOpen={showBookingRegisterModal}
        onClose={() => setShowBookingRegisterModal(false)}
        onSuccess={() => {
          setShowBookingRegisterModal(false);
          window.location.href = '/flights';
        }}
      />
    </>
  );
}
