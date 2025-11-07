import { Request, Response } from 'express';
import { prisma } from '@reservasegura/database';
import crypto from 'crypto';


export class TransactionController {
  // GET /api/transactions - List all transactions
  async getAllTransactions(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const userRole = (req as any).userRole;

      const {
        status,
        paymentMethod,
        dateFrom,
        dateTo,
        limit = '50',
        offset = '0'
      } = req.query;

      const where: any = {};

      // Regular users can only see their own transactions
      if (userRole !== 'ADMIN') {
        where.userId = userId;
      }

      if (status) where.status = status;
      if (paymentMethod) where.paymentMethod = paymentMethod;

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
        if (dateTo) where.createdAt.lte = new Date(dateTo as string);
      }

      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          booking: {
            include: {
              flight: {
                select: {
                  flightNumber: true,
                  origin: true,
                  destination: true,
                  airline: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      });

      const total = await prisma.transaction.count({ where });

      res.json({
        success: true,
        data: transactions,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        }
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/transactions/:id - Get single transaction
  async getTransactionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;
      const userRole = (req as any).userRole;

      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          booking: {
            include: {
              flight: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      // Check authorization
      if (userRole !== 'ADMIN' && transaction.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this transaction'
        });
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/transactions - Create new transaction (process payment)
  async createTransaction(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const {
        bookingId,
        paymentMethod,
        paymentProvider = 'MANUAL',
        metadata
      } = req.body;

      // Validate required fields
      if (!bookingId || !paymentMethod) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['bookingId', 'paymentMethod']
        });
      }

      // Check if booking exists and belongs to user
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { transaction: true }
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      if (booking.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized for this booking'
        });
      }

      // Check if booking already has a transaction
      if (booking.transaction) {
        return res.status(400).json({
          success: false,
          error: 'Booking already has a transaction',
          transactionId: booking.transaction.id
        });
      }

      // Generate unique transaction ID
      const transactionId = `TXN${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          bookingId,
          amount: booking.totalAmount,
          paymentMethod,
          paymentProvider,
          transactionId,
          status: 'PENDING',
          metadata: metadata ? JSON.stringify(metadata) : null
        },
        include: {
          booking: {
            include: {
              flight: {
                select: {
                  flightNumber: true,
                  origin: true,
                  destination: true,
                  airline: true
                }
              }
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Transaction created successfully'
      });
    } catch (error: any) {
      console.error('Error creating transaction:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to create transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT /api/transactions/:id/confirm - Confirm payment
  async confirmTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;
      const userRole = (req as any).userRole;
      const { metadata } = req.body;

      // Check if transaction exists
      const existingTransaction = await prisma.transaction.findUnique({
        where: { id },
        include: { booking: true }
      });

      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      // Check authorization
      if (userRole !== 'ADMIN' && existingTransaction.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized for this transaction'
        });
      }

      // Update transaction status
      const transaction = await prisma.transaction.update({
        where: { id },
        data: {
          status: 'SUCCESS',
          metadata: metadata ? JSON.stringify(metadata) : existingTransaction.metadata
        }
      });

      // Update booking payment status
      await prisma.booking.update({
        where: { id: existingTransaction.bookingId },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED'
        }
      });

      res.json({
        success: true,
        data: transaction,
        message: 'Payment confirmed successfully'
      });
    } catch (error) {
      console.error('Error confirming transaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT /api/transactions/:id/fail - Mark payment as failed
  async failTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;
      const userRole = (req as any).userRole;
      const { reason } = req.body;

      // Check if transaction exists
      const existingTransaction = await prisma.transaction.findUnique({
        where: { id }
      });

      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      // Check authorization
      if (userRole !== 'ADMIN' && existingTransaction.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized for this transaction'
        });
      }

      // Update transaction status
      const metadata = existingTransaction.metadata
        ? JSON.parse(existingTransaction.metadata)
        : {};

      metadata.failureReason = reason || 'Payment failed';

      const transaction = await prisma.transaction.update({
        where: { id },
        data: {
          status: 'FAILED',
          metadata: JSON.stringify(metadata)
        }
      });

      // Update booking payment status
      await prisma.booking.update({
        where: { id: existingTransaction.bookingId },
        data: {
          paymentStatus: 'FAILED'
        }
      });

      res.json({
        success: true,
        data: transaction,
        message: 'Transaction marked as failed'
      });
    } catch (error) {
      console.error('Error failing transaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/transactions/stats - Get transaction statistics
  async getTransactionStats(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const userRole = (req as any).userRole;

      const where = userRole !== 'ADMIN' ? { userId } : {};

      const total = await prisma.transaction.count({ where });
      const pending = await prisma.transaction.count({ where: { ...where, status: 'PENDING' } });
      const success = await prisma.transaction.count({ where: { ...where, status: 'SUCCESS' } });
      const failed = await prisma.transaction.count({ where: { ...where, status: 'FAILED' } });
      const refunded = await prisma.transaction.count({ where: { ...where, status: 'REFUNDED' } });

      // Total amounts
      const successfulTransactions = await prisma.transaction.findMany({
        where: { ...where, status: 'SUCCESS' },
        select: { amount: true }
      });

      const totalReceived = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);

      const pendingTransactions = await prisma.transaction.findMany({
        where: { ...where, status: 'PENDING' },
        select: { amount: true }
      });

      const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);

      res.json({
        success: true,
        data: {
          total,
          byStatus: {
            pending,
            success,
            failed,
            refunded
          },
          amounts: {
            totalReceived,
            totalPending,
            currency: 'BRL'
          }
        }
      });
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const transactionController = new TransactionController();
