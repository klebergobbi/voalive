'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Label } from '@reservasegura/ui';
import { Settings, User, Lock, Bell, Save, Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { authService } from '../../services/auth.service';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface NotificationSettings {
  emailBookingConfirmed: boolean;
  emailPaymentReceived: boolean;
  emailFlightUpdate: boolean;
  pushBookingConfirmed: boolean;
  pushPaymentReceived: boolean;
  pushFlightUpdate: boolean;
}

type TabType = 'profile' | 'security' | 'notifications';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile form state
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notification settings state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailBookingConfirmed: true,
    emailPaymentReceived: true,
    emailFlightUpdate: true,
    pushBookingConfirmed: false,
    pushPaymentReceived: false,
    pushFlightUpdate: false,
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await authService.getCurrentUser();
      if (response) {
        setUser(response);
        setProfileName(response.name);
        setProfileEmail(response.email);
      }
    } catch (error: any) {
      console.error('Error loading user profile:', error);
      setError(error.message || 'Erro ao carregar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!profileName.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    if (!profileEmail.trim() || !profileEmail.includes('@')) {
      setError('Email válido é obrigatório');
      return;
    }

    try {
      setIsSaving(true);

      // TODO: Implement update profile endpoint
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Senha atual é obrigatória');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('Nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    try {
      setIsSaving(true);

      // TODO: Implement change password endpoint
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setError(error.message || 'Erro ao alterar senha');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNotifications = async () => {
    setError('');
    setSuccess('');

    try {
      setIsSaving(true);

      // TODO: Implement update notifications endpoint
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess('Preferências de notificação atualizadas!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating notifications:', error);
      setError(error.message || 'Erro ao atualizar notificações');
    } finally {
      setIsSaving(false);
    }
  };

  const renderProfileTab = () => (
    <form onSubmit={handleUpdateProfile} className="space-y-6">
      <div>
        <Label htmlFor="name">Nome Completo</Label>
        <Input
          id="name"
          type="text"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          placeholder="Seu nome completo"
          disabled={isSaving}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={profileEmail}
          onChange={(e) => setProfileEmail(e.target.value)}
          placeholder="seu@email.com"
          disabled={isSaving}
          className="mt-1"
        />
      </div>

      {user && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Tipo de Conta</p>
            <p className="font-semibold capitalize">{user.role.toLowerCase()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-semibold">
              {user.isActive ? (
                <span className="text-green-600">Ativo</span>
              ) : (
                <span className="text-red-600">Inativo</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Membro desde</p>
            <p className="font-semibold">
              {new Date(user.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      )}

      <Button type="submit" disabled={isSaving} className="w-full">
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </>
        )}
      </Button>
    </form>
  );

  const renderSecurityTab = () => (
    <form onSubmit={handleChangePassword} className="space-y-6">
      <div>
        <Label htmlFor="currentPassword">Senha Atual</Label>
        <div className="relative mt-1">
          <Input
            id="currentPassword"
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Digite sua senha atual"
            disabled={isSaving}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="newPassword">Nova Senha</Label>
        <div className="relative mt-1">
          <Input
            id="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Digite a nova senha (mínimo 6 caracteres)"
            disabled={isSaving}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
        <div className="relative mt-1">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Digite a nova senha novamente"
            disabled={isSaving}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Dicas de Segurança:</strong>
        </p>
        <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
          <li>Use pelo menos 8 caracteres</li>
          <li>Combine letras maiúsculas e minúsculas</li>
          <li>Inclua números e símbolos</li>
          <li>Não use senhas óbvias ou informações pessoais</li>
        </ul>
      </div>

      <Button type="submit" disabled={isSaving} className="w-full">
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Alterando...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Alterar Senha
          </>
        )}
      </Button>
    </form>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Notificações por Email</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <div>
              <p className="font-medium">Confirmação de Reserva</p>
              <p className="text-sm text-gray-600">Receba emails quando sua reserva for confirmada</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.emailBookingConfirmed}
              onChange={(e) => setNotifications({ ...notifications, emailBookingConfirmed: e.target.checked })}
              className="h-5 w-5 text-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <div>
              <p className="font-medium">Pagamento Recebido</p>
              <p className="text-sm text-gray-600">Receba emails quando seu pagamento for processado</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.emailPaymentReceived}
              onChange={(e) => setNotifications({ ...notifications, emailPaymentReceived: e.target.checked })}
              className="h-5 w-5 text-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <div>
              <p className="font-medium">Atualizações de Voo</p>
              <p className="text-sm text-gray-600">Receba emails sobre alterações no status do voo</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.emailFlightUpdate}
              onChange={(e) => setNotifications({ ...notifications, emailFlightUpdate: e.target.checked })}
              className="h-5 w-5 text-blue-500"
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Notificações Push</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <div>
              <p className="font-medium">Confirmação de Reserva</p>
              <p className="text-sm text-gray-600">Notificações no navegador para reservas confirmadas</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.pushBookingConfirmed}
              onChange={(e) => setNotifications({ ...notifications, pushBookingConfirmed: e.target.checked })}
              className="h-5 w-5 text-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <div>
              <p className="font-medium">Pagamento Recebido</p>
              <p className="text-sm text-gray-600">Notificações no navegador para pagamentos processados</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.pushPaymentReceived}
              onChange={(e) => setNotifications({ ...notifications, pushPaymentReceived: e.target.checked })}
              className="h-5 w-5 text-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <div>
              <p className="font-medium">Atualizações de Voo</p>
              <p className="text-sm text-gray-600">Notificações no navegador sobre alterações de voo</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.pushFlightUpdate}
              onChange={(e) => setNotifications({ ...notifications, pushFlightUpdate: e.target.checked })}
              className="h-5 w-5 text-blue-500"
            />
          </label>
        </div>
      </div>

      <Button onClick={handleUpdateNotifications} disabled={isSaving} className="w-full">
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Salvar Preferências
          </>
        )}
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-lg">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold">Configurações</h1>
              <p className="text-muted-foreground">Gerencie suas preferências e configurações da conta</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'profile'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <User className="h-5 w-5" />
                    <span className="font-medium">Perfil</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('security')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'security'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Lock className="h-5 w-5" />
                    <span className="font-medium">Segurança</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === 'notifications'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Bell className="h-5 w-5" />
                    <span className="font-medium">Notificações</span>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === 'profile' && 'Informações do Perfil'}
                  {activeTab === 'security' && 'Segurança da Conta'}
                  {activeTab === 'notifications' && 'Preferências de Notificação'}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'profile' && 'Atualize suas informações pessoais'}
                  {activeTab === 'security' && 'Gerencie sua senha e configurações de segurança'}
                  {activeTab === 'notifications' && 'Configure como deseja ser notificado'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeTab === 'profile' && renderProfileTab()}
                {activeTab === 'security' && renderSecurityTab()}
                {activeTab === 'notifications' && renderNotificationsTab()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
