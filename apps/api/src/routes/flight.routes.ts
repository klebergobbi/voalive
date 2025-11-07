import { Router } from 'express';
import { flightController } from '../controllers/flight.controller';

const router = Router();

// Statistics endpoint
router.get('/stats', flightController.getFlightStats.bind(flightController));

// CRUD endpoints
router.get('/', flightController.getAllFlights.bind(flightController));
router.get('/:id', flightController.getFlightById.bind(flightController));
router.post('/', flightController.createFlight.bind(flightController));
router.put('/:id', flightController.updateFlight.bind(flightController));
router.delete('/:id', flightController.deleteFlight.bind(flightController));

export { router as flightRoutes };
