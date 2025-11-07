/**
 * Flight Monitoring Service
 *
 * Sistema completo de monitoramento de voos com 3 camadas:
 * - Layer 1: GDS (Amadeus/Sabre)
 * - Layer 2: APIs Comerciais (AviationStack, FlightAware)
 * - Layer 3: Web Scraping (Sites de companhias aéreas)
 *
 * @module FlightMonitoringService
 */

import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { Queue, Job } from 'bull';
import { CacheLayer } from './cacheLayer';

// Types
export interface BookingReference {
  bookingReference: string;
  lastName: string;
  airline?: string;
  email?: string;
}

export interface FlightStatus {
  success: boolean;
  bookingReference: string;
  lastName: string;
  flight?: FlightDetails;
  status: string;
  source: 'GDS' | 'API' | 'SCRAPING' | 'CACHE';
  timestamp: Date;
  error?: string;
  metadata?: {
    searchStrategy?: 'CASCADE' | 'DIRECT';
    layerUsed?: 'GDS' | 'EXTERNAL_API' | 'WEB_SCRAPING' | 'CACHE' | 'NONE';
    attempts?: {
      gds: { tried: boolean; success: boolean; error: string | null; duration: number };
      externalAPI: { tried: boolean; success: boolean; error: string | null; duration: number };
      scraping: { tried: boolean; success: boolean; error: string | null; duration: number };
    };
    totalDuration?: number;
    retryAfter?: number;
    suggestion?: string;
  };
}

export interface FlightDetails {
  flightNumber: string;
  airline: string;
  airlineName: string;
  aircraft: string;
  status: 'SCHEDULED' | 'DELAYED' | 'CANCELLED' | 'BOARDING' | 'DEPARTED' | 'ARRIVED' | 'DIVERTED';

  // Departure
  departure: {
    airport: string;
    airportName: string;
    scheduledTime: Date;
    estimatedTime?: Date;
    actualTime?: Date;
    terminal?: string;
    gate?: string;
  };

  // Arrival
  arrival: {
    airport: string;
    airportName: string;
    scheduledTime: Date;
    estimatedTime?: Date;
    actualTime?: Date;
    terminal?: string;
    gate?: string;
  };

  // Delay info
  delay?: {
    minutes: number;
    reason?: string;
  };

  // Additional info
  passengers?: Array<{
    firstName: string;
    lastName: string;
    seat?: string;
    ticketNumber?: string;
  }>;

  bookingStatus?: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'CHECKIN_AVAILABLE';

  // Metadata
  lastUpdated: Date;
  rawData?: any;
}

export interface MonitoringOptions {
  intervalMinutes: number;
  notifyOnChange: boolean;
  notifyOnDelay: boolean;
  notifyOnGateChange: boolean;
  notifyChannels?: ('email' | 'sms' | 'push' | 'webhook')[];
  autoStop?: {
    afterDeparture?: boolean;
    afterMinutes?: number;
  };
}

export interface MonitoringJob {
  id: string;
  bookingReference: string;
  lastName: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';
  intervalMinutes: number;
  startedAt: Date;
  lastCheckAt?: Date;
  nextCheckAt?: Date;
  checksPerformed: number;
  changesDetected: number;
  currentFlightStatus?: FlightStatus;
  options: MonitoringOptions;
}

interface ParsedReservation {
  flightNumber: string;
  departureDate: Date;
  airline: string;
  airlineCode: string;
  routes: Array<{
    origin: string;
    destination: string;
    flightNumber: string;
    date: Date;
  }>;
  passengers: Array<{
    firstName: string;
    lastName: string;
    type: 'ADULT' | 'CHILD' | 'INFANT';
  }>;
  bookingClass: string;
  pnr: string;
  totalAmount?: number;
}

/**
 * Flight Monitoring Service
 * Orquestra as 3 camadas de busca de informações de voo
 */
export class FlightMonitoringService extends EventEmitter {
  private redis: Redis;
  private cacheLayer: CacheLayer;
  private monitoringQueue: Queue;
  private activeMonitors: Map<string, NodeJS.Timeout>;
  private cacheKeyPrefix = 'flight_monitor:';
  private historyKeyPrefix = 'flight_history:';
  private cacheTTL = 900; // 15 minutos

  // Layer services
  private gdsService?: any; // GDS Integration Service
  private apiService?: any; // Commercial APIs Service
  private scrapingService?: any; // Web Scraping Service

  constructor(
    redisClient: Redis,
    monitoringQueue: Queue,
    dependencies?: {
      gdsService?: any;
      apiService?: any;
      scrapingService?: any;
      cacheConfig?: any;
    }
  ) {
    super();
    this.redis = redisClient;
    this.monitoringQueue = monitoringQueue;
    this.activeMonitors = new Map();

    // Initialize CacheLayer
    this.cacheLayer = new CacheLayer(redisClient, dependencies?.cacheConfig);

    // Inject dependencies
    if (dependencies) {
      this.gdsService = dependencies.gdsService;
      this.apiService = dependencies.apiService;
      this.scrapingService = dependencies.scrapingService;
    }

    // Setup queue processors
    this.setupQueueProcessors();
  }

  /**
   * 1. Get Flight Status by Reservation
   * Busca status do voo usando referência da reserva e sobrenome
   * Agora com cache distribuído, locks e rate limiting
   */
  async getFlightStatusByReservation(
    bookingReference: string,
    lastName: string,
    options?: { airline?: string; useCache?: boolean; ip?: string; userId?: string }
  ): Promise<FlightStatus> {
    try {
      // 1. Check rate limit (if IP or userId provided)
      if (options?.ip) {
        const rateLimitInfo = await this.cacheLayer.checkRateLimit(options.ip, 'ip');
        if (rateLimitInfo.blocked) {
          return {
            success: false,
            bookingReference,
            lastName,
            status: 'RATE_LIMITED',
            source: 'CACHE',
            timestamp: new Date(),
            error: `Rate limit excedido. Tente novamente em ${Math.ceil((rateLimitInfo.resetAt.getTime() - Date.now()) / 1000)} segundos.`,
          };
        }
        await this.cacheLayer.incrementRateLimit(options.ip, 'ip');
      }

      // 2. Check cache first
      if (options?.useCache !== false) {
        const cached = await this.cacheLayer.get(bookingReference, lastName);
        if (cached) {
          console.log(`✅ Cache hit for ${bookingReference}`);
          return {
            ...cached.status,
            source: 'CACHE' as const,
          };
        }
      }

      // 3. Execute search with distributed lock to prevent duplicate requests
      const result = await this.cacheLayer.executeWithLock(
        bookingReference,
        lastName,
        async () => {
          // Double-check cache after acquiring lock
          const cachedAfterLock = await this.cacheLayer.get(bookingReference, lastName);
          if (cachedAfterLock && options?.useCache !== false) {
            return cachedAfterLock.status;
          }

          // Perform actual search across all layers
          console.log(`🔍 Cache miss for ${bookingReference}, searching...`);
          const searchResult = await this.searchAcrossAllLayers(bookingReference, lastName, options?.airline);

          // Cache successful results
          if (searchResult.success && searchResult.flight) {
            await this.cacheLayer.set(bookingReference, lastName, searchResult, {
              ttl: this.cacheTTL,
              attempts: 1,
            });

            // Add to history
            await this.cacheLayer.addToHistory(bookingReference, lastName, searchResult);
          }

          return searchResult;
        },
        { lockTTL: 30, maxWait: 45 }
      );

      return result;

    } catch (error) {
      console.error(`❌ Error getting flight status:`, error);

      return {
        success: false,
        bookingReference,
        lastName,
        status: 'ERROR',
        source: 'API',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 2. Search Across All Layers
   * Implementa busca em cascata com fallback automático:
   * Layer 1 (GDS) → Layer 2 (APIs) → Layer 3 (Scraping)
   *
   * Estratégia de fallback:
   * 1. Tenta GDS (Amadeus/Sabre) com PNR + lastName
   * 2. Se falhar, tenta API Externa com flight number + date (extraído)
   * 3. Se falhar, tenta Web Scraping com PNR + lastName
   * 4. Se tudo falhar, retorna erro estruturado com detalhes
   */
  async searchAcrossAllLayers(
    bookingReference: string,
    lastName: string,
    airline?: string
  ): Promise<FlightStatus> {
    console.log(`🔍 [Cascade Search] Starting for ${bookingReference} - ${lastName}`);

    const startTime = Date.now();
    const attempts = {
      gds: { tried: false, success: false, error: null as string | null, duration: 0 },
      externalAPI: { tried: false, success: false, error: null as string | null, duration: 0 },
      scraping: { tried: false, success: false, error: null as string | null, duration: 0 },
    };

    let extractedFlightInfo: {
      flightNumber?: string;
      date?: Date;
      airline?: string;
    } | null = null;

    // ========================================================================
    // LAYER 1: GDS (Amadeus/Sabre)
    // ========================================================================
    if (this.gdsService) {
      const layerStart = Date.now();
      attempts.gds.tried = true;

      try {
        console.log('📡 [Layer 1] Trying GDS (Amadeus/Sabre)...');
        const gdsResult = await this.searchViaGDS(bookingReference, lastName);

        attempts.gds.duration = Date.now() - layerStart;

        if (gdsResult.success && gdsResult.flight) {
          attempts.gds.success = true;
          console.log(`✅ [Layer 1] Found via GDS in ${attempts.gds.duration}ms`);

          // Extract flight info for potential Layer 2 fallback
          extractedFlightInfo = {
            flightNumber: gdsResult.flight.flightNumber,
            date: gdsResult.flight.departure.scheduledTime,
            airline: gdsResult.flight.airline,
          };

          return {
            ...gdsResult,
            metadata: {
              searchStrategy: 'CASCADE',
              layerUsed: 'GDS',
              attempts,
              totalDuration: Date.now() - startTime,
            },
          };
        } else {
          attempts.gds.error = gdsResult.error || 'No data returned';
          console.warn(`⚠️ [Layer 1] GDS returned no data: ${attempts.gds.error}`);
        }
      } catch (error) {
        attempts.gds.duration = Date.now() - layerStart;
        attempts.gds.error = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️ [Layer 1] GDS failed: ${attempts.gds.error}`);
      }
    } else {
      console.log('⏭️ [Layer 1] GDS service not configured, skipping');
    }

    // ========================================================================
    // LAYER 2: Commercial APIs (FlightStats, AviationStack, FlightAware)
    // ========================================================================
    if (this.apiService) {
      const layerStart = Date.now();
      attempts.externalAPI.tried = true;

      try {
        console.log('🌐 [Layer 2] Trying Commercial APIs...');

        // Strategy: Use extracted flight info from Layer 1 if available
        let apiResult: FlightStatus;

        if (extractedFlightInfo?.flightNumber && extractedFlightInfo?.date) {
          console.log(`   Using extracted flight info: ${extractedFlightInfo.flightNumber} on ${extractedFlightInfo.date.toISOString()}`);
          apiResult = await this.searchViaAPIs(
            extractedFlightInfo.flightNumber,
            extractedFlightInfo.date.toISOString(),
            extractedFlightInfo.airline
          );
        } else {
          // Fallback: Try with booking reference
          console.log(`   No extracted info, using booking reference: ${bookingReference}`);
          apiResult = await this.searchViaAPIs(bookingReference, lastName, airline);
        }

        attempts.externalAPI.duration = Date.now() - layerStart;

        if (apiResult.success && apiResult.flight) {
          attempts.externalAPI.success = true;
          console.log(`✅ [Layer 2] Found via Commercial APIs in ${attempts.externalAPI.duration}ms`);

          return {
            ...apiResult,
            metadata: {
              searchStrategy: 'CASCADE',
              layerUsed: 'EXTERNAL_API',
              attempts,
              totalDuration: Date.now() - startTime,
            },
          };
        } else {
          attempts.externalAPI.error = apiResult.error || 'No data returned';
          console.warn(`⚠️ [Layer 2] Commercial APIs returned no data: ${attempts.externalAPI.error}`);
        }
      } catch (error) {
        attempts.externalAPI.duration = Date.now() - layerStart;
        attempts.externalAPI.error = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️ [Layer 2] Commercial APIs failed: ${attempts.externalAPI.error}`);
      }
    } else {
      console.log('⏭️ [Layer 2] Commercial API service not configured, skipping');
    }

    // ========================================================================
    // LAYER 3: Web Scraping (Airline Websites)
    // ========================================================================
    if (this.scrapingService || airline) {
      const layerStart = Date.now();
      attempts.scraping.tried = true;

      try {
        console.log('🕷️ [Layer 3] Trying Web Scraping...');
        console.log(`   Using: PNR=${bookingReference}, lastName=${lastName}, airline=${airline || 'auto-detect'}`);

        const scrapingResult = await this.searchViaScraping(bookingReference, lastName, airline);

        attempts.scraping.duration = Date.now() - layerStart;

        if (scrapingResult.success && scrapingResult.flight) {
          attempts.scraping.success = true;
          console.log(`✅ [Layer 3] Found via Web Scraping in ${attempts.scraping.duration}ms`);

          return {
            ...scrapingResult,
            metadata: {
              searchStrategy: 'CASCADE',
              layerUsed: 'WEB_SCRAPING',
              attempts,
              totalDuration: Date.now() - startTime,
            },
          };
        } else {
          attempts.scraping.error = scrapingResult.error || 'No data returned';
          console.warn(`⚠️ [Layer 3] Web Scraping returned no data: ${attempts.scraping.error}`);
        }
      } catch (error) {
        attempts.scraping.duration = Date.now() - layerStart;
        attempts.scraping.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ [Layer 3] Web Scraping failed: ${attempts.scraping.error}`);
      }
    } else {
      console.log('⏭️ [Layer 3] Web Scraping not configured, skipping');
    }

    // ========================================================================
    // ALL LAYERS FAILED - Return Structured Error
    // ========================================================================
    const totalDuration = Date.now() - startTime;
    console.error(`❌ [Cascade Search] All layers failed after ${totalDuration}ms`);

    return {
      success: false,
      bookingReference,
      lastName,
      status: 'FLIGHT_STATUS_UNAVAILABLE',
      source: 'API',
      timestamp: new Date(),
      error: 'Não foi possível obter status do voo. Todas as fontes de dados falharam.',
      metadata: {
        searchStrategy: 'CASCADE',
        layerUsed: 'NONE',
        attempts,
        totalDuration,
        retryAfter: 300, // 5 minutos
        suggestion: 'Verifique se os dados da reserva estão corretos. Se o voo for muito recente ou muito antigo, pode não estar disponível em nossas fontes.',
      },
    };
  }

  /**
   * 3. Monitor Flight Continuous
   * Monitora voo continuamente com polling automático
   */
  async monitorFlightContinuous(
    bookingReference: string,
    lastName: string,
    options: MonitoringOptions
  ): Promise<MonitoringJob> {
    const monitorId = `${bookingReference}:${lastName}`;

    try {
      // Check if already monitoring
      if (this.activeMonitors.has(monitorId)) {
        throw new Error('Este voo já está sendo monitorado. Use updateMonitoring() para alterar configurações.');
      }

      // Create monitoring job
      const job: MonitoringJob = {
        id: monitorId,
        bookingReference,
        lastName,
        status: 'ACTIVE',
        intervalMinutes: options.intervalMinutes,
        startedAt: new Date(),
        checksPerformed: 0,
        changesDetected: 0,
        options,
      };

      // Initial check
      console.log(`🚀 Starting continuous monitoring for ${monitorId}`);
      const initialStatus = await this.getFlightStatusByReservation(bookingReference, lastName);
      job.currentFlightStatus = initialStatus;
      job.lastCheckAt = new Date();
      job.nextCheckAt = new Date(Date.now() + options.intervalMinutes * 60000);

      // Save to Redis
      await this.saveMonitoringJob(job);

      // Add to Bull queue for distributed processing
      await this.monitoringQueue.add(
        'check-flight',
        { monitorId, bookingReference, lastName },
        {
          repeat: {
            every: options.intervalMinutes * 60000, // Convert to milliseconds
          },
          jobId: monitorId,
        }
      );

      // Setup local interval (backup)
      this.setupLocalMonitoring(job);

      // Emit event
      this.emit('monitoring:started', job);

      return job;

    } catch (error) {
      console.error(`❌ Error starting monitoring:`, error);
      throw error;
    }
  }

  /**
   * Stop monitoring a flight
   */
  async stopMonitoring(bookingReference: string, lastName: string): Promise<boolean> {
    const monitorId = `${bookingReference}:${lastName}`;

    try {
      // Remove from local monitors
      const interval = this.activeMonitors.get(monitorId);
      if (interval) {
        clearInterval(interval);
        this.activeMonitors.delete(monitorId);
      }

      // Remove from Bull queue
      const job = await this.monitoringQueue.getJob(monitorId);
      if (job) {
        await job.remove();
      }

      // Update status in Redis
      const jobData = await this.getMonitoringJob(monitorId);
      if (jobData) {
        jobData.status = 'STOPPED';
        await this.saveMonitoringJob(jobData);
      }

      // Emit event
      this.emit('monitoring:stopped', { monitorId });

      console.log(`✅ Monitoring stopped for ${monitorId}`);
      return true;

    } catch (error) {
      console.error(`❌ Error stopping monitoring:`, error);
      return false;
    }
  }

  /**
   * 4. Parse Reservation Details
   * Extrai informações estruturadas de dados brutos de reserva
   */
  parseReservationDetails(bookingData: any): ParsedReservation {
    console.log('📋 Parsing reservation details...');

    try {
      // Handle different data formats
      const parsed: ParsedReservation = {
        flightNumber: '',
        departureDate: new Date(),
        airline: '',
        airlineCode: '',
        routes: [],
        passengers: [],
        bookingClass: '',
        pnr: '',
      };

      // Extract PNR/Booking Reference
      parsed.pnr = bookingData.bookingCode
        || bookingData.pnr
        || bookingData.reservationCode
        || bookingData.localizador
        || '';

      // Extract flights/routes
      if (bookingData.flights && Array.isArray(bookingData.flights)) {
        parsed.routes = bookingData.flights.map((flight: any) => ({
          origin: flight.origin || flight.departureAirport || '',
          destination: flight.destination || flight.arrivalAirport || '',
          flightNumber: flight.flightNumber || '',
          date: new Date(flight.departureDate || flight.date),
        }));

        // Primary flight
        if (bookingData.flights[0]) {
          parsed.flightNumber = bookingData.flights[0].flightNumber || '';
          parsed.departureDate = new Date(bookingData.flights[0].departureDate || bookingData.flights[0].date);
          parsed.airline = bookingData.flights[0].airline || bookingData.flights[0].airlineName || '';
          parsed.airlineCode = this.extractAirlineCode(parsed.flightNumber);
        }
      }

      // Extract passengers
      if (bookingData.passengers && Array.isArray(bookingData.passengers)) {
        parsed.passengers = bookingData.passengers.map((pax: any) => ({
          firstName: pax.firstName || pax.nome || '',
          lastName: pax.lastName || pax.sobrenome || '',
          type: pax.type || pax.tipo || 'ADULT',
        }));
      }

      // Extract booking class
      parsed.bookingClass = bookingData.bookingClass
        || bookingData.class
        || bookingData.cabinClass
        || 'ECONOMY';

      // Extract total amount
      parsed.totalAmount = bookingData.totalAmount
        || bookingData.amount
        || bookingData.price
        || undefined;

      console.log('✅ Reservation parsed successfully');
      return parsed;

    } catch (error) {
      console.error('❌ Error parsing reservation:', error);
      throw new Error(`Failed to parse reservation details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get monitoring job details
   */
  async getMonitoringJob(monitorId: string): Promise<MonitoringJob | null> {
    try {
      const key = `monitor:${monitorId}`;
      const data = await this.redis.get(key);

      if (!data) return null;

      const job = JSON.parse(data);

      // Parse dates
      job.startedAt = new Date(job.startedAt);
      if (job.lastCheckAt) job.lastCheckAt = new Date(job.lastCheckAt);
      if (job.nextCheckAt) job.nextCheckAt = new Date(job.nextCheckAt);

      return job;
    } catch (error) {
      console.error('Error getting monitoring job:', error);
      return null;
    }
  }

  /**
   * Alias for getMonitoringJob (used by controller and WebSocket)
   */
  async getMonitoringStatus(bookingReference: string, lastName: string): Promise<MonitoringJob | null> {
    const monitorId = `${bookingReference}:${lastName}`;
    return this.getMonitoringJob(monitorId);
  }

  /**
   * List all monitoring jobs
   */
  async listAllMonitoring(): Promise<MonitoringJob[]> {
    try {
      const keys = await this.redis.keys('monitor:*');
      const jobs: MonitoringJob[] = [];

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const job = JSON.parse(data);
          job.startedAt = new Date(job.startedAt);
          if (job.lastCheckAt) job.lastCheckAt = new Date(job.lastCheckAt);
          if (job.nextCheckAt) job.nextCheckAt = new Date(job.nextCheckAt);
          jobs.push(job);
        }
      }

      return jobs;
    } catch (error) {
      console.error('Error listing monitoring jobs:', error);
      return [];
    }
  }

  /**
   * Get flight history
   */
  async getFlightHistory(
    bookingReference: string,
    lastName: string,
    limit: number = 50
  ): Promise<FlightStatus[]> {
    try {
      const historyKey = `${this.historyKeyPrefix}${bookingReference}:${lastName}`;
      const history = await this.redis.lrange(historyKey, 0, limit - 1);

      return history.map(item => {
        const parsed = JSON.parse(item);
        return {
          ...parsed,
          timestamp: new Date(parsed.timestamp),
        };
      });
    } catch (error) {
      console.error('Error getting flight history:', error);
      return [];
    }
  }

  /**
   * List all active monitors
   */
  async listActiveMonitors(): Promise<MonitoringJob[]> {
    try {
      const keys = await this.redis.keys('monitor:*');
      const jobs: MonitoringJob[] = [];

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const job = JSON.parse(data);
          if (job.status === 'ACTIVE') {
            jobs.push(job);
          }
        }
      }

      return jobs;
    } catch (error) {
      console.error('Error listing monitors:', error);
      return [];
    }
  }

  // ============================================================================
  // PRIVATE METHODS - Layer Implementations
  // ============================================================================

  /**
   * Search via GDS (Layer 1)
   * Amadeus, Sabre, etc
   */
  private async searchViaGDS(
    bookingReference: string,
    lastName: string
  ): Promise<FlightStatus> {
    if (!this.gdsService) {
      throw new Error('GDS Service not configured');
    }

    // TODO: Implement actual GDS integration
    // This is a placeholder for Amadeus/Sabre integration
    console.log('🔍 Searching via GDS...');

    throw new Error('GDS integration not yet implemented');
  }

  /**
   * Search via Commercial APIs (Layer 2)
   * AviationStack, FlightAware, FlightRadar24
   */
  private async searchViaAPIs(
    bookingReference: string,
    lastName: string,
    airline?: string
  ): Promise<FlightStatus> {
    if (!this.apiService) {
      // Use existing services
      const { getAirlineBookingService } = require('../airline-booking.service');
      const airlineService = getAirlineBookingService();

      const result = await airlineService.searchBooking({
        localizador: bookingReference,
        sobrenome: lastName,
        origem: '', // Will be extracted if available
      });

      if (result) {
        return this.convertToFlightStatus(result, 'API');
      }
    }

    throw new Error('No flight data found via APIs');
  }

  /**
   * Search via Web Scraping (Layer 3)
   * Direct scraping of airline websites
   */
  private async searchViaScraping(
    bookingReference: string,
    lastName: string,
    airline?: string
  ): Promise<FlightStatus> {
    // Use existing scraper service
    const { getAirlineBookingService } = require('../airline-booking.service');
    const airlineService = getAirlineBookingService();

    const result = await airlineService.searchBooking({
      localizador: bookingReference,
      sobrenome: lastName,
      origem: '', // Some airlines require origin airport
    });

    if (result) {
      return this.convertToFlightStatus(result, 'SCRAPING');
    }

    throw new Error('No flight data found via scraping');
  }

  /**
   * Setup queue processors
   */
  private setupQueueProcessors(): void {
    this.monitoringQueue.process('check-flight', async (job: Job) => {
      const { monitorId, bookingReference, lastName } = job.data;

      try {
        await this.performMonitoringCheck(monitorId, bookingReference, lastName);
      } catch (error) {
        console.error(`❌ Error processing monitoring job ${monitorId}:`, error);
        throw error;
      }
    });
  }

  /**
   * Setup local monitoring (backup to queue)
   */
  private setupLocalMonitoring(job: MonitoringJob): void {
    const interval = setInterval(async () => {
      try {
        await this.performMonitoringCheck(job.id, job.bookingReference, job.lastName);
      } catch (error) {
        console.error(`❌ Local monitoring error for ${job.id}:`, error);
      }
    }, job.intervalMinutes * 60000);

    this.activeMonitors.set(job.id, interval);
  }

  /**
   * Perform a monitoring check
   */
  private async performMonitoringCheck(
    monitorId: string,
    bookingReference: string,
    lastName: string
  ): Promise<void> {
    console.log(`🔍 Performing check for ${monitorId}`);

    const job = await this.getMonitoringJob(monitorId);
    if (!job || job.status !== 'ACTIVE') {
      console.log(`⏸️ Monitor ${monitorId} is not active, skipping check`);
      return;
    }

    // Get current status
    const currentStatus = await this.getFlightStatusByReservation(
      bookingReference,
      lastName,
      { useCache: false }
    );

    // Update job
    job.checksPerformed++;
    job.lastCheckAt = new Date();
    job.nextCheckAt = new Date(Date.now() + job.intervalMinutes * 60000);

    // Compare with previous status
    let changes: string[] = [];
    if (job.currentFlightStatus) {
      changes = this.detectChanges(job.currentFlightStatus, currentStatus);

      if (changes.length > 0) {
        job.changesDetected++;
        console.log(`🔔 Changes detected for ${monitorId}:`, changes);

        // Send notifications
        await this.sendNotifications(job, currentStatus, changes);

        // Emit event
        this.emit('flight:changed', {
          job,
          previousStatus: job.currentFlightStatus,
          currentStatus,
          changes,
        });
      }
    }

    // Update current status
    job.currentFlightStatus = currentStatus;

    // Save history using CacheLayer
    const changesArray = changes.length > 0 ? changes : undefined;
    await this.cacheLayer.addToHistory(bookingReference, lastName, currentStatus, changesArray);

    // Save job
    await this.saveMonitoringJob(job);

    // Check auto-stop conditions
    if (job.options.autoStop) {
      if (await this.shouldAutoStop(job, currentStatus)) {
        console.log(`⏹️ Auto-stopping monitoring for ${monitorId}`);
        await this.stopMonitoring(bookingReference, lastName);
      }
    }
  }

  /**
   * Detect changes between flight statuses
   */
  private detectChanges(previous: FlightStatus, current: FlightStatus): string[] {
    const changes: string[] = [];

    if (!previous.flight || !current.flight) return changes;

    const prev = previous.flight;
    const curr = current.flight;

    // Status change
    if (prev.status !== curr.status) {
      changes.push(`Status mudou de ${prev.status} para ${curr.status}`);
    }

    // Delay
    if (prev.delay?.minutes !== curr.delay?.minutes) {
      if (curr.delay && curr.delay.minutes > 0) {
        changes.push(`Voo atrasado: ${curr.delay.minutes} minutos`);
      }
    }

    // Gate change
    if (prev.departure.gate !== curr.departure.gate) {
      changes.push(`Portão alterado de ${prev.departure.gate || 'N/A'} para ${curr.departure.gate || 'N/A'}`);
    }

    // Terminal change
    if (prev.departure.terminal !== curr.departure.terminal) {
      changes.push(`Terminal alterado de ${prev.departure.terminal || 'N/A'} para ${curr.departure.terminal || 'N/A'}`);
    }

    // Time changes
    if (prev.departure.estimatedTime?.getTime() !== curr.departure.estimatedTime?.getTime()) {
      changes.push(`Horário de partida estimado alterado`);
    }

    return changes;
  }

  /**
   * Send notifications
   */
  private async sendNotifications(
    job: MonitoringJob,
    status: FlightStatus,
    changes: string[]
  ): Promise<void> {
    if (!job.options.notifyOnChange) return;

    // Filter changes based on notification preferences
    const relevantChanges = changes.filter(change => {
      if (change.includes('atrasado') && !job.options.notifyOnDelay) return false;
      if (change.includes('Portão') && !job.options.notifyOnGateChange) return false;
      return true;
    });

    if (relevantChanges.length === 0) return;

    // TODO: Implement actual notification sending
    // For now, just log
    console.log(`📧 Sending notifications for ${job.id}:`, relevantChanges);

    // Emit notification event
    this.emit('notification:send', {
      job,
      status,
      changes: relevantChanges,
      channels: job.options.notifyChannels || ['email'],
    });
  }

  /**
   * Check if monitoring should auto-stop
   */
  private async shouldAutoStop(job: MonitoringJob, status: FlightStatus): Promise<boolean> {
    if (!job.options.autoStop) return false;

    // Stop after departure
    if (job.options.autoStop.afterDeparture && status.flight?.status === 'DEPARTED') {
      return true;
    }

    // Stop after time limit
    if (job.options.autoStop.afterMinutes) {
      const elapsedMinutes = (Date.now() - job.startedAt.getTime()) / 60000;
      if (elapsedMinutes >= job.options.autoStop.afterMinutes) {
        return true;
      }
    }

    return false;
  }

  /**
   * Save monitoring job to Redis
   */
  private async saveMonitoringJob(job: MonitoringJob): Promise<void> {
    const key = `monitor:${job.id}`;
    await this.redis.set(key, JSON.stringify(job));
  }

  /**
   * Save to history
   */
  private async saveToHistory(
    bookingReference: string,
    lastName: string,
    status: FlightStatus
  ): Promise<void> {
    const historyKey = `${this.historyKeyPrefix}${bookingReference}:${lastName}`;

    // Add to list (newest first)
    await this.redis.lpush(historyKey, JSON.stringify(status));

    // Trim to keep only last 100 entries
    await this.redis.ltrim(historyKey, 0, 99);

    // Set expiry (30 days)
    await this.redis.expire(historyKey, 30 * 24 * 60 * 60);
  }

  /**
   * Convert booking data to FlightStatus
   */
  private convertToFlightStatus(data: any, source: 'GDS' | 'API' | 'SCRAPING'): FlightStatus {
    // This is a helper to convert various data formats to our standard FlightStatus
    // Implementation depends on the actual data structure from each source

    return {
      success: true,
      bookingReference: data.bookingCode || data.pnr || '',
      lastName: data.passengerName || '',
      status: 'FOUND',
      source,
      timestamp: new Date(),
      flight: data.flights?.[0] ? {
        flightNumber: data.flights[0].flightNumber,
        airline: data.flights[0].airline,
        airlineName: data.flights[0].airlineName || data.flights[0].airline,
        aircraft: data.flights[0].aircraft || 'N/A',
        status: data.flights[0].status || 'SCHEDULED',
        departure: {
          airport: data.flights[0].origin,
          airportName: data.flights[0].originName || data.flights[0].origin,
          scheduledTime: new Date(data.flights[0].departureTime),
          terminal: data.flights[0].departureTerminal,
          gate: data.flights[0].departureGate,
        },
        arrival: {
          airport: data.flights[0].destination,
          airportName: data.flights[0].destinationName || data.flights[0].destination,
          scheduledTime: new Date(data.flights[0].arrivalTime),
          terminal: data.flights[0].arrivalTerminal,
          gate: data.flights[0].arrivalGate,
        },
        lastUpdated: new Date(),
      } : undefined,
    };
  }

  /**
   * Extract airline code from flight number
   */
  private extractAirlineCode(flightNumber: string): string {
    const match = flightNumber.match(/^([A-Z]{2})/);
    return match ? match[1] : '';
  }

  /**
   * Cleanup
   */
  // ============================================================================
  // CACHE & HISTORY HELPER METHODS
  // ============================================================================

  /**
   * Get flight history from cache
   */
  async getFlightHistory(
    bookingReference: string,
    lastName: string,
    limit?: number
  ) {
    return this.cacheLayer.getHistory(bookingReference, lastName, limit);
  }

  /**
   * Get detected changes from history
   */
  async getFlightChanges(
    bookingReference: string,
    lastName: string
  ) {
    return this.cacheLayer.getChanges(bookingReference, lastName);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return this.cacheLayer.getStats();
  }

  /**
   * Clear cache for specific booking
   */
  async clearCache(
    bookingReference: string,
    lastName: string
  ): Promise<boolean> {
    return this.cacheLayer.delete(bookingReference, lastName);
  }

  /**
   * Check rate limit status for identifier
   */
  async checkRateLimit(identifier: string, type: 'ip' | 'user' = 'ip') {
    return this.cacheLayer.checkRateLimit(identifier, type);
  }

  /**
   * Reset rate limit for identifier
   */
  async resetRateLimit(identifier: string, type: 'ip' | 'user' = 'ip') {
    return this.cacheLayer.resetRateLimit(identifier, type);
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Flight Monitoring Service...');

    // Stop all local monitors
    for (const [monitorId, interval] of this.activeMonitors.entries()) {
      clearInterval(interval);
      console.log(`Stopped local monitor: ${monitorId}`);
    }

    this.activeMonitors.clear();

    // Close queue
    await this.monitoringQueue.close();

    console.log('✅ Cleanup complete');
  }
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

let serviceInstance: FlightMonitoringService | null = null;

/**
 * Get or create FlightMonitoringService instance
 */
export function getFlightMonitoringService(
  redisClient?: Redis,
  monitoringQueue?: Queue,
  dependencies?: {
    gdsService?: any;
    apiService?: any;
    scrapingService?: any;
  }
): FlightMonitoringService {
  if (!serviceInstance) {
    if (!redisClient || !monitoringQueue) {
      throw new Error('FlightMonitoringService requires Redis and Queue instances on first initialization');
    }

    serviceInstance = new FlightMonitoringService(redisClient, monitoringQueue, dependencies);
  }

  return serviceInstance;
}

/**
 * Reset service instance (for testing)
 */
export function resetFlightMonitoringService(): void {
  if (serviceInstance) {
    serviceInstance.cleanup();
  }
  serviceInstance = null;
}

export default FlightMonitoringService;
