'use client';

import { useState, useEffect } from 'react';
import { Button } from '@reservasegura/ui';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  read: boolean;
  createdAt: string;
  bookingCode?: string;
  flightNumber?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/booking-monitor/notifications`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setNotifications(result.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${apiUrl}/api/booking-monitor/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${apiUrl}/api/booking-monitor/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!confirm('Deseja deletar esta notificação?')) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${apiUrl}/api/booking-monitor/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Erro ao deletar notificação:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200';
      case 'INFO':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '🚨';
      case 'WARNING':
        return '⚠️';
      case 'INFO':
        return 'ℹ️';
      default:
        return '📢';
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
    return date.toLocaleDateString('pt-BR');
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <button className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors">
                  ← Dashboard
                </button>
              </Link>
              <h1 className="text-2xl font-bold">
                🔔 Notificações
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-1 text-sm bg-red-500 text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                ✓ Marcar todas como lidas
              </Button>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-md transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Não lidas ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-lg">Carregando notificações...</p>
            </div>
          </div>
        )}

        {!loading && filteredNotifications.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg">
              {filter === 'unread'
                ? '✅ Nenhuma notificação não lida'
                : '📭 Nenhuma notificação ainda'}
            </p>
          </div>
        )}

        {!loading && filteredNotifications.length > 0 && (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg border p-4 transition-all ${
                  getSeverityColor(notification.severity)
                } ${notification.read ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">
                        {getSeverityIcon(notification.severity)}
                      </span>
                      <h3 className="font-bold text-lg">{notification.title}</h3>
                      {!notification.read && (
                        <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
                          Nova
                        </span>
                      )}
                    </div>

                    <p className="text-gray-700 mb-3">{notification.message}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>🕐 {formatDate(notification.createdAt)}</span>
                      {notification.bookingCode && (
                        <span className="font-mono">
                          📝 {notification.bookingCode}
                        </span>
                      )}
                      {notification.flightNumber && (
                        <span className="font-mono">
                          ✈️ {notification.flightNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        title="Marcar como lida"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      title="Deletar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
