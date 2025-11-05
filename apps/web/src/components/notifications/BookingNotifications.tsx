'use client';

import { useEffect, useState } from 'react';
import { Notification } from '@/hooks/useNotifications';
import { NotificationCard, NotificationCardSkeleton } from './NotificationCard';
import { AlertCircle, Bell } from 'lucide-react';

interface BookingNotificationsProps {
  bookingCode: string;
  onMarkAsRead?: (id: string) => void;
  compact?: boolean;
}

/**
 * Componente para exibir notificações de uma reserva específica
 * Usa o endpoint GET /api/notifications/booking/:bookingCode
 */
export function BookingNotifications({
  bookingCode,
  onMarkAsRead,
  compact = false
}: BookingNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'https://www.reservasegura.pro')
    : '';

  useEffect(() => {
    const fetchBookingNotifications = async () => {
      if (!apiUrl || !bookingCode) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/api/notifications/booking/${bookingCode}`);
        const data = await response.json();

        if (data.success) {
          setNotifications(data.notifications || []);
        } else {
          throw new Error(data.error || 'Erro ao buscar notificações');
        }
      } catch (err: any) {
        console.error('[BookingNotifications] Erro:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingNotifications();
  }, [apiUrl, bookingCode]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/notifications/${id}/read`, {
        method: 'PATCH',
      });

      const data = await response.json();

      if (data.success) {
        // Atualizar localmente
        setNotifications(prev =>
          prev.map(n =>
            n.id === id ? { ...n, read: true, readAt: data.notification?.readAt } : n
          )
        );

        // Callback externo
        if (onMarkAsRead) {
          onMarkAsRead(id);
        }
      }
    } catch (err: any) {
      console.error('[BookingNotifications] Erro ao marcar como lida:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <NotificationCardSkeleton key={i} compact={compact} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Erro ao carregar notificações</span>
        </div>
        <p className="text-sm text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">
          Nenhuma notificação para esta reserva
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-5 h-5 text-blue-600" />
        <h4 className="font-semibold text-gray-800">
          Notificações da Reserva {bookingCode}
        </h4>
        <span className="px-2 py-1 text-xs bg-gray-200 rounded-full">
          {notifications.length}
        </span>
      </div>

      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onMarkAsRead={handleMarkAsRead}
          compact={compact}
        />
      ))}
    </div>
  );
}

/**
 * Badge simples que mostra se há notificações para uma reserva
 */
export function BookingNotificationBadge({
  bookingCode,
  onClick
}: {
  bookingCode: string;
  onClick?: () => void;
}) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const apiUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'https://www.reservasegura.pro')
    : '';

  useEffect(() => {
    const fetchCount = async () => {
      if (!apiUrl || !bookingCode) return;

      try {
        const response = await fetch(`${apiUrl}/api/notifications/booking/${bookingCode}`);
        const data = await response.json();

        if (data.success) {
          const unreadCount = data.notifications?.filter((n: Notification) => !n.read).length || 0;
          setCount(unreadCount);
        }
      } catch (err: any) {
        console.error('[BookingNotificationBadge] Erro:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();

    // Refresh a cada 30 segundos
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [apiUrl, bookingCode]);

  if (loading || count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded hover:bg-red-200 transition-colors"
      title={`${count} notificação${count !== 1 ? 'ões' : ''} não lida${count !== 1 ? 's' : ''}`}
    >
      <Bell className="w-3 h-3" />
      {count}
    </button>
  );
}
