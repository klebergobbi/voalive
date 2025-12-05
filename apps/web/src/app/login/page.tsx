'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, Eye, EyeOff, Plane } from 'lucide-react';
import Image from 'next/image';

// Componente do Logotipo Reserva Segura
function ReservaSeguraLogo() {
  return (
    <div className="flex flex-col items-center">
      {/* Logo Shield with Plane */}
      <div className="relative mb-4">
        <svg width="100" height="120" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shield Background - Gradient */}
          <defs>
            <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#12295B" />
              <stop offset="50%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          {/* Shield Shape */}
          <path
            d="M50 5 L85 20 L85 50 Q85 85 50 110 Q15 85 15 50 L15 20 Z"
            fill="url(#shieldGradient)"
            stroke="none"
          />

          {/* Airplane Icon */}
          <g transform="translate(50, 55) rotate(-45)">
            <path
              d="M0,-15 L-3,-10 L-12,-8 L-12,-5 L-3,-7 L-3,8 L-6,10 L-6,12 L0,11 L6,12 L6,10 L3,8 L3,-7 L12,-5 L12,-8 L3,-10 Z"
              fill="white"
              stroke="white"
              strokeWidth="0.5"
            />
          </g>
        </svg>
      </div>

      {/* Text Logo */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-blue-900">
          RESERVA SEGURA
        </h1>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const apiUrl = (typeof window !== 'undefined' && (window as any).__ENV__?.NEXT_PUBLIC_API_URL) ||
                     process.env.NEXT_PUBLIC_API_URL ||
                     (typeof window !== 'undefined' && window.location.origin.includes('159.89.80.179')
                       ? 'http://159.89.80.179:3012'
                       : 'http://localhost:4000');
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao fazer login');
      }

      // Salvar token e dados do usuário no localStorage
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      // Redirecionar para o dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center mb-6">
              <ReservaSeguraLogo />
            </div>
          </div>

          {/* Login Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent sm:text-sm"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent sm:text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-900 to-cyan-600 hover:from-blue-800 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Entrando...
                  </div>
                ) : (
                  <span className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Entrar com Segurança
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Security Badge */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-50 border border-green-200">
              <Shield className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-xs font-medium text-green-800">
                Conexão Segura • SSL Criptografado
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Decorative Background */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600">
        <div className="absolute inset-0 opacity-10">
          {/* Decorative Grid Pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="relative h-full flex flex-col items-center justify-center p-12 text-white">
          <div className="max-w-md text-center space-y-8">
            {/* Large Logo */}
            <div className="mx-auto transform hover:scale-105 transition-transform duration-300">
              <svg width="150" height="180" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="shieldGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
                    <stop offset="100%" stopColor="rgba(6,182,212,0.3)" />
                  </linearGradient>
                </defs>

                <path
                  d="M50 5 L85 20 L85 50 Q85 85 50 110 Q15 85 15 50 L15 20 Z"
                  fill="url(#shieldGradient2)"
                  stroke="white"
                  strokeWidth="2"
                />

                <g transform="translate(50, 55) rotate(-45)">
                  <path
                    d="M0,-15 L-3,-10 L-12,-8 L-12,-5 L-3,-7 L-3,8 L-6,10 L-6,12 L0,11 L6,12 L6,10 L3,8 L3,-7 L12,-5 L12,-8 L3,-10 Z"
                    fill="white"
                    stroke="white"
                    strokeWidth="0.5"
                  />
                </g>
              </svg>
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h2 className="text-5xl font-bold">
                Reserva Segura
              </h2>
              <p className="text-lg text-cyan-50/80 mt-4">
                Sistema de monitoramento e gerenciamento de reservas aéreas
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4 mt-12 text-left">
              <div className="flex items-start space-x-3 bg-white/5 backdrop-blur-sm p-4 rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Monitoramento em Tempo Real</h3>
                  <p className="text-sm text-cyan-100">Acompanhe suas reservas 24/7 com atualizações instantâneas</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-white/5 backdrop-blur-sm p-4 rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Notificações Inteligentes</h3>
                  <p className="text-sm text-cyan-100">Alertas automáticos de mudanças de voo e portão</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-white/5 backdrop-blur-sm p-4 rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Segurança Máxima</h3>
                  <p className="text-sm text-cyan-100">Criptografia de ponta a ponta para seus dados</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
