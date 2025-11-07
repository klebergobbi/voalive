import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All booking routes require authentication
router.use(authMiddleware);

// Statistics endpoint
router.get('/stats', bookingController.getBookingStats.bind(bookingController));

// CRUD endpoints
router.get('/', bookingController.getAllBookings.bind(bookingController));
router.get('/:id', bookingController.getBookingById.bind(bookingController));
router.post('/', bookingController.createBooking.bind(bookingController));
router.put('/:id', bookingController.updateBooking.bind(bookingController));
router.delete('/:id', bookingController.cancelBooking.bind(bookingController));

export { router as bookingRoutes };
