import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/logout', authController.logout.bind(authController));

// Protected routes
router.get('/me', authMiddleware, authController.getMe.bind(authController));
router.put('/update-profile', authMiddleware, authController.updateProfile.bind(authController));
router.put('/change-password', authMiddleware, authController.changePassword.bind(authController));

export { router as authRoutes };
