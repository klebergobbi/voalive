import { Request, Response } from 'express';
import { getFlightScraperService } from '../services/flight-scraper.service';
import { getSimpleSchedulerService } from '../services/simple-scheduler.service';

// DataSource constant
const DataSource = {
  FLIGHTRADAR24: 'FLIGHTRADAR24',
  FLIGHTAWARE: 'FLIGHTAWARE',
  MANUAL: 'MANUAL'
} as const;

type DataSource = typeof DataSource[keyof typeof DataSource];
import { z } from 'zod';

// Validation schemas
const scrapeFlightSchema = z.object({
  flightNumber: z.string().min(2).max(10),
  source: z.enum(['FLIGHTRADAR24', 'FLIGHTAWARE']).optional()
});

const scrapeAirportSchema = z.object({
  airportCode: z.string().length(3),
  source: z.enum(['FLIGHTRADAR24', 'FLIGHTAWARE']).optional()
});

const getFlightDataSchema = z.object({
  flightNumber: z.string().min(2).max(10),
  maxAge: z.number().optional(),
  preferredSource: z.enum(['FLIGHTRADAR24', 'FLIGHTAWARE']).optional()
});

const getAirportFlightsSchema = z.object({
  airportCode: z.string().length(3),
  maxAge: z.number().optional(),
  limit: z.number().min(1).max(100).optional(),
  preferredSource: z.enum(['FLIGHTRADAR24', 'FLIGHTAWARE']).optional()
});

export class FlightScraperController {
  private scraperService = getFlightScraperService();
  private schedulerService = getSimpleSchedulerService();

  // Manual scraping endpoints
  async scrapeFlight(req: Request, res: Response): Promise<void> {
    try {
      const { flightNumber, source } = scrapeFlightSchema.parse(req.body);

      const flightData = await this.scraperService.scrapeFlightDetails(
        flightNumber,
        source as DataSource
      );

      if (flightData) {
        res.json({
          success: true,
          data: flightData,
          message: `Flight ${flightNumber} scraped successfully`
        });
      } else {
        res.status(404).json({
          success: false,
          message: `Flight ${flightNumber} not found`
        });
      }
    } catch (error) {
      console.error('Error scraping flight:', error);
      res.status(500).json({
        success: false,
        message: 'Error scraping flight data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async scrapeAirport(req: Request, res: Response): Promise<void> {
    try {
      const { airportCode, source } = scrapeAirportSchema.parse(req.body);

      const promises = [];

      if (!source || source === 'FLIGHTRADAR24') {
        promises.push(this.scraperService.scrapeAirportWithRetry(airportCode, DataSource.FLIGHTRADAR24));
      }

      if (!source || source === 'FLIGHTAWARE') {
        promises.push(this.scraperService.scrapeAirportWithRetry(airportCode, DataSource.FLIGHTAWARE));
      }

      await Promise.allSettled(promises);

      res.json({
        success: true,
        message: `Airport ${airportCode} data scraping initiated`
      });
    } catch (error) {
      console.error('Error scraping airport:', error);
      res.status(500).json({
        success: false,
        message: 'Error scraping airport data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Data retrieval endpoints
  async getFlightData(req: Request, res: Response): Promise<void> {
    try {
      const { flightNumber } = req.params;
      const queryParams = getFlightDataSchema.parse({
        flightNumber,
        maxAge: req.query.maxAge ? Number(req.query.maxAge) : undefined,
        preferredSource: req.query.preferredSource as string
      });

      const flightData = await this.scraperService.getFlightData(queryParams.flightNumber, {
        maxAge: queryParams.maxAge,
        preferredSource: queryParams.preferredSource as DataSource
      });

      if (flightData) {
        res.json({
          success: true,
          data: flightData
        });
      } else {
        res.status(404).json({
          success: false,
          message: `Flight ${flightNumber} not found`
        });
      }
    } catch (error) {
      console.error('Error getting flight data:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving flight data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAirportFlights(req: Request, res: Response): Promise<void> {
    try {
      const { airportCode } = req.params;
      const queryParams = getAirportFlightsSchema.parse({
        airportCode,
        maxAge: req.query.maxAge ? Number(req.query.maxAge) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        preferredSource: req.query.preferredSource as string
      });

      const flights = await this.scraperService.getAirportFlights(queryParams.airportCode, {
        maxAge: queryParams.maxAge,
        limit: queryParams.limit,
        preferredSource: queryParams.preferredSource as DataSource
      });

      res.json({
        success: true,
        data: flights,
        count: flights.length
      });
    } catch (error) {
      console.error('Error getting airport flights:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving airport flights',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Scheduler management endpoints
  async startScheduler(req: Request, res: Response): Promise<void> {
    try {
      await this.schedulerService.start();

      res.json({
        success: true,
        message: 'Scheduled scraping started',
        status: this.schedulerService.getStatus()
      });
    } catch (error) {
      console.error('Error starting scheduler:', error);
      res.status(500).json({
        success: false,
        message: 'Error starting scheduler',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async stopScheduler(req: Request, res: Response): Promise<void> {
    try {
      await this.schedulerService.stop();

      res.json({
        success: true,
        message: 'Scheduled scraping stopped',
        status: this.schedulerService.getStatus()
      });
    } catch (error) {
      console.error('Error stopping scheduler:', error);
      res.status(500).json({
        success: false,
        message: 'Error stopping scheduler',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.scraperService.getScrapingStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Search and filter endpoints
  async searchFlights(req: Request, res: Response): Promise<void> {
    try {
      const {
        origin,
        destination,
        airline,
        status,
        date,
        limit = 50
      } = req.query;

      const whereClause: any = {};

      if (origin) whereClause.origin = origin;
      if (destination) whereClause.destination = destination;
      if (airline) whereClause.airline = { contains: airline as string, mode: 'insensitive' };
      if (status) whereClause.status = status;

      if (date) {
        const searchDate = new Date(date as string);
        const nextDay = new Date(searchDate);
        nextDay.setDate(nextDay.getDate() + 1);

        whereClause.departureTime = {
          gte: searchDate,
          lt: nextDay
        };
      }

      const { prisma } = await import('@reservasegura/database');

      const flights = await prisma.scrapedFlight.findMany({
        where: whereClause,
        orderBy: { departureTime: 'asc' },
        take: Number(limit)
      });

      res.json({
        success: true,
        data: flights,
        count: flights.length
      });
    } catch (error) {
      console.error('Error searching flights:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching flights',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getRecentFlights(req: Request, res: Response): Promise<void> {
    try {
      const { hours = 24, limit = 100 } = req.query;

      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - Number(hours));

      const { prisma } = await import('@reservasegura/database');

      const flights = await prisma.scrapedFlight.findMany({
        where: {
          lastUpdated: {
            gte: hoursAgo
          }
        },
        orderBy: { lastUpdated: 'desc' },
        take: Number(limit)
      });

      res.json({
        success: true,
        data: flights,
        count: flights.length
      });
    } catch (error) {
      console.error('Error getting recent flights:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving recent flights',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}