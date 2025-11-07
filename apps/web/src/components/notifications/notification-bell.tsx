'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertCircle, CheckCircle, Info, AlertTriangle, Volume2 } from 'lucide-react';

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

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const previousUnreadCount = useRef(0);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Web Audio API para sons de notificação
  const playNotificationSound = (priority: string) => {
    if (!soundEnabled) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Frequências diferentes por prioridade
      if (priority === 'URGENT') {
        // Som de alarme urgente (3 beeps rápidos)
        oscillator.frequency.value = 880; // A5
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);

        // Segundo beep
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 880;
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
        osc2.start(audioContext.currentTime + 0.15);
        osc2.stop(audioContext.currentTime + 0.25);

        // Terceiro beep
        const osc3 = audioContext.createOscillator();
        const gain3 = audioContext.createGain();
        osc3.connect(gain3);
        gain3.connect(audioContext.destination);
        osc3.frequency.value = 880;
        gain3.gain.setValueAtTime(0.3, audioContext.currentTime + 0.3);
        gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        osc3.start(audioContext.currentTime + 0.3);
        osc3.stop(audioContext.currentTime + 0.4);
      } else if (priority === 'HIGH') {
        // Som de alerta alto (2 beeps)
        oscillator.frequency.value = 660; // E5
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);

        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 660;
        gain2.gain.setValueAtTime(0.2, audioContext.currentTime + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
        osc2.start(audioContext.currentTime + 0.2);
        osc2.stop(audioContext.currentTime + 0.35);
      } else {
        // Som suave para outras notificações
        oscillator.frequency.value = 523; // C5
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    } catch (error) {
      console.error('Erro ao reproduzir som:', error);
    }
  };

  // Função para solicitar permissão de notificações push
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPushEnabled(true);
      localStorage.setItem('pushEnabled', 'true');
    }
  };

  // Verificar se push está habilitado no carregamento
  useEffect(() => {
    const enabled = localStorage.getItem('pushEnabled') === 'true';
    setPushEnabled(enabled && Notification.permission === 'granted');
    const soundPref = localStorage.getItem('soundEnabled');
    if (soundPref !== null) {
      setSoundEnabled(soundPref === 'true');
    }
  }, []);

  // Mostrar notificação push do navegador
  const showBrowserNotification = (notification: Notification) => {
    if (!pushEnabled || Notification.permission !== 'granted') return;

    const options = {
      body: notification.message,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: notification.id,
      requireInteraction: notification.priority === 'URGENT',
      data: {
        url: '/notifications',
        notificationId: notification.id
      }
    };

    const browserNotif = new Notification(notification.title, options);

    browserNotif.onclick = () => {
      window.focus();
      window.location.href = '/notifications';
      browserNotif.close();
    };
  };

  useEffect(() => {
    loadNotifications();
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      // Tentar buscar notificações (todas as recentes)
      const response = await fetch(`${apiUrl}/api/notifications?limit=100`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const newNotifications = data.data;
          const currentUnreadCount = newNotifications.filter((n: Notification) => !n.read).length;

          // Detectar novas notificações
          if (previousUnreadCount.current > 0 && currentUnreadCount > previousUnreadCount.current) {
            const newOnes = newNotifications.filter((n: Notification) =>
              !n.read && !notifications.find(old => old.id === n.id)
            );

            // Tocar som e mostrar push para cada nova notificação
            newOnes.forEach((notif: Notification) => {
              if (notif.priority === 'URGENT' || notif.priority === 'HIGH') {
                playNotificationSound(notif.priority);
                showBrowserNotification(notif);
              }
            });
          }

          previousUnreadCount.current = currentUnreadCount;
          setNotifications(newNotifications);
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

  const getIcon = (type: string, priority: string) => {
    const iconClass = "w-5 h-5";

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-50 border-red-200';
      case 'HIGH': return 'bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notificações"
      >
        <Bell className="w-6 h-6 text-gray-600" />

        {/* Badge de notificações não lidas */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de Notificações */}
      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel de Notificações */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
              <div>
                <h3 className="text-lg font-bold text-blue-900">Notificações</h3>
                <p className="text-xs text-gray-600">
                  {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Marcar todas como lidas
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Lista de Notificações */}
            <div className="overflow-y-auto flex-1">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Carregando...</p>
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                  <Bell className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Nenhuma notificação</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Você será notificado sobre mudanças nos seus voos
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => {
                        setIsOpen(false);
                        window.location.href = '/notifications';
                      }}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type, notification.priority)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`text-sm font-semibold ${
                              !notification.read ? 'text-blue-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></span>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>

                          {notification.flightNumber && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                              <span className="font-mono font-semibold">
                                {notification.flightNumber}
                              </span>
                              {notification.bookingCode && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">
                                    {notification.bookingCode}
                                  </span>
                                </>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {formatDate(notification.createdAt)}
                            </span>

                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Configurações de Som e Push */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">Sons de alerta</span>
                </div>
                <button
                  onClick={() => {
                    const newState = !soundEnabled;
                    setSoundEnabled(newState);
                    localStorage.setItem('soundEnabled', String(newState));
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    soundEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">Push do navegador</span>
                </div>
                {pushEnabled ? (
                  <button
                    onClick={() => {
                      setPushEnabled(false);
                      localStorage.setItem('pushEnabled', 'false');
                    }}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-blue-600"
                  >
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                  </button>
                ) : (
                  <button
                    onClick={requestNotificationPermission}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Ativar
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-white">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/notifications';
                  }}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium text-center"
                >
                  Ver todas as notificações
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
