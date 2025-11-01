const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

class AuthService {
  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  setTokens(token: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Erro ao registrar');
    }

    const result = await response.json();

    if (result.success && result.data) {
      const token = result.data.token;
      // Store only single token (no refreshToken in our implementation)
      this.setTokens(token, ''); // Pass empty string for refreshToken

      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(result.data.user));
        localStorage.setItem('auth_token', token);
      }

      return { ...result.data, refreshToken: '' };
    }

    throw new Error('Registration failed');
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Erro ao fazer login');
    }

    const result = await response.json();

    if (result.success && result.data) {
      const token = result.data.token;
      this.setTokens(token, '');

      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(result.data.user));
        localStorage.setItem('auth_token', token);
      }

      return { ...result.data, refreshToken: '' };
    }

    throw new Error('Login failed');
  }

  async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
        });
      }
    } finally {
      this.clearTokens();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
    }
  }

  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Failed to refresh token');
    }

    const result = await response.json();
    this.setTokens(result.token, result.refreshToken);

    return result.token;
  }

  async getCurrentUser(): Promise<User | null> {
    if (typeof window === 'undefined') return null;

    const token = this.getToken() || localStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        this.clearTokens();
        return null;
      }

      const result = await response.json();

      if (result.success && result.data) {
        localStorage.setItem('user', JSON.stringify(result.data));
        return result.data;
      }

      return null;
    } catch (error) {
      this.clearTokens();
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
