import { DataSource, ScrapingJob, JobStatus } from '@prisma/client';
import { prisma } from '@reservasegura/database';
import { getFirecrawlService, ScrapingResult } from './firecrawl.service';
import { FlightData } from './flightradar24.service';

export interface FlightAwareOptions {
  airport?: string;
  date?: string;
  flightNumber?: string;
  limit?: number;
  hours?: number; // for flight tracking hours ahead/behind
}

export class FlightAwareService {
  private firecrawl = getFirecrawlService();
  private baseUrl = 'https://flightaware.com';

  async scrapeFlightData(options: FlightAwareOptions = {}): Promise<FlightData[]> {
    const job = await this.createScrapingJob('flight_data', options);

    try {
      await this.updateJobStatus(job.id, JobStatus.RUNNING, new Date());

      let url = this.baseUrl;

      if (options.flightNumber) {
        url = `${this.baseUrl}/live/flight/${options.flightNumber}`;
      } else if (options.airport) {
        url = `${this.baseUrl}/live/airport/${options.airport}`;
      } else {
        // Default: scrape live flight tracker
        url = `${this.baseUrl}/live/`;
      }

      const result = await this.firecrawl.scrapeUrl(url, {
        waitFor: 3000,
        timeout: 45000,
        includeTags: ['table', 'div', 'span'],
        excludeTags: ['script', 'style', 'nav', 'footer']
      });

      if (!result.success) {
        await this.updateJobStatus(job.id, JobStatus.FAILED, undefined, undefined, result.error);
        return [];
      }

      const flightData = this.parseFlightAwareData(result.data);

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

      const airportUrl = `${this.baseUrl}/live/airport/${airportCode}`;

      const result = await this.firecrawl.scrapeUrl(airportUrl, {
        waitFor: 3000,
        timeout: 45000,
        includeTags: ['table', 'tbody', 'tr', 'td', 'div'],
        excludeTags: ['script', 'style', 'nav', 'footer', 'header']
      });

      if (!result.success) {
        await this.updateJobStatus(job.id, JobStatus.FAILED, undefined, undefined, result.error);
        return [];
      }

      const flightData = this.parseAirportData(result.data, airportCode);
      const savedFlights = await this.saveScrapedFlights(flightData);

      await this.updateJobStatus(job.id, JobStatus.COMPLETED, undefined, new Date(), undefined, savedFlights.length);

      return flightData;
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

      const url = `${this.baseUrl}/live/flight/${flightNumber}`;
      const result = await this.firecrawl.scrapeUrl(url, {
        waitFor: 4000,
        timeout: 45000,
        includeTags: ['div', 'table', 'span', 'p'],
        excludeTags: ['script', 'style', 'nav', 'footer']
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

  private parseFlightAwareData(data: any): FlightData[] {
    const flights: FlightData[] = [];

    try {
      const content = data.markdown || data.html || '';

      // FlightAware patterns - more comprehensive regex patterns
      const patterns = [
        // Pattern for flight tables: Flight | From | To | Departure | Arrival | Aircraft
        /([A-Z]{2,3}\d{1,4})\s+([A-Z]{3})\s+([A-Z]{3})\s+(\d{1,2}:\d{2}[AP]M)\s+(\d{1,2}:\d{2}[AP]M)\s+([A-Za-z0-9\-\s]+)/g,
        // Alternative pattern
        /Flight\s+([A-Z]{2,3}\d{1,4}).*?From\s+([A-Z]{3}).*?To\s+([A-Z]{3}).*?Departs\s+(\d{1,2}:\d{2}[AP]M).*?Arrives\s+(\d{1,2}:\d{2}[AP]M)/gi
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          try {
            const [, flightNumber, origin, destination, depTime, arrTime, aircraft] = match;

            const departureTime = this.parseFlightAwareTime(depTime);
            const arrivalTime = this.parseFlightAwareTime(arrTime);

            if (departureTime && arrivalTime) {
              flights.push({
                flightNumber: flightNumber.trim(),
                origin: origin.trim(),
                destination: destination.trim(),
                departureTime,
                arrivalTime,
                airline: this.extractAirlineFromFlight(flightNumber),
                aircraft: aircraft?.trim(),
                status: 'SCHEDULED'
              });
            }
          } catch (error) {
            console.error('Error parsing individual flight:', error);
          }
        }
      }

      // Remove duplicates based on flight number and departure time
      const uniqueFlights = this.removeDuplicateFlights(flights);

      return uniqueFlights;
    } catch (error) {
      console.error('Error parsing FlightAware data:', error);
      return [];
    }
  }

  private parseAirportData(data: any, airportCode: string): FlightData[] {
    const flights: FlightData[] = [];

    try {
      const content = data.markdown || data.html || '';

      // Parse departure and arrival tables
      const departurePattern = /Departures?.*?([A-Z]{2,3}\d{1,4}).*?([A-Z]{3}).*?(\d{1,2}:\d{2}[AP]M).*?(On time|Delayed|Cancelled)/gi;
      const arrivalPattern = /Arrivals?.*?([A-Z]{2,3}\d{1,4}).*?([A-Z]{3}).*?(\d{1,2}:\d{2}[AP]M).*?(On time|Delayed|Cancelled)/gi;

      // Parse departures
      let match;
      while ((match = departurePattern.exec(content)) !== null) {
        const [, flightNumber, destination, depTime, status] = match;
        const departureTime = this.parseFlightAwareTime(depTime);

        if (departureTime) {
          flights.push({
            flightNumber: flightNumber.trim(),
            origin: airportCode,
            destination: destination.trim(),
            departureTime,
            airline: this.extractAirlineFromFlight(flightNumber),
            status: this.normalizeStatus(status)
          });
        }
      }

      // Parse arrivals
      while ((match = arrivalPattern.exec(content)) !== null) {
        const [, flightNumber, origin, arrTime, status] = match;
        const arrivalTime = this.parseFlightAwareTime(arrTime);

        if (arrivalTime) {
          flights.push({
            flightNumber: flightNumber.trim(),
            origin: origin.trim(),
            destination: airportCode,
            departureTime: new Date(arrivalTime.getTime() - 2 * 60 * 60 * 1000), // Estimate departure as 2h before arrival
            arrivalTime,
            airline: this.extractAirlineFromFlight(flightNumber),
            status: this.normalizeStatus(status)
          });
        }
      }

    } catch (error) {
      console.error('Error parsing airport data:', error);
    }

    return this.removeDuplicateFlights(flights);
  }

  private parseFlightDetails(data: any, flightNumber: string): FlightData | null {
    try {
      const content = data.markdown || data.html || '';

      // Extract detailed information
      const originMatch = content.match(/(?:From|Origin|Departure):\s*([A-Z]{3})/i);
      const destinationMatch = content.match(/(?:To|Destination|Arrival):\s*([A-Z]{3})/i);
      const airlineMatch = content.match(/(?:Airline|Operator):\s*([A-Za-z\s]+)/i);
      const aircraftMatch = content.match(/(?:Aircraft|Equipment):\s*([A-Za-z0-9\-\s]+)/i);
      const statusMatch = content.match(/(?:Status|Flight Status):\s*([A-Za-z\s]+)/i);
      const gateMatch = content.match(/(?:Gate|Departure Gate):\s*([A-Za-z0-9]+)/i);
      const terminalMatch = content.match(/(?:Terminal|Departure Terminal):\s*([A-Za-z0-9]+)/i);
      const delayMatch = content.match(/(?:Delayed?|Late)\s*(\d+)\s*(?:min|minutes?)/i);

      const departureTimeMatch = content.match(/(?:Departure|Departs?):\s*(\d{1,2}:\d{2}[AP]M)/i);
      const arrivalTimeMatch = content.match(/(?:Arrival|Arrives?):\s*(\d{1,2}:\d{2}[AP]M)/i);

      if (!originMatch || !destinationMatch) {
        return null;
      }

      const departureTime = departureTimeMatch ? this.parseFlightAwareTime(departureTimeMatch[1]) : new Date();
      const arrivalTime = arrivalTimeMatch ? this.parseFlightAwareTime(arrivalTimeMatch[1]) : undefined;

      return {
        flightNumber,
        origin: originMatch[1],
        destination: destinationMatch[1],
        departureTime: departureTime || new Date(),
        arrivalTime,
        airline: airlineMatch?.[1]?.trim() || this.extractAirlineFromFlight(flightNumber),
        aircraft: aircraftMatch?.[1]?.trim(),
        status: this.normalizeStatus(statusMatch?.[1]?.trim() || 'SCHEDULED'),
        gate: gateMatch?.[1]?.trim(),
        terminal: terminalMatch?.[1]?.trim(),
        delay: delayMatch ? parseInt(delayMatch[1]) : undefined
      };
    } catch (error) {
      console.error('Error parsing flight details:', error);
      return null;
    }
  }

  private parseFlightAwareTime(timeStr: string): Date | null {
    try {
      const match = timeStr.match(/(\d{1,2}):(\d{2})([AP]M)/i);
      if (!match) return null;

      const [, hours, minutes, ampm] = match;
      let hour = parseInt(hours);
      const minute = parseInt(minutes);

      if (ampm.toUpperCase() === 'PM' && hour !== 12) {
        hour += 12;
      } else if (ampm.toUpperCase() === 'AM' && hour === 12) {
        hour = 0;
      }

      const today = new Date();
      today.setHours(hour, minute, 0, 0);

      return today;
    } catch (error) {
      console.error('Error parsing time:', error);
      return null;
    }
  }

  private extractAirlineFromFlight(flightNumber: string): string {
    const airlineCode = flightNumber.replace(/\d+/g, '').trim();

    // Common airline mappings
    const airlineMap: { [key: string]: string } = {
      'AA': 'American Airlines',
      'DL': 'Delta Air Lines',
      'UA': 'United Airlines',
      'WN': 'Southwest Airlines',
      'AS': 'Alaska Airlines',
      'B6': 'JetBlue Airways',
      'NK': 'Spirit Airlines',
      'G4': 'Allegiant Air',
      'AD': 'Azul',
      'LA': 'LATAM',
      'G3': 'GOL',
      'TP': 'TAP Air Portugal',
      'LH': 'Lufthansa',
      'AF': 'Air France',
      'KL': 'KLM',
      'BA': 'British Airways'
    };

    return airlineMap[airlineCode] || airlineCode || 'Unknown';
  }

  private normalizeStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'on time': 'SCHEDULED',
      'delayed': 'DELAYED',
      'cancelled': 'CANCELLED',
      'departed': 'DEPARTED',
      'arrived': 'ARRIVED',
      'boarding': 'BOARDING',
      'scheduled': 'SCHEDULED'
    };

    return statusMap[status.toLowerCase()] || status.toUpperCase();
  }

  private removeDuplicateFlights(flights: FlightData[]): FlightData[] {
    const seen = new Set<string>();
    return flights.filter(flight => {
      const key = `${flight.flightNumber}_${flight.departureTime.toISOString()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private async saveScrapedFlights(flights: FlightData[]): Promise<any[]> {
    const savedFlights = [];

    for (const flight of flights) {
      try {
        const externalId = `FA_${flight.flightNumber}_${flight.departureTime.toISOString()}`;

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
            source: DataSource.FLIGHTAWARE,
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
        source: DataSource.FLIGHTAWARE,
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