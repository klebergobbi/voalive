import * as cron from 'node-cron';
// DataSource and JobStatus constants
const DataSource = {
  FLIGHTRADAR24: 'FLIGHTRADAR24',
  FLIGHTAWARE: 'FLIGHTAWARE',
  MANUAL: 'MANUAL'
} as const;

const JobStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
} as const;

type DataSource = typeof DataSource[keyof typeof DataSource];
type JobStatus = typeof JobStatus[keyof typeof JobStatus];
import { prisma } from '@reservasegura/database';
import { FlightRadar24Service } from './flightradar24.service';
import { FlightAwareService } from './flightaware.service';

export interface ScrapingConfig {
  airports: string[];
  updateInterval: string; // cron expression
  maxConcurrentJobs: number;
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export interface FlightCache {
  flightNumber: string;
  lastUpdated: Date;
  data: any;
  source: DataSource;
}

export class FlightScraperService {
  private flightRadar24Service: FlightRadar24Service;
  private flightAwareService: FlightAwareService;
  private config: ScrapingConfig;
  private runningJobs = new Map<string, boolean>();
  private cache = new Map<string, FlightCache>();
  private cronJobs: cron.ScheduledTask[] = [];

  constructor(config: ScrapingConfig) {
    this.config = config;
    this.flightRadar24Service = new FlightRadar24Service();
    this.flightAwareService = new FlightAwareService();
  }

  async startScheduledScraping(): Promise<void> {
    console.log('Starting scheduled flight data scraping...');

    // Ensure we have a valid update interval, default to every 30 minutes
    const updateInterval = this.config?.updateInterval || '*/30 * * * *';
    console.log(`Using update interval: ${updateInterval}`);

    // Schedule FlightRadar24 scraping
    const fr24Job = cron.schedule(updateInterval, async () => {
      await this.runScheduledScraping(DataSource.FLIGHTRADAR24);
    }, {
      scheduled: false,
      timezone: 'America/Sao_Paulo'
    });

    // Schedule FlightAware scraping (offset by 30 minutes)
    const faJob = cron.schedule(this.offsetCronExpression(updateInterval, 30), async () => {
      await this.runScheduledScraping(DataSource.FLIGHTAWARE);
    }, {
      scheduled: false,
      timezone: 'America/Sao_Paulo'
    });

    this.cronJobs.push(fr24Job, faJob);

    // Start the cron jobs
    fr24Job.start();
    faJob.start();

    console.log(`Scheduled scraping started with interval: ${this.config.updateInterval}`);
  }

  async stopScheduledScraping(): Promise<void> {
    console.log('Stopping scheduled flight data scraping...');

    for (const job of this.cronJobs) {
      job.destroy();
    }
    this.cronJobs = [];

    console.log('All scheduled scraping jobs stopped');
  }

  async runScheduledScraping(source: DataSource): Promise<void> {
    const jobKey = `scheduled_${source}_${Date.now()}`;

    if (this.runningJobs.size >= this.config.maxConcurrentJobs) {
      console.log(`Max concurrent jobs reached, skipping ${source} scraping`);
      return;
    }

    this.runningJobs.set(jobKey, true);

    // Create scraping job record
    const scrapingJob = await this.createScrapingJobRecord(source, 'SCHEDULED', this.config.airports);

    try {
      console.log(`Starting scheduled ${source} scraping...`);

      const promises = this.config.airports.map(airport =>
        this.scrapeAirportWithRetry(airport, source)
      );

      const results = await Promise.allSettled(promises);

      // Count successful scrapes and total records
      let totalRecords = 0;
      let successfulScrapes = 0;
      let failedScrapes = 0;

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successfulScrapes++;
          totalRecords += result.value || 0;
        } else {
          failedScrapes++;
        }
      });

      // Update job record with completion status
      await this.completeScrapingJobRecord(scrapingJob.id, totalRecords, failedScrapes > 0 ? 'PARTIAL_SUCCESS' : 'COMPLETED');

      console.log(`Completed scheduled ${source} scraping for ${this.config.airports.length} airports (${successfulScrapes} successful, ${failedScrapes} failed)`);
    } catch (error) {
      console.error(`Error in scheduled ${source} scraping:`, error);
      await this.completeScrapingJobRecord(scrapingJob.id, 0, 'FAILED', error.message);
    } finally {
      this.runningJobs.delete(jobKey);
    }
  }

  async scrapeAirportWithRetry(airportCode: string, source: DataSource, attempt = 1): Promise<number> {
    try {
      let flights: any[] = [];

      if (source === DataSource.FLIGHTRADAR24) {
        flights = await this.flightRadar24Service.scrapeAirportData(airportCode);
      } else if (source === DataSource.FLIGHTAWARE) {
        flights = await this.flightAwareService.scrapeAirportData(airportCode);
      }

      // Update cache and save to database
      const savePromises = flights.map(flight => this.updateFlightCache(flight, source));
      await Promise.all(savePromises);

      console.log(`Successfully scraped ${flights.length} flights from ${source} for airport ${airportCode}`);
      return flights.length;
    } catch (error) {
      console.error(`Error scraping airport ${airportCode} from ${source} (attempt ${attempt}):`, error);

      if (attempt < this.config.retryAttempts) {
        await this.delay(this.config.retryDelay);
        return await this.scrapeAirportWithRetry(airportCode, source, attempt + 1);
      } else {
        console.error(`Failed to scrape airport ${airportCode} from ${source} after ${this.config.retryAttempts} attempts`);
        throw error; // Re-throw to be handled by calling function
      }
    }
  }

  async scrapeFlightDetails(flightNumber: string, source?: DataSource): Promise<any> {
    const cacheKey = `${flightNumber}_${source || 'any'}`;
    const cached = this.cache.get(cacheKey);

    // Return cached data if it's less than 5 minutes old
    if (cached && (Date.now() - cached.lastUpdated.getTime()) < 5 * 60 * 1000) {
      return cached.data;
    }

    const sources = source ? [source] : [DataSource.FLIGHTRADAR24, DataSource.FLIGHTAWARE];

    for (const currentSource of sources) {
      try {
        let flight = null;

        if (currentSource === DataSource.FLIGHTRADAR24) {
          flight = await this.flightRadar24Service.scrapeFlightDetails(flightNumber);
        } else if (currentSource === DataSource.FLIGHTAWARE) {
          flight = await this.flightAwareService.scrapeFlightDetails(flightNumber);
        }

        if (flight) {
          await this.updateFlightCache(flight, currentSource);
          return flight;
        }
      } catch (error) {
        console.error(`Error scraping flight ${flightNumber} from ${currentSource}:`, error);
      }
    }

    return null;
  }

  async getFlightData(flightNumber: string, options?: {
    maxAge?: number; // milliseconds
    preferredSource?: DataSource;
  }): Promise<any> {
    const maxAge = options?.maxAge || 10 * 60 * 1000; // 10 minutes default

    // Check database first
    const dbFlight = await prisma.scrapedFlight.findFirst({
      where: {
        flightNumber,
        lastUpdated: {
          gte: new Date(Date.now() - maxAge)
        }
      },
      orderBy: [
        options?.preferredSource ? { source: options.preferredSource === DataSource.FLIGHTRADAR24 ? 'asc' : 'desc' } : {},
        { lastUpdated: 'desc' }
      ]
    });

    if (dbFlight) {
      return dbFlight;
    }

    // If not in database or too old, scrape fresh data
    return await this.scrapeFlightDetails(flightNumber, options?.preferredSource);
  }

  async getAirportFlights(airportCode: string, options?: {
    maxAge?: number;
    limit?: number;
    preferredSource?: DataSource;
  }): Promise<any[]> {
    const maxAge = options?.maxAge || 30 * 60 * 1000; // 30 minutes default
    const limit = options?.limit || 50;

    const flights = await prisma.scrapedFlight.findMany({
      where: {
        OR: [
          { origin: airportCode },
          { destination: airportCode }
        ],
        lastUpdated: {
          gte: new Date(Date.now() - maxAge)
        }
      },
      orderBy: [
        options?.preferredSource ? { source: options.preferredSource === DataSource.FLIGHTRADAR24 ? 'asc' : 'desc' } : {},
        { lastUpdated: 'desc' }
      ],
      take: limit
    });

    // If we don't have enough fresh data, trigger a background scrape
    if (flights.length < limit / 2) {
      // Don't wait for the scrape to complete - run in background
      this.scrapeAirportWithRetry(airportCode, options?.preferredSource || DataSource.FLIGHTRADAR24)
        .catch(error => {
          console.error(`Background airport scraping failed for ${airportCode}:`, error);
        });
    }

    return flights;
  }

  async getScrapingStats(): Promise<any> {
    const stats = await prisma.$transaction([
      // Total scraped flights
      prisma.scrapedFlight.count(),

      // Flights by source
      prisma.scrapedFlight.groupBy({
        by: ['source'],
        _count: true
      }),

      // Recent jobs
      prisma.scrapingJob.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          source: true,
          jobType: true,
          status: true,
          recordsCount: true,
          createdAt: true,
          completedAt: true,
          errorMessage: true
        }
      }),

      // Job stats
      prisma.scrapingJob.groupBy({
        by: ['status'],
        _count: true
      })
    ]);

    return {
      totalFlights: stats[0],
      flightsBySource: stats[1],
      recentJobs: stats[2],
      jobsByStatus: stats[3],
      cacheSize: this.cache.size,
      runningJobs: this.runningJobs.size
    };
  }

  private async updateFlightCache(flight: any, source: DataSource): Promise<void> {
    const cacheKey = `${flight.flightNumber}_${source}`;
    const now = new Date();

    // Update in-memory cache
    this.cache.set(cacheKey, {
      flightNumber: flight.flightNumber,
      lastUpdated: now,
      data: flight,
      source
    });

    // Save to database with detailed flight information
    try {
      await this.saveFlightToDatabase(flight, source, now);
    } catch (error) {
      console.error(`Error saving flight ${flight.flightNumber} to database:`, error);
    }

    // Limit cache size (keep only last 1000 entries)
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  private async saveFlightToDatabase(flight: any, source: DataSource, lastUpdated: Date): Promise<void> {
    // Generate a unique external ID for each scraping session
    const externalId = `${source}_${flight.flightNumber}_${Math.floor(lastUpdated.getTime() / 60000)}`;

    const flightData = {
      externalId,
      flightNumber: flight.flightNumber,
      origin: flight.origin || flight.departure?.airport || flight.departureAirport || 'UNKNOWN',
      destination: flight.destination || flight.arrival?.airport || flight.arrivalAirport || 'UNKNOWN',
      departureTime: this.parseFlightTime(flight.departureTime || flight.scheduled_departure || flight.departure?.time),
      arrivalTime: this.parseFlightTime(flight.arrivalTime || flight.scheduled_arrival || flight.arrival?.time),
      airline: flight.airline || flight.carrier || flight.airlineName || 'UNKNOWN',
      aircraft: flight.aircraft || flight.airplane || flight.aircraftType || null,
      status: this.normalizeFlightStatus(flight.status || 'SCHEDULED'),
      gate: flight.gate || flight.departure?.gate || flight.arrival?.gate || null,
      terminal: flight.terminal || flight.departure?.terminal || flight.arrival?.terminal || null,
      delay: this.parseDelay(flight.delay),
      source: source,
      lastUpdated,
      rawData: flight, // Store as JSON object, not string
    };

    // Use upsert based on flight number and source for the current timeframe (1-hour window)
    const uniqueKey = `${source}_${flight.flightNumber}`;

    await prisma.scrapedFlight.upsert({
      where: {
        externalId: flightData.externalId
      },
      update: {
        status: flightData.status,
        departureTime: flightData.departureTime,
        arrivalTime: flightData.arrivalTime,
        gate: flightData.gate,
        terminal: flightData.terminal,
        delay: flightData.delay,
        lastUpdated: flightData.lastUpdated,
        rawData: flightData.rawData,
      },
      create: flightData
    });

    console.log(`✅ Saved flight ${flight.flightNumber} from ${source} to database`);
  }

  private parseFlightTime(timeValue: any): Date {
    if (!timeValue) return new Date();

    if (timeValue instanceof Date) return timeValue;

    if (typeof timeValue === 'string') {
      const parsed = new Date(timeValue);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    if (typeof timeValue === 'number') {
      // Assume timestamp
      return new Date(timeValue);
    }

    return new Date();
  }

  private normalizeFlightStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'on time': 'ON_TIME',
      'ontime': 'ON_TIME',
      'delayed': 'DELAYED',
      'cancelled': 'CANCELLED',
      'canceled': 'CANCELLED',
      'boarding': 'BOARDING',
      'departed': 'DEPARTED',
      'arrived': 'ARRIVED',
      'scheduled': 'SCHEDULED',
      'unknown': 'UNKNOWN'
    };

    const normalized = status.toLowerCase().trim();
    return statusMap[normalized] || status.toUpperCase();
  }

  private parseDelay(delayValue: any): number | null {
    if (!delayValue) return null;

    if (typeof delayValue === 'number') return delayValue;

    if (typeof delayValue === 'string') {
      const match = delayValue.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }

    return null;
  }

  private async createScrapingJobRecord(source: DataSource, jobType: string, airports: string[]): Promise<any> {
    try {
      const job = await prisma.scrapingJob.create({
        data: {
          source: source,
          jobType: jobType,
          status: JobStatus.PENDING,
          parameters: JSON.stringify({ targetAirports: airports }),
          recordsCount: 0,
          createdAt: new Date()
        }
      });

      console.log(`📋 Created scraping job record: ${job.id} for ${source} - ${jobType}`);
      return job;
    } catch (error) {
      console.error(`Error creating scraping job record:`, error);
      // Throw error if database save fails
      throw new Error(`Failed to create scraping job record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async completeScrapingJobRecord(jobId: string, recordsCount: number, status: JobStatus, errorMessage?: string): Promise<void> {
    try {

      await prisma.scrapingJob.update({
        where: { id: jobId },
        data: {
          status: status,
          recordsCount: recordsCount,
          completedAt: new Date(),
          errorMessage: errorMessage || null
        }
      });

      console.log(`✅ Updated scraping job ${jobId}: ${status} (${recordsCount} records)`);
    } catch (error) {
      console.error(`Error updating scraping job record ${jobId}:`, error);
    }
  }

  private offsetCronExpression(cronExpr: string, offsetMinutes: number): string {
    // For expressions like "*/30 * * * *", just use a simple offset approach
    // Instead of parsing, return a fixed offset cron expression
    // If the original is every 30 minutes, offset by 15 minutes
    if (cronExpr === '*/30 * * * *') {
      return '15,45 * * * *'; // Run at 15 and 45 minutes past each hour
    }
    // For other expressions, just return the original (no offset)
    return cronExpr;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    await this.stopScheduledScraping();
    this.cache.clear();
    this.runningJobs.clear();
  }
}

// Singleton instance
let flightScraperService: FlightScraperService;

export function getFlightScraperService(config?: ScrapingConfig): FlightScraperService {
  if (!flightScraperService) {
    const defaultConfig: ScrapingConfig = {
      airports: ['GRU', 'CGH', 'BSB', 'SDU', 'GIG', 'CWB', 'POA', 'REC', 'FOR', 'MAO'],
      updateInterval: '*/15 * * * *', // Every 15 minutes
      maxConcurrentJobs: 3,
      retryAttempts: 3,
      retryDelay: 5000 // 5 seconds
    };

    flightScraperService = new FlightScraperService(config || defaultConfig);
  }
  return flightScraperService;
}