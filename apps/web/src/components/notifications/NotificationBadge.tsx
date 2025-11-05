'use client';

import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationBadgeProps {
  onClick?: () => void;
  className?: string;
  showUrgentOnly?: boolean;
}

/**
 * Badge de notificações com contador
 * Mostra um ícone de sino com badge indicando número de notificações não lidas
 */
export function NotificationBadge({
  onClick,
  className = '',
  showUrgentOnly = false
}: NotificationBadgeProps) {
  const { unreadCount, urgentCount, loading } = useNotifications({
    autoRefresh: true,
    refreshInterval: 30000 // 30 segundos
  });

  const displayCount = showUrgentOnly ? urgentCount : unreadCount;
  const hasNotifications = displayCount > 0;

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
      title={`${displayCount} notificação${displayCount !== 1 ? 'ões' : ''} não lida${displayCount !== 1 ? 's' : ''}`}
    >
      <Bell
        className={`w-6 h-6 ${hasNotifications ? 'text-blue-600' : 'text-gray-600'}`}
      />

      {hasNotifications && !loading && (
        <span
          className={`absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white rounded-full ${
            showUrgentOnly || urgentCount > 0 ? 'bg-red-500' : 'bg-blue-500'
          }`}
        >
          {displayCount > 99 ? '99+' : displayCount}
        </span>
      )}

      {loading && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-gray-300 rounded-full animate-pulse" />
      )}
    </button>
  );
}

/**
 * Badge compacto (somente o contador, sem ícone)
 */
export function NotificationCountBadge({
  count,
  priority = 'default',
  className = ''
}: {
  count: number;
  priority?: 'urgent' | 'high' | 'default';
  className?: string;
}) {
  if (count === 0) return null;

  const bgColor =
    priority === 'urgent' ? 'bg-red-500' :
    priority === 'high' ? 'bg-orange-500' :
    'bg-blue-500';

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white rounded-full ${bgColor} ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
