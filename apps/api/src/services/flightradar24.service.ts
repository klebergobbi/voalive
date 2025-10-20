import { DataSource, ScrapingJob, JobStatus } from '@prisma/client';
import { prisma } from '@reservasegura/database';
import { getFirecrawlService, ScrapingResult } from './firecrawl.service';

export interface FlightData {
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: Date;
  arrivalTime?: Date;
  airline: string;
  aircraft?: string;
  status: string;
  gate?: string;
  terminal?: string;
  delay?: number;
}

export interface FlightRadar24Options {
  airport?: string;
  date?: string;
  flightNumber?: string;
  limit?: number;
}

export class FlightRadar24Service {
  private firecrawl = getFirecrawlService();
  private baseUrl = 'https://www.flightradar24.com';

  async scrapeFlightData(options: FlightRadar24Options = {}): Promise<FlightData[]> {
    const job = await this.createScrapingJob('flight_data', options);

    try {
      await this.updateJobStatus(job.id, JobStatus.RUNNING, new Date());

      let url = this.baseUrl;

      if (options.flightNumber) {
        url = `${this.baseUrl}/data/flights/${options.flightNumber}`;
      } else if (options.airport) {
        url = `${this.baseUrl}/data/airports/${options.airport}`;
      } else {
        // Default: scrape live flights
        url = `${this.baseUrl}/data/flights/live`;
      }

      const result = await this.firecrawl.scrapeUrl(url, {
        waitFor: 2000,
        timeout: 30000
      });

      if (!result.success) {
        await this.updateJobStatus(job.id, JobStatus.FAILED, undefined, undefined, result.error);
        return [];
      }

      const flightData = this.parseFlightRadar24Data(result.data);

      // Save scraped flights to database
      const savedFlights = await this.saveScrapedFlights(flightData);

      await this.updateJobStatus(job.id, JobStatus.COMPLETED, undefined, new Date(), undefined, savedFlights.length);

      return flightData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateJobStatus(job.id, JobStatus.FAILED, undefined, undefined, errorMessage);
      throw error;
    }
  }

  async scrapeAirportData(airportCode: string): Promise<FlightData[]> {
    const job = await this.createScrapingJob('airport_data', { airport: airportCode });

    try {
      await this.updateJobStatus(job.id, JobStatus.RUNNING, new Date());

      const departuresUrl = `${this.baseUrl}/data/airports/${airportCode}/departures`;
      const arrivalsUrl = `${this.baseUrl}/data/airports/${airportCode}/arrivals`;

      const [departuresResult, arrivalsResult] = await Promise.all([
        this.firecrawl.scrapeUrl(departuresUrl, { waitFor: 2000, timeout: 30000 }),
        this.firecrawl.scrapeUrl(arrivalsUrl, { waitFor: 2000, timeout: 30000 })
      ]);

      const departures = departuresResult.success ? this.parseFlightRadar24Data(departuresResult.data) : [];
      const arrivals = arrivalsResult.success ? this.parseFlightRadar24Data(arrivalsResult.data) : [];

      const allFlights = [...departures, ...arrivals];
      const savedFlights = await this.saveScrapedFlights(allFlights);

      await this.updateJobStatus(job.id, JobStatus.COMPLETED, undefined, new Date(), undefined, savedFlights.length);

      return allFlights;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateJobStatus(job.id, JobStatus.FAILED, undefined, undefined, errorMessage);
      throw error;
    }
  }

  async scrapeFlightDetails(flightNumber: string): Promise<FlightData | null> {
    const job = await this.createScrapingJob('flight_details', { flightNumber });

    try {
      await this.updateJobStatus(job.id, JobStatus.RUNNING, new Date());

      const url = `${this.baseUrl}/data/flights/${flightNumber}`;
      const result = await this.firecrawl.scrapeUrl(url, {
        waitFor: 3000,
        timeout: 30000
      });

      if (!result.success) {
        await this.updateJobStatus(job.id, JobStatus.FAILED, undefined, undefined, result.error);
        return null;
      }

      const flightData = this.parseFlightDetails(result.data, flightNumber);

      if (flightData) {
        await this.saveScrapedFlights([flightData]);
        await this.updateJobStatus(job.id, JobStatus.COMPLETED, undefined, new Date(), undefined, 1);
      } else {
        await this.updateJobStatus(job.id, JobStatus.COMPLETED, undefined, new Date(), undefined, 0);
      }

      return flightData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateJobStatus(job.id, JobStatus.FAILED, undefined, undefined, errorMessage);
      throw error;
    }
  }

  private parseFlightRadar24Data(data: any): FlightData[] {
    const flights: FlightData[] = [];

    try {
      // Parse the scraped HTML/markdown content
      const content = data.markdown || data.html || '';

      // Extract flight information using regex patterns
      const flightRegex = /([A-Z]{2,3}\d{1,4})\s+([A-Z]{3})\s*-\s*([A-Z]{3})\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s+([A-Za-z\s]+)/g;

      let match;
      while ((match = flightRegex.exec(content)) !== null) {
        const [, flightNumber, origin, destination, depTime, arrTime, airline] = match;

        const today = new Date();
        const [depHour, depMin] = depTime.split(':').map(Number);
        const [arrHour, arrMin] = arrTime.split(':').map(Number);

        const departureTime = new Date(today);
        departureTime.setHours(depHour, depMin, 0, 0);

        const arrivalTime = new Date(today);
        arrivalTime.setHours(arrHour, arrMin, 0, 0);

        // If arrival time is before departure, it's next day
        if (arrivalTime < departureTime) {
          arrivalTime.setDate(arrivalTime.getDate() + 1);
        }

        flights.push({
          flightNumber: flightNumber.trim(),
          origin: origin.trim(),
          destination: destination.trim(),
          departureTime,
          arrivalTime,
          airline: airline.trim(),
          status: 'SCHEDULED'
        });
      }
    } catch (error) {
      console.error('Error parsing FlightRadar24 data:', error);
    }

    return flights;
  }

  private parseFlightDetails(data: any, flightNumber: string): FlightData | null {
    try {
      const content = data.markdown || data.html || '';

      // Extract detailed flight information
      const originMatch = content.match(/From:\s*([A-Z]{3})/i);
      const destinationMatch = content.match(/To:\s*([A-Z]{3})/i);
      const airlineMatch = content.match(/Airline:\s*([A-Za-z\s]+)/i);
      const aircraftMatch = content.match(/Aircraft:\s*([A-Za-z0-9\-]+)/i);
      const statusMatch = content.match(/Status:\s*([A-Za-z\s]+)/i);
      const gateMatch = content.match(/Gate:\s*([A-Za-z0-9]+)/i);
      const terminalMatch = content.match(/Terminal:\s*([A-Za-z0-9]+)/i);

      if (!originMatch || !destinationMatch) {
        return null;
      }

      return {
        flightNumber,
        origin: originMatch[1],
        destination: destinationMatch[1],
        departureTime: new Date(), // This would need better parsing
        airline: airlineMatch?.[1]?.trim() || 'Unknown',
        aircraft: aircraftMatch?.[1]?.trim(),
        status: statusMatch?.[1]?.trim() || 'SCHEDULED',
        gate: gateMatch?.[1]?.trim(),
        terminal: terminalMatch?.[1]?.trim()
      };
    } catch (error) {
      console.error('Error parsing flight details:', error);
      return null;
    }
  }

  private async saveScrapedFlights(flights: FlightData[]): Promise<any[]> {
    const savedFlights = [];

    for (const flight of flights) {
      try {
        const externalId = `FR24_${flight.flightNumber}_${flight.departureTime.toISOString()}`;

        const scrapedFlight = await prisma.scrapedFlight.upsert({
          where: { externalId },
          update: {
            status: flight.status,
            gate: flight.gate,
            terminal: flight.terminal,
            delay: flight.delay,
            lastUpdated: new Date(),
            rawData: flight
          },
          create: {
            externalId,
            flightNumber: flight.flightNumber,
            origin: flight.origin,
            destination: flight.destination,
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
            airline: flight.airline,
            aircraft: flight.aircraft,
            status: flight.status,
            gate: flight.gate,
            terminal: flight.terminal,
            delay: flight.delay,
            source: DataSource.FLIGHTRADAR24,
            lastUpdated: new Date(),
            rawData: flight
          }
        });

        savedFlights.push(scrapedFlight);
      } catch (error) {
        console.error(`Error saving flight ${flight.flightNumber}:`, error);
      }
    }

    return savedFlights;
  }

  private async createScrapingJob(jobType: string, parameters: any): Promise<ScrapingJob> {
    return await prisma.scrapingJob.create({
      data: {
        source: DataSource.FLIGHTRADAR24,
        jobType,
        parameters,
        status: JobStatus.PENDING
      }
    });
  }

  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    startedAt?: Date,
    completedAt?: Date,
    errorMessage?: string,
    recordsCount?: number
  ): Promise<void> {
    await prisma.scrapingJob.update({
      where: { id: jobId },
      data: {
        status,
        startedAt,
        completedAt,
        errorMessage,
        recordsCount
      }
    });
  }
}