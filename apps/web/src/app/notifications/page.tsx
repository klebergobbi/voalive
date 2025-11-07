'use client';

import { useState, useEffect } from 'react';
import { Bell, X, ArrowLeft, AlertCircle, CheckCircle, Info, AlertTriangle, Filter, Trash2 } from 'lucide-react';
import { AuthGuard } from '../../components/auth/AuthGuard';

interface Notification {
  id: string;
  type: 'FLIGHT_CHANGE' | 'GATE_CHANGE' | 'DELAY' | 'CANCELLATION' | 'INFO';
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  read: boolean;
  createdAt: string;
  bookingCode?: string;
  flightNumber?: string;
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'URGENT'>('ALL');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const response = await fetch(`${apiUrl}/api/notifications?limit=100`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setNotifications(data.data);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const response = await fetch(`${apiUrl}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const response = await fetch(`${apiUrl}/api/notifications/mark-all-read`, {
        method: 'PUT',
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const response = await fetch(`${apiUrl}/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  };

  const getIcon = (type: string, priority: string) => {
    const iconClass = "w-6 h-6";

    if (priority === 'URGENT' || type === 'CANCELLATION') {
      return <AlertCircle className={`${iconClass} text-red-600`} />;
    }
    if (priority === 'HIGH' || type === 'GATE_CHANGE') {
      return <AlertTriangle className={`${iconClass} text-orange-600`} />;
    }
    if (type === 'DELAY') {
      return <AlertTriangle className={`${iconClass} text-yellow-600`} />;
    }
    if (type === 'FLIGHT_CHANGE') {
      return <Info className={`${iconClass} text-blue-600`} />;
    }
    return <CheckCircle className={`${iconClass} text-green-600`} />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.read;
    if (filter === 'URGENT') return n.priority === 'URGENT';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                  <Bell className="w-7 h-7" />
                  Notificações
                </h1>
                <p className="text-sm text-gray-600">
                  {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'} • {notifications.length} total
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="container mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Filtrar:</span>
            <div className="flex gap-2">
              {['ALL', 'UNREAD', 'URGENT'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'ALL' ? 'Todas' : f === 'UNREAD' ? 'Não lidas' : 'Urgentes'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Notificações */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando notificações...</p>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">Nenhuma notificação</h3>
            <p className="text-gray-500">
              {filter === 'UNREAD' ? 'Você não tem notificações não lidas' :
               filter === 'URGENT' ? 'Você não tem notificações urgentes' :
               'Você será notificado sobre mudanças nos seus voos'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden ${
                  !notification.read ? 'border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type, notification.priority)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h3 className={`text-lg font-bold mb-1 ${
                            !notification.read ? 'text-blue-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h3>
                          {notification.flightNumber && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <span className="font-mono font-semibold bg-gray-100 px-2 py-0.5 rounded">
                                {notification.flightNumber}
                              </span>
                              {notification.bookingCode && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                                    {notification.bookingCode}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                            notification.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                            notification.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                            notification.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {notification.priority === 'URGENT' ? 'Urgente' :
                             notification.priority === 'HIGH' ? 'Alta' :
                             notification.priority === 'MEDIUM' ? 'Média' :
                             'Baixa'}
                          </span>
                          {!notification.read && (
                            <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-700 mb-4">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {formatDate(notification.createdAt)}
                        </span>

                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              Marcar como lida
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm('Deseja realmente deletar esta notificação?')) {
                                deleteNotification(notification.id);
                              }
                            }}
                            className="text-sm text-red-600 hover:text-red-700 font-medium p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Deletar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
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

export default function NotificationsPageWrapper() {
  return (
    <AuthGuard>
      <NotificationsPage />
    </AuthGuard>
  );
}
