'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { NotificationCard, NotificationCardSkeleton } from './NotificationCard';
import { RefreshCw, Check, Trash2 } from 'lucide-react';

interface NotificationListProps {
  limit?: number;
  compact?: boolean;
  showActions?: boolean;
  onNotificationClick?: (notificationId: string) => void;
}

/**
 * Lista de notificações com refresh automático
 * Exibe todas as notificações não lidas do usuário
 */
export function NotificationList({
  limit = 50,
  compact = false,
  showActions = true,
  onNotificationClick
}: NotificationListProps) {
  const {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    cleanupOldNotifications,
    refresh
  } = useNotifications({
    autoRefresh: true,
    refreshInterval: 30000 // 30 segundos
  });

  const handleMarkAsRead = async (id: string) => {
    const success = await markAsRead(id);
    if (success && onNotificationClick) {
      onNotificationClick(id);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (window.confirm(`Marcar todas as ${unreadCount} notificações como lidas?`)) {
      await markAllAsRead();
    }
  };

  const handleCleanup = async () => {
    if (window.confirm('Deseja limpar todas as notificações lidas com mais de 30 dias?')) {
      const result = await cleanupOldNotifications();
      if (result.success) {
        alert(`✅ ${result.count} notificações antigas foram removidas`);
      } else {
        alert('❌ Erro ao limpar notificações');
      }
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <NotificationCardSkeleton key={i} compact={compact} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-800">❌ Erro ao carregar notificações</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button
          onClick={refresh}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Nenhuma notificação
        </h3>
        <p className="text-gray-600">
          Você está em dia! Não há notificações pendentes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com ações */}
      {showActions && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">
              🔔 Notificações ({notifications.length})
            </h3>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
                {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                title="Marcar todas como lidas"
              >
                <Check className="w-4 h-4" />
                Marcar todas como lidas
              </button>
            )}

            <button
              onClick={handleCleanup}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="Limpar notificações antigas"
            >
              <Trash2 className="w-4 h-4" />
              Limpar antigas
            </button>
          </div>
        </div>
      )}

      {/* Lista de notificações */}
      <div className="space-y-3">
        {notifications.slice(0, limit).map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
            compact={compact}
          />
        ))}
      </div>

      {/* Indicador de mais notificações */}
      {notifications.length > limit && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            Mostrando {limit} de {notifications.length} notificações
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Dropdown compacto de notificações (para usar no header)
 */
export function NotificationDropdown({ onClose }: { onClose?: () => void }) {
  const { notifications, loading, unreadCount, markAsRead } = useNotifications({
    autoRefresh: true,
    refreshInterval: 30000
  });

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    // Não fecha o dropdown automaticamente para permitir marcar múltiplas
  };

  return (
    <div className="w-96 max-h-[600px] overflow-y-auto bg-white rounded-lg shadow-xl border">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <h3 className="font-bold">Notificações</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-3">
        {loading && notifications.length === 0 ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <NotificationCardSkeleton key={i} compact />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm text-gray-600">Nenhuma notificação</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 10).map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                compact
              />
            ))}
            {notifications.length > 10 && (
              <div className="text-center pt-2">
                <a
                  href="/notifications"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={onClose}
                >
                  Ver todas as {notifications.length} notificações →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
