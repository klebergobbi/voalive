import { Request, Response } from 'express';
import { prisma } from '@reservasegura/database';


export class FlightController {
  // GET /api/flights - List all flights with optional filters
  async getAllFlights(req: Request, res: Response) {
    try {
      const {
        status,
        airline,
        origin,
        destination,
        dateFrom,
        dateTo,
        limit = '50',
        offset = '0'
      } = req.query;

      const where: any = {};

      if (status) where.status = status;
      if (airline) where.airline = airline;
      if (origin) where.origin = origin;
      if (destination) where.destination = destination;

      if (dateFrom || dateTo) {
        where.departureTime = {};
        if (dateFrom) where.departureTime.gte = new Date(dateFrom as string);
        if (dateTo) where.departureTime.lte = new Date(dateTo as string);
      }

      const flights = await prisma.flight.findMany({
        where,
        orderBy: { departureTime: 'asc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      });

      const total = await prisma.flight.count({ where });

      res.json({
        success: true,
        data: flights,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        }
      });
    } catch (error) {
      console.error('Error fetching flights:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch flights',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/flights/:id - Get single flight by ID
  async getFlightById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const flight = await prisma.flight.findUnique({
        where: { id },
        include: {
          bookings: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!flight) {
        return res.status(404).json({
          success: false,
          error: 'Flight not found'
        });
      }

      res.json({
        success: true,
        data: flight
      });
    } catch (error) {
      console.error('Error fetching flight:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch flight',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/flights - Create new flight
  async createFlight(req: Request, res: Response) {
    try {
      const {
        flightNumber,
        origin,
        destination,
        departureTime,
        arrivalTime,
        airline,
        aircraft,
        availableSeats,
        totalSeats,
        basePrice,
        status = 'SCHEDULED',
        realDepartureTime,
        estimatedDepartureTime,
        realArrivalTime,
        estimatedArrivalTime,
        departureGate,
        departureTerminal,
        arrivalGate,
        arrivalTerminal,
        delayMinutes,
        currentLatitude,
        currentLongitude,
        currentAltitude,
        currentSpeed,
        currentHeading,
        trackingEnabled = false
      } = req.body;

      // Validate required fields
      if (!flightNumber || !origin || !destination || !departureTime || !arrivalTime || !airline) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['flightNumber', 'origin', 'destination', 'departureTime', 'arrivalTime', 'airline']
        });
      }

      const flight = await prisma.flight.create({
        data: {
          flightNumber,
          origin,
          destination,
          departureTime: new Date(departureTime),
          arrivalTime: new Date(arrivalTime),
          airline,
          aircraft: aircraft || 'N/A',
          availableSeats: availableSeats ?? totalSeats ?? 0,
          totalSeats: totalSeats ?? 0,
          basePrice: basePrice ?? 0,
          status,
          realDepartureTime: realDepartureTime ? new Date(realDepartureTime) : null,
          estimatedDepartureTime: estimatedDepartureTime ? new Date(estimatedDepartureTime) : null,
          realArrivalTime: realArrivalTime ? new Date(realArrivalTime) : null,
          estimatedArrivalTime: estimatedArrivalTime ? new Date(estimatedArrivalTime) : null,
          departureGate,
          departureTerminal,
          arrivalGate,
          arrivalTerminal,
          delayMinutes,
          currentLatitude,
          currentLongitude,
          currentAltitude,
          currentSpeed,
          currentHeading,
          trackingEnabled,
          lastTrackedAt: trackingEnabled ? new Date() : null
        }
      });

      res.status(201).json({
        success: true,
        data: flight,
        message: 'Flight created successfully'
      });
    } catch (error: any) {
      console.error('Error creating flight:', error);

      // Handle unique constraint violation
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: 'Flight with this flight number already exists'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create flight',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT /api/flights/:id - Update flight
  async updateFlight(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Lista de campos válidos do modelo Flight
      const validFields = [
        'flightNumber', 'origin', 'destination', 'departureTime', 'arrivalTime',
        'airline', 'aircraft', 'availableSeats', 'totalSeats', 'basePrice', 'status',
        'realDepartureTime', 'estimatedDepartureTime', 'realArrivalTime', 'estimatedArrivalTime',
        'departureGate', 'departureTerminal', 'arrivalGate', 'arrivalTerminal', 'delayMinutes',
        'currentLatitude', 'currentLongitude', 'currentAltitude', 'currentSpeed', 'currentHeading',
        'trackingEnabled', 'lastTrackedAt'
      ];

      // Filtrar apenas campos válidos
      const updateData: any = {};
      Object.keys(req.body).forEach(key => {
        if (validFields.includes(key)) {
          updateData[key] = req.body[key];
        }
      });

      // Convert date strings to Date objects
      ['departureTime', 'arrivalTime', 'realDepartureTime', 'estimatedDepartureTime',
       'realArrivalTime', 'estimatedArrivalTime', 'lastTrackedAt'].forEach(field => {
        if (updateData[field]) {
          updateData[field] = new Date(updateData[field]);
        }
      });

      // Update lastTrackedAt if tracking data is being updated
      if (updateData.currentLatitude || updateData.currentLongitude) {
        updateData.lastTrackedAt = new Date();
      }

      const flight = await prisma.flight.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        data: flight,
        message: 'Flight updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating flight:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Flight not found'
        });
      }

      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: 'Flight number already exists'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update flight',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/flights/:id - Delete flight
  async deleteFlight(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if flight has bookings
      const bookingsCount = await prisma.booking.count({
        where: { flightId: id }
      });

      if (bookingsCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete flight with existing bookings',
          bookingsCount
        });
      }

      await prisma.flight.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Flight deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting flight:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Flight not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete flight',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/flights/stats - Get flight statistics
  async getFlightStats(req: Request, res: Response) {
    try {
      const total = await prisma.flight.count();
      const scheduled = await prisma.flight.count({ where: { status: 'SCHEDULED' } });
      const delayed = await prisma.flight.count({ where: { status: 'DELAYED' } });
      const cancelled = await prisma.flight.count({ where: { status: 'CANCELLED' } });
      const boarding = await prisma.flight.count({ where: { status: 'BOARDING' } });
      const departed = await prisma.flight.count({ where: { status: 'DEPARTED' } });
      const arrived = await prisma.flight.count({ where: { status: 'ARRIVED' } });

      const tracking = await prisma.flight.count({ where: { trackingEnabled: true } });

      res.json({
        success: true,
        data: {
          total,
          byStatus: {
            scheduled,
            delayed,
            cancelled,
            boarding,
            departed,
            arrived
          },
          trackingEnabled: tracking
        }
      });
    } catch (error) {
      console.error('Error fetching flight stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch flight statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const flightController = new FlightController();
