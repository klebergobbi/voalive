'use client';

import { Notification } from '@/hooks/useNotifications';
import Link from 'next/link';

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  compact?: boolean;
}

export function NotificationCard({ notification, onMarkAsRead, compact = false }: NotificationCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'border-red-500 bg-red-50';
      case 'HIGH':
        return 'border-orange-500 bg-orange-50';
      case 'MEDIUM':
        return 'border-yellow-500 bg-yellow-50';
      case 'LOW':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '🚨';
      case 'HIGH':
        return '⚠️';
      case 'MEDIUM':
        return '⚡';
      case 'LOW':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'Urgente';
      case 'HIGH':
        return 'Alta';
      case 'MEDIUM':
        return 'Média';
      case 'LOW':
        return 'Baixa';
      default:
        return priority;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getMetadata = () => {
    try {
      return notification.metadata ? JSON.parse(notification.metadata) : null;
    } catch {
      return null;
    }
  };

  const metadata = getMetadata();

  if (compact) {
    return (
      <div
        className={`border-l-4 ${getPriorityColor(notification.priority)} p-3 rounded-lg transition-all ${
          notification.read ? 'opacity-60' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{getPriorityIcon(notification.priority)}</span>
              <h4 className="font-semibold text-sm truncate">{notification.title}</h4>
              {!notification.read && (
                <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </div>
            <p className="text-sm text-gray-700 line-clamp-2">{notification.message}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>{formatDate(notification.createdAt)}</span>
              {notification.bookingCode && (
                <span className="font-mono">{notification.bookingCode}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-l-4 ${getPriorityColor(notification.priority)} p-4 rounded-lg shadow-sm transition-all ${
        notification.read ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getPriorityIcon(notification.priority)}</span>
            <h3 className="font-bold text-lg">{notification.title}</h3>
            {!notification.read && (
              <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                Nova
              </span>
            )}
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${
                notification.priority === 'URGENT'
                  ? 'bg-red-200 text-red-800'
                  : notification.priority === 'HIGH'
                  ? 'bg-orange-200 text-orange-800'
                  : notification.priority === 'MEDIUM'
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-blue-200 text-blue-800'
              }`}
            >
              {getPriorityLabel(notification.priority)}
            </span>
          </div>

          {/* Message */}
          <p className="text-gray-700 mb-3 whitespace-pre-wrap">{notification.message}</p>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
            <span className="flex items-center gap-1">
              🕐 {formatDate(notification.createdAt)}
            </span>
            {notification.bookingCode && (
              <span className="flex items-center gap-1 font-mono bg-gray-100 px-2 py-1 rounded">
                📝 {notification.bookingCode}
              </span>
            )}
            {metadata?.airline && (
              <span className="flex items-center gap-1">
                ✈️ {metadata.airline}
              </span>
            )}
            {metadata?.failureCount && (
              <span className="flex items-center gap-1">
                ❌ {metadata.failureCount} falhas
              </span>
            )}
            {metadata?.departureDate && (
              <span className="flex items-center gap-1">
                📅 {new Date(metadata.departureDate).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          {/* Action URL */}
          {notification.actionUrl && (
            <a
              href={notification.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Verificar Reserva
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {!notification.read && onMarkAsRead && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              title="Marcar como lida"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="border-l-4 border-gray-300 bg-gray-50 p-3 rounded-lg animate-pulse">
        <div className="flex gap-3">
          <div className="w-6 h-6 bg-gray-300 rounded"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-full mb-1"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-l-4 border-gray-300 bg-gray-50 p-4 rounded-lg shadow-sm animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gray-300 rounded"></div>
            <div className="h-5 bg-gray-300 rounded w-1/3"></div>
          </div>
          <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-4/5 mb-3"></div>
          <div className="flex gap-4 mb-3">
            <div className="h-3 bg-gray-300 rounded w-20"></div>
            <div className="h-3 bg-gray-300 rounded w-24"></div>
          </div>
          <div className="h-10 bg-gray-300 rounded w-40"></div>
        </div>
      </div>
    </div>
  );
}
