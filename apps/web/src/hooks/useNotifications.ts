'use client';

import { useEffect, useState, useCallback } from 'react';

export interface Notification {
  id: string;
  bookingCode: string | null;
  type: string;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  actionUrl: string | null;
  metadata: string | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  byPriority: Array<{ priority: string; _count: number }>;
  byType: Array<{ type: string; _count: number }>;
}

interface UseNotificationsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // em milissegundos (padrão: 30 segundos)
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { autoRefresh = true, refreshInterval = 30000 } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Base URL da API conforme documentação
  const apiUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'https://www.reservasegura.pro')
    : '';

  // Buscar notificações não lidas (GET /api/notifications)
  const fetchNotifications = useCallback(async (limit: number = 50) => {
    if (!apiUrl) return;

    try {
      setError(null);
      const url = `${apiUrl}/api/notifications?limit=${limit}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications || []);
      } else {
        throw new Error(data.error || 'Erro ao buscar notificações');
      }
    } catch (err: any) {
      console.error('[useNotifications] Erro ao buscar notificações:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Buscar estatísticas (GET /api/notifications/stats)
  const fetchStats = useCallback(async () => {
    if (!apiUrl) return;

    try {
      const response = await fetch(`${apiUrl}/api/notifications/stats`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error('[useNotifications] Erro ao buscar stats:', err);
    }
  }, [apiUrl]);

  // Buscar notificações de uma reserva específica (GET /api/notifications/booking/:bookingCode)
  const fetchNotificationsByBooking = useCallback(async (bookingCode: string) => {
    if (!apiUrl) return [];

    try {
      const response = await fetch(`${apiUrl}/api/notifications/booking/${bookingCode}`);
      const data = await response.json();

      if (data.success) {
        return data.notifications || [];
      }
      return [];
    } catch (err: any) {
      console.error('[useNotifications] Erro ao buscar notificações da reserva:', err);
      return [];
    }
  }, [apiUrl]);

  // Marcar notificação como lida (PATCH /api/notifications/:id/read)
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!apiUrl) return false;

    try {
      const response = await fetch(`${apiUrl}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      const data = await response.json();

      if (data.success) {
        // Atualizar localmente
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, read: true, readAt: data.notification?.readAt || new Date().toISOString() }
              : n
          )
        );

        // Atualizar stats
        if (stats) {
          setStats({
            ...stats,
            unread: Math.max(0, stats.unread - 1),
            read: stats.read + 1,
          });
        }

        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[useNotifications] Erro ao marcar como lida:', err);
      return false;
    }
  }, [apiUrl, stats]);

  // Marcar todas como lidas (função auxiliar)
  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter(n => !n.read);

    const results = await Promise.all(
      unreadNotifications.map(n => markAsRead(n.id))
    );

    return results.every(r => r);
  }, [notifications, markAsRead]);

  // Limpar notificações antigas (DELETE /api/notifications/cleanup)
  // Remove notificações LIDAS com mais de 30 dias
  const cleanupOldNotifications = useCallback(async () => {
    if (!apiUrl) return { success: false, count: 0 };

    try {
      const response = await fetch(`${apiUrl}/api/notifications/cleanup`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Recarregar notificações após limpeza
        await fetchNotifications();
        await fetchStats();

        // Extrair número de notificações removidas da mensagem
        const match = data.message?.match(/(\d+)/);
        const count = match ? parseInt(match[1], 10) : 0;

        return { success: true, count };
      }
      return { success: false, count: 0 };
    } catch (err: any) {
      console.error('[useNotifications] Erro ao limpar notificações:', err);
      return { success: false, count: 0 };
    }
  }, [apiUrl, fetchNotifications, fetchStats]);

  // Carregar dados iniciais
  useEffect(() => {
    if (apiUrl) {
      fetchNotifications();
      fetchStats();
    }
  }, [apiUrl, fetchNotifications, fetchStats]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !apiUrl) return;

    const interval = setInterval(() => {
      fetchNotifications();
      fetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, apiUrl, fetchNotifications, fetchStats]);

  // Valores calculados
  const unreadCount = stats?.unread || notifications.filter(n => !n.read).length;
  const hasUnread = unreadCount > 0;
  const urgentCount = notifications.filter(n => n.priority === 'URGENT' && !n.read).length;

  return {
    // Dados
    notifications,
    stats,
    loading,
    error,

    // Valores calculados
    unreadCount,
    hasUnread,
    urgentCount,

    // Funções
    fetchNotifications,
    fetchStats,
    fetchNotificationsByBooking,
    markAsRead,
    markAllAsRead,
    cleanupOldNotifications,
    refresh: () => {
      fetchNotifications();
      fetchStats();
    },
  };
}
