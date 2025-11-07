import { Request, Response } from 'express';
import { prisma } from '@reservasegura/database';


export class BookingController {
  // GET /api/bookings - List all bookings (user's bookings or all for admin)
  async getAllBookings(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const userRole = (req as any).userRole;

      const {
        status,
        paymentStatus,
        flightId,
        dateFrom,
        dateTo,
        limit = '50',
        offset = '0'
      } = req.query;

      const where: any = {};

      // Regular users can only see their own bookings
      if (userRole !== 'ADMIN') {
        where.userId = userId;
      }

      if (status) where.status = status;
      if (paymentStatus) where.paymentStatus = paymentStatus;
      if (flightId) where.flightId = flightId;

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
        if (dateTo) where.createdAt.lte = new Date(dateTo as string);
      }

      const bookings = await prisma.booking.findMany({
        where,
        include: {
          flight: {
            select: {
              flightNumber: true,
              origin: true,
              destination: true,
              departureTime: true,
              arrivalTime: true,
              airline: true,
              status: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          transaction: true
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      });

      const total = await prisma.booking.count({ where });

      res.json({
        success: true,
        data: bookings,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        }
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/bookings/:id - Get single booking by ID
  async getBookingById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;
      const userRole = (req as any).userRole;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          flight: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          transaction: true
        }
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      // Check authorization - user can only see their own bookings
      if (userRole !== 'ADMIN' && booking.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this booking'
        });
      }

      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      console.error('Error fetching booking:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/bookings - Create new booking
  async createBooking(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const {
        flightId,
        passengers,
        totalAmount,
        status = 'PENDING',
        paymentStatus = 'PENDING'
      } = req.body;

      // Validate required fields
      if (!flightId || !passengers || !totalAmount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['flightId', 'passengers', 'totalAmount']
        });
      }

      // Validate passengers is an array
      if (!Array.isArray(passengers) || passengers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Passengers must be a non-empty array'
        });
      }

      // Check if flight exists
      const flight = await prisma.flight.findUnique({
        where: { id: flightId }
      });

      if (!flight) {
        return res.status(404).json({
          success: false,
          error: 'Flight not found'
        });
      }

      // Check available seats
      if (flight.availableSeats < passengers.length) {
        return res.status(400).json({
          success: false,
          error: 'Not enough available seats',
          available: flight.availableSeats,
          requested: passengers.length
        });
      }

      // Generate unique booking code
      const bookingCode = `BK${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          userId,
          flightId,
          bookingCode,
          passengers: JSON.stringify(passengers),
          totalAmount,
          status,
          paymentStatus
        },
        include: {
          flight: {
            select: {
              flightNumber: true,
              origin: true,
              destination: true,
              departureTime: true,
              arrivalTime: true,
              airline: true
            }
          }
        }
      });

      // Update available seats
      await prisma.flight.update({
        where: { id: flightId },
        data: {
          availableSeats: flight.availableSeats - passengers.length
        }
      });

      res.status(201).json({
        success: true,
        data: booking,
        message: 'Booking created successfully'
      });
    } catch (error: any) {
      console.error('Error creating booking:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to create booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT /api/bookings/:id - Update booking
  async updateBooking(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;
      const userRole = (req as any).userRole;
      const updateData = { ...req.body };

      // Check if booking exists and user has permission
      const existingBooking = await prisma.booking.findUnique({
        where: { id }
      });

      if (!existingBooking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      // Check authorization
      if (userRole !== 'ADMIN' && existingBooking.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this booking'
        });
      }

      // Don't allow updating userId or flightId
      delete updateData.userId;
      delete updateData.flightId;
      delete updateData.bookingCode;

      // Convert passengers array to JSON string if provided
      if (updateData.passengers && Array.isArray(updateData.passengers)) {
        updateData.passengers = JSON.stringify(updateData.passengers);
      }

      const booking = await prisma.booking.update({
        where: { id },
        data: updateData,
        include: {
          flight: {
            select: {
              flightNumber: true,
              origin: true,
              destination: true,
              departureTime: true,
              arrivalTime: true,
              airline: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: booking,
        message: 'Booking updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating booking:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/bookings/:id - Cancel booking (soft delete)
  async cancelBooking(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;
      const userRole = (req as any).userRole;

      // Check if booking exists
      const existingBooking = await prisma.booking.findUnique({
        where: { id },
        include: {
          flight: true
        }
      });

      if (!existingBooking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      // Check authorization
      if (userRole !== 'ADMIN' && existingBooking.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to cancel this booking'
        });
      }

      // Check if already cancelled
      if (existingBooking.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          error: 'Booking is already cancelled'
        });
      }

      // Cancel booking (soft delete)
      const booking = await prisma.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED'
        }
      });

      // Restore available seats
      const passengers = JSON.parse(existingBooking.passengers);
      await prisma.flight.update({
        where: { id: existingBooking.flightId },
        data: {
          availableSeats: existingBooking.flight.availableSeats + passengers.length
        }
      });

      res.json({
        success: true,
        data: booking,
        message: 'Booking cancelled successfully'
      });
    } catch (error: any) {
      console.error('Error cancelling booking:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to cancel booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/bookings/stats - Get booking statistics
  async getBookingStats(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const userRole = (req as any).userRole;

      const where = userRole !== 'ADMIN' ? { userId } : {};

      const total = await prisma.booking.count({ where });
      const pending = await prisma.booking.count({ where: { ...where, status: 'PENDING' } });
      const confirmed = await prisma.booking.count({ where: { ...where, status: 'CONFIRMED' } });
      const cancelled = await prisma.booking.count({ where: { ...where, status: 'CANCELLED' } });
      const completed = await prisma.booking.count({ where: { ...where, status: 'COMPLETED' } });

      const paymentPending = await prisma.booking.count({ where: { ...where, paymentStatus: 'PENDING' } });
      const paid = await prisma.booking.count({ where: { ...where, paymentStatus: 'PAID' } });

      // Total revenue
      const bookings = await prisma.booking.findMany({
        where: { ...where, paymentStatus: 'PAID' },
        select: { totalAmount: true }
      });

      const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);

      res.json({
        success: true,
        data: {
          total,
          byStatus: {
            pending,
            confirmed,
            cancelled,
            completed
          },
          byPaymentStatus: {
            pending: paymentPending,
            paid
          },
          revenue: {
            total: totalRevenue,
            currency: 'BRL'
          }
        }
      });
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch booking statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const bookingController = new BookingController();
