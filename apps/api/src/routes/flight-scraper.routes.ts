import { Router } from 'express';
import { FlightScraperController } from '../controllers/flight-scraper.controller';

const router = Router();
const controller = new FlightScraperController();

// Manual scraping routes
router.post('/scrape/flight', controller.scrapeFlight.bind(controller));
router.post('/scrape/airport', controller.scrapeAirport.bind(controller));

// Search and filter routes (must come before parameterized routes)
router.get('/flights/search', controller.searchFlights.bind(controller));
router.get('/flights/recent', controller.getRecentFlights.bind(controller));

// Data retrieval routes
router.get('/flights/:flightNumber', controller.getFlightData.bind(controller));
router.get('/airports/:airportCode/flights', controller.getAirportFlights.bind(controller));

// Scheduler management routes
router.post('/scheduler/start', controller.startScheduler.bind(controller));
router.post('/scheduler/stop', controller.stopScheduler.bind(controller));
router.get('/stats', controller.getStats.bind(controller));

export { router as flightScraperRoutes };