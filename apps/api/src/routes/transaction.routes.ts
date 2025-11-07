import { Router } from 'express';
import { transactionController } from '../controllers/transaction.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All transaction routes require authentication
router.use(authMiddleware);

// Statistics endpoint
router.get('/stats', transactionController.getTransactionStats.bind(transactionController));

// CRUD endpoints
router.get('/', transactionController.getAllTransactions.bind(transactionController));
router.get('/:id', transactionController.getTransactionById.bind(transactionController));
router.post('/', transactionController.createTransaction.bind(transactionController));

// Payment status endpoints
router.put('/:id/confirm', transactionController.confirmTransaction.bind(transactionController));
router.put('/:id/fail', transactionController.failTransaction.bind(transactionController));

export { router as transactionRoutes };
