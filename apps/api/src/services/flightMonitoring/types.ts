/**
 * Flight Monitoring Types
 * Definições de tipos compartilhados
 */

export type FlightStatusCode =
  | 'SCHEDULED'
  | 'DELAYED'
  | 'CANCELLED'
  | 'BOARDING'
  | 'DEPARTED'
  | 'IN_FLIGHT'
  | 'ARRIVED'
  | 'DIVERTED'
  | 'UNKNOWN';

export type BookingStatusCode =
  | 'CONFIRMED'
  | 'PENDING'
  | 'CANCELLED'
  | 'CHECKIN_AVAILABLE'
  | 'CHECKED_IN'
  | 'BOARDED';

export type AirlineCode =
  | 'G3' // GOL
  | 'LA' // LATAM
  | 'AD' // Azul
  | 'AV' // Avianca
  | 'CM' // Copa Airlines
  | 'TP' // TAP Portugal
  | string; // Allow any airline code

export type NotificationChannel =
  | 'email'
  | 'sms'
  | 'push'
  | 'webhook'
  | 'websocket';

export type MonitoringStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'STOPPED'
  | 'ERROR'
  | 'COMPLETED';

export type DataSource =
  | 'GDS' // Amadeus, Sabre
  | 'API' // Commercial APIs
  | 'SCRAPING' // Web scraping
  | 'CACHE' // Redis cache
  | 'MANUAL'; // Manual entry

export type PassengerType =
  | 'ADULT'
  | 'CHILD'
  | 'INFANT'
  | 'SENIOR';

export type CabinClass =
  | 'ECONOMY'
  | 'PREMIUM_ECONOMY'
  | 'BUSINESS'
  | 'FIRST';

export type ChangeType =
  | 'STATUS_CHANGE'
  | 'DELAY'
  | 'GATE_CHANGE'
  | 'TERMINAL_CHANGE'
  | 'TIME_CHANGE'
  | 'CANCELLATION'
  | 'AIRCRAFT_CHANGE';

/**
 * Airport information
 */
export interface Airport {
  code: string; // IATA code (3 letters)
  icao?: string; // ICAO code (4 letters)
  name: string;
  city: string;
  country: string;
  timezone: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Airline information
 */
export interface Airline {
  code: string; // IATA code (2 letters)
  icao?: string; // ICAO code (3 letters)
  name: string;
  country: string;
  website?: string;
  checkInUrl?: string;
}

/**
 * Flight leg (for multi-leg journeys)
 */
export interface FlightLeg {
  flightNumber: string;
  origin: Airport | string;
  destination: Airport | string;
  departureTime: Date;
  arrivalTime: Date;
  duration?: number; // in minutes
  aircraft?: string;
  status: FlightStatusCode;
}

/**
 * Change detection result
 */
export interface FlightChange {
  type: ChangeType;
  field: string;
  oldValue: any;
  newValue: any;
  description: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Notification payload
 */
export interface Notification {
  id: string;
  type: ChangeType;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  channels: NotificationChannel[];
  recipient: {
    email?: string;
    phone?: string;
    deviceToken?: string;
    webhookUrl?: string;
  };
  metadata: {
    bookingReference: string;
    flightNumber: string;
    changes: FlightChange[];
  };
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

/**
 * Search options
 */
export interface SearchOptions {
  airline?: AirlineCode;
  useCache?: boolean;
  timeout?: number; // in milliseconds
  preferredSource?: DataSource;
  includePricing?: boolean;
  includeSeats?: boolean;
}

/**
 * Monitoring statistics
 */
export interface MonitoringStats {
  totalMonitors: number;
  activeMonitors: number;
  pausedMonitors: number;
  totalChecks: number;
  totalChanges: number;
  averageCheckInterval: number;
  lastCheckAt?: Date;
  cacheHitRate: number;
  errorRate: number;
  sourceUsage: {
    gds: number;
    api: number;
    scraping: number;
    cache: number;
  };
}

/**
 * Historical snapshot
 */
export interface HistoricalSnapshot {
  timestamp: Date;
  status: FlightStatusCode;
  delay?: number;
  gate?: string;
  terminal?: string;
  estimatedDeparture?: Date;
  actualDeparture?: Date;
  source: DataSource;
}

/**
 * Error details
 */
export interface MonitoringError {
  code: string;
  message: string;
  timestamp: Date;
  source: DataSource;
  recoverable: boolean;
  retryCount: number;
  details?: any;
}

/**
 * Rate limiting info
 */
export interface RateLimitInfo {
  source: DataSource;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}
