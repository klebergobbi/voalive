'use client';

import { useState, useEffect } from 'react';
import { Button } from '@reservasegura/ui';
import Link from 'next/link';

interface AirlineAccount {
  id: string;
  airline: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  lastSyncAt: string | null;
  createdAt: string;
}

export default function AirlineAccountsPage() {
  const [accounts, setAccounts] = useState<AirlineAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [airline, setAirline] = useState('GOL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/booking-monitor/accounts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setAccounts(result.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar contas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/booking-monitor/connect-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ airline, email, password })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Conta conectada com sucesso!');
        setShowAddModal(false);
        setEmail('');
        setPassword('');
        loadAccounts();
      } else {
        setError(result.error || 'Erro ao conectar conta');
      }
    } catch (err: any) {
      setError('Erro ao conectar com o servidor');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Deseja realmente desconectar esta conta?')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/booking-monitor/disconnect/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Conta desconectada');
        loadAccounts();
      } else {
        alert('❌ Erro ao desconectar conta');
      }
    } catch (err) {
      alert('❌ Erro ao conectar com o servidor');
      console.error(err);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR');
  };

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
              <h1 className="text-2xl font-bold">🔗 Contas de Companhias Aéreas</h1>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <span className="mr-2">➕</span>
              Conectar Nova Conta
            </Button>
          </div>

          <p className="text-gray-600">
            Conecte suas contas das companhias aéreas para monitoramento automático de reservas e detecção de mudanças.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Como Funciona:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✅ Conecte sua conta da companhia aérea (GOL, LATAM, AZUL)</li>
            <li>✅ O sistema fará login automaticamente a cada hora</li>
            <li>✅ Todas as suas reservas serão sincronizadas</li>
            <li>✅ Mudanças de voo, horário, assento e portão serão detectadas</li>
            <li>✅ Você receberá notificações em tempo real</li>
          </ul>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-lg">Carregando contas...</p>
            </div>
          </div>
        )}

        {/* Lista de Contas */}
        {!loading && accounts.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg mb-4">
              Nenhuma conta conectada ainda
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Conectar Primeira Conta
            </Button>
          </div>
        )}

        {!loading && accounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                      ✈️
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{account.airline}</h3>
                      <p className="text-sm text-gray-500">{account.email}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      account.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {account.isActive ? '✓ Ativa' : '✗ Inativa'}
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Último login:</span>
                    <span className="font-medium">
                      {formatDate(account.lastLoginAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Última sincronização:</span>
                    <span className="font-medium">
                      {formatDate(account.lastSyncAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Conectada em:</span>
                    <span className="font-medium">
                      {formatDate(account.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      // Sincronizar agora
                      alert('Funcionalidade em desenvolvimento');
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-sm"
                  >
                    🔄 Sincronizar
                  </Button>
                  <Button
                    onClick={() => handleDisconnect(account.id)}
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 text-sm"
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Adicionar Conta */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">➕ Conectar Nova Conta</h2>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Companhia Aérea
                </label>
                <select
                  value={airline}
                  onChange={(e) => setAirline(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="GOL">GOL Linhas Aéreas</option>
                  <option value="LATAM">LATAM Airlines</option>
                  <option value="AZUL">Azul Linhas Aéreas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email / CPF
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com ou CPF"
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha do site da companhia"
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">❌ {error}</p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-xs text-yellow-800">
                  <strong>⚠️ Segurança:</strong> Sua senha é criptografada e usada apenas para fazer login automático no site da companhia para buscar suas reservas.
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Conectando...
                    </div>
                  ) : (
                    'Conectar'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
