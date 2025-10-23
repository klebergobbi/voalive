import { Router } from 'express';
import { flightSearchController } from '../controllers/flight-search.controller';

const router = Router();

/**
 * POST /search
 * Busca informações de vôo em tempo real pelo número do vôo
 * Usa APIs: AirLabs → Aviationstack → FlightRadar24
 */
router.post('/search', (req, res) => flightSearchController.searchFlight(req, res));

/**
 * GET /airport/:airportCode
 * Busca vôos por aeroporto (partidas/chegadas)
 * Query params: type=departures|arrivals
 */
router.get('/airport/:airportCode', (req, res) =>
  flightSearchController.searchFlightsByAirport(req, res)
);

/**
 * GET /route
 * Busca vôos por rota (origem → destino)
 * Query params: origin, destination, date (optional)
 */
router.get('/route', (req, res) =>
  flightSearchController.searchFlightsByRoute(req, res)
);

/**
 * GET /live
 * Busca vôos em tempo real (no ar)
 * Query params: airline, country (optional)
 */
router.get('/live', (req, res) =>
  flightSearchController.searchLiveFlights(req, res)
);

export default router;
