'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { NotificationList } from '@/components/notifications';
import { useNotifications } from '@/hooks/useNotifications';
import { ArrowLeft, Bell, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  );
}

function NotificationsContent() {
  const { stats, loading } = useNotifications();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
                <p className="text-sm text-gray-600">
                  Central de alertas e atualizações das suas reservas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && !loading && (
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Total */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Não Lidas */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Não Lidas</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Urgentes */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Urgentes</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.byPriority.find(p => p.priority === 'URGENT')?._count || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            {/* Alta Prioridade */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Alta Prioridade</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.byPriority.find(p => p.priority === 'HIGH')?._count || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Info className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Notificações */}
      <div className="container mx-auto px-6 pb-6">
        <NotificationList limit={100} showActions />
      </div>

      {/* Informações sobre o sistema */}
      <div className="container mx-auto px-6 pb-12">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Sobre as notificações
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              • <strong>Monitoramento Automático:</strong> Suas reservas são verificadas
              automaticamente a cada 15 minutos
            </p>
            <p>
              • <strong>3 falhas consecutivas:</strong> Notificação MÉDIA (primeiro alerta)
            </p>
            <p>
              • <strong>10 falhas consecutivas:</strong> Notificação ALTA (verificação manual
              necessária)
            </p>
            <p>
              • <strong>20+ falhas consecutivas:</strong> Notificação URGENTE (crítico)
            </p>
            <p>
              • <strong>Voo {'<'} 24h:</strong> Notificação URGENTE (independente do número de
              falhas)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
