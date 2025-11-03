'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Mail, Save, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { AuthGuard } from '../../components/auth/AuthGuard';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        setUser(result.data);
        setName(result.data.name || '');
        setEmail(result.data.email || '');
      } else {
        // Se não conseguir carregar, redirecionar para login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email })
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage('Perfil atualizado com sucesso!');
        await loadUserData();
      } else {
        setErrorMessage(result.error || 'Erro ao atualizar perfil');
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setErrorMessage('Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Preencha todos os campos de senha');
      setIsSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('A nova senha e a confirmação não coincidem');
      setIsSaving(false);
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('A nova senha deve ter pelo menos 8 caracteres');
      setIsSaving(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage('Senha alterada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMessage(result.error || 'Erro ao alterar senha');
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      setErrorMessage('Erro ao alterar senha');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-lg">Carregando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-blue-900">Meu Perfil</h1>
                <p className="text-sm text-gray-500">Gerencie suas informações pessoais e senha</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              ✅ {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              ❌ {errorMessage}
            </div>
          )}

          {/* User Info Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user?.name || 'Usuário'}</h2>
                <p className="text-gray-600">{user?.email}</p>
                <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${
                  user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {user?.role === 'ADMIN' ? '👑 Administrador' : '👤 Usuário'}
                </span>
              </div>
            </div>

            {/* Personal Information Form */}
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações Pessoais
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite seu nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
              <button
                onClick={handleUpdateProfile}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Alterar Senha
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Senha Atual</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite sua senha atual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nova Senha</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite a nova senha (mínimo 8 caracteres)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirmar Nova Senha</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite a nova senha novamente"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Dica de Segurança:</strong> Use uma senha forte com pelo menos 8 caracteres,
                  incluindo letras maiúsculas, minúsculas, números e símbolos.
                </p>
              </div>
              <button
                onClick={handleChangePassword}
                disabled={isSaving}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {isSaving ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="mt-6 bg-gray-100 rounded-lg p-4 text-sm text-gray-600">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Conta criada em:</strong>
                <br />
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '-'}
              </div>
              <div>
                <strong>Última atualização:</strong>
                <br />
                {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('pt-BR') : '-'}
              </div>
              <div>
                <strong>ID do Usuário:</strong>
                <br />
                <code className="text-xs">{user?.id || '-'}</code>
              </div>
              <div>
                <strong>Status da Conta:</strong>
                <br />
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                  user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user?.isActive ? '✓ Ativa' : '✗ Inativa'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
