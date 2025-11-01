import { Flight } from '@reservasegura/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    if (token) {
      return {
        'Authorization': `Bearer ${token}`
      };
    }

    return {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Flight Scraping Methods
  async scrapeFlight(flightNumber: string, date?: string) {
    return this.request('/api/v1/flight-scraper/scrape/flight', {
      method: 'POST',
      body: JSON.stringify({
        flightNumber,
        date: date || new Date().toISOString().split('T')[0]
      }),
    });
  }

  async scrapeAirport(airportCode: string, date?: string) {
    return this.request('/api/v1/flight-scraper/scrape/airport', {
      method: 'POST',
      body: JSON.stringify({
        airportCode,
        date: date || new Date().toISOString().split('T')[0]
      }),
    });
  }

  async getFlightData(flightNumber: string) {
    return this.request(`/api/v1/flight-scraper/flights/${flightNumber}`);
  }

  async getAirportFlights(airportCode: string) {
    return this.request(`/api/v1/flight-scraper/airports/${airportCode}/flights`);
  }

  async searchFlights(params: {
    origin?: string;
    destination?: string;
    date?: string;
    airline?: string;
  }) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    return this.request(`/api/v1/flight-scraper/flights/search?${queryParams.toString()}`);
  }

  async getRecentFlights() {
    return this.request('/api/v1/flight-scraper/flights/recent');
  }

  async startScheduler() {
    return this.request('/api/v1/flight-scraper/scheduler/start', {
      method: 'POST',
    });
  }

  async stopScheduler() {
    return this.request('/api/v1/flight-scraper/scheduler/stop', {
      method: 'POST',
    });
  }

  async getStats() {
    return this.request('/api/v1/flight-scraper/stats');
  }

  // Health Methods
  async getHealth() {
    return this.request('/health');
  }

  async getDetailedHealth() {
    return this.request('/health/detailed');
  }

  async getHealthHistory(hours: number = 24) {
    return this.request(`/health/history?hours=${hours}`);
  }

  async getMetrics() {
    return this.request('/api/metrics');
  }

  // Airline Booking Methods
  async searchBooking(localizador: string, sobrenome: string, origem?: string) {
    return this.request('/api/v1/airline-booking/search-booking', {
      method: 'POST',
      body: JSON.stringify({
        localizador,
        sobrenome,
        origem
      }),
    });
  }

  async validateLocalizador(localizador: string) {
    return this.request('/api/v1/airline-booking/validate-localizador', {
      method: 'POST',
      body: JSON.stringify({
        localizador
      }),
    });
  }

  async getAirlines() {
    return this.request('/api/v1/airline-booking/airlines');
  }

  // Flight Search Methods (Real-time APIs)
  async searchRealFlight(flightNumber: string, date?: string) {
    return this.request('/api/v1/flight-search/search', {
      method: 'POST',
      body: JSON.stringify({
        flightNumber: flightNumber.toUpperCase().trim(),
        date
      }),
    });
  }

  async searchFlightsByAirport(airportCode: string, type: 'departures' | 'arrivals' = 'departures') {
    return this.request(`/api/v1/flight-search/airport/${airportCode}?type=${type}`);
  }

  async searchFlightsByRoute(origin: string, destination: string, date?: string) {
    const queryParams = new URLSearchParams({
      origin,
      destination,
      ...(date && { date })
    });
    return this.request(`/api/v1/flight-search/route?${queryParams.toString()}`);
  }

  async searchLiveFlights(params?: { airline?: string; country?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.airline) queryParams.append('airline', params.airline);
    if (params?.country) queryParams.append('country', params.country);

    const query = queryParams.toString();
    return this.request(`/api/v1/flight-search/live${query ? `?${query}` : ''}`);
  }

  // Flight CRUD Methods (Database)
  async getAllFlights(filters?: {
    status?: string;
    airline?: string;
    origin?: string;
    destination?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    return this.request(`/api/flights${query ? `?${query}` : ''}`);
  }

  async getFlightById(id: string) {
    return this.request(`/api/flights/${id}`);
  }

  async createFlight(flightData: any) {
    return this.request('/api/flights', {
      method: 'POST',
      body: JSON.stringify(flightData),
    });
  }

  async updateFlight(id: string, flightData: any) {
    return this.request(`/api/flights/${id}`, {
      method: 'PUT',
      body: JSON.stringify(flightData),
    });
  }

  async deleteFlight(id: string) {
    return this.request(`/api/flights/${id}`, {
      method: 'DELETE',
    });
  }

  async getFlightStats() {
    return this.request('/api/flights/stats');
  }

  // Authentication Methods
  async register(email: string, password: string, name?: string) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string) {
    const response = await this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store token in localStorage
    if (response.success && response.data?.token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', response.data.token);
      }
    }

    return response;
  }

  async logout() {
    const response = await this.request('/api/auth/logout', {
      method: 'POST',
    });

    // Remove token from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }

    return response;
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  // Helper to check if user is logged in
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('auth_token');
  }

  // Helper to get stored token
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  // Booking Methods
  async getAllBookings(filters?: {
    status?: string;
    paymentStatus?: string;
    flightId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    return this.request(`/api/bookings${query ? `?${query}` : ''}`);
  }

  async getBookingById(id: string) {
    return this.request(`/api/bookings/${id}`);
  }

  async createBooking(bookingData: {
    flightId: string;
    passengers: Array<{
      firstName: string;
      lastName: string;
      documentType: string;
      documentNumber: string;
      dateOfBirth: string;
      nationality?: string;
    }>;
    totalAmount: number;
  }) {
    return this.request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async updateBooking(id: string, bookingData: any) {
    return this.request(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookingData),
    });
  }

  async cancelBooking(id: string) {
    return this.request(`/api/bookings/${id}`, {
      method: 'DELETE',
    });
  }

  async getBookingStats() {
    return this.request('/api/bookings/stats');
  }

  // Transaction Methods
  async getAllTransactions(filters?: {
    status?: string;
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const query = queryParams.toString();
    return this.request(`/api/transactions${query ? `?${query}` : ''}`);
  }

  async getTransactionById(id: string) {
    return this.request(`/api/transactions/${id}`);
  }

  async createTransaction(transactionData: {
    bookingId: string;
    paymentMethod: string;
    paymentProvider?: string;
    metadata?: any;
  }) {
    return this.request('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  async confirmTransaction(id: string, metadata?: any) {
    return this.request(`/api/transactions/${id}/confirm`, {
      method: 'PUT',
      body: JSON.stringify({ metadata }),
    });
  }

  async failTransaction(id: string, reason?: string) {
    return this.request(`/api/transactions/${id}/fail`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  async getTransactionStats() {
    return this.request('/api/transactions/stats');
  }
}

export const apiService = new ApiService();

// React Query Keys
export const queryKeys = {
  flights: {
    all: ['flights'] as const,
    search: (params: any) => ['flights', 'search', params] as const,
    recent: () => ['flights', 'recent'] as const,
    byNumber: (flightNumber: string) => ['flights', flightNumber] as const,
    byAirport: (airportCode: string) => ['flights', 'airport', airportCode] as const,
  },
  booking: {
    search: (localizador: string, sobrenome: string) => ['booking', 'search', localizador, sobrenome] as const,
    validate: (localizador: string) => ['booking', 'validate', localizador] as const,
    airlines: () => ['booking', 'airlines'] as const,
  },
  health: {
    status: () => ['health'] as const,
    detailed: () => ['health', 'detailed'] as const,
    history: (hours: number) => ['health', 'history', hours] as const,
  },
  stats: () => ['stats'] as const,
  metrics: () => ['metrics'] as const,
} as const;