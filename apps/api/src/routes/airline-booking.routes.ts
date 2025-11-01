import { Router } from 'express';
import { getAirlineBookingService, BookingSearchRequest } from '../services/airline-booking.service';

const router = Router();
const airlineBookingService = getAirlineBookingService();

/**
 * POST /search-booking
 * Busca dados de reserva usando localizador e sobrenome
 */
router.post('/search-booking', async (req, res) => {
  try {
    const { localizador, sobrenome, origem }: BookingSearchRequest = req.body;

    // Validação do localizador (sempre obrigatório)
    if (!localizador) {
      return res.status(400).json({
        success: false,
        error: 'Localizador é obrigatório'
      });
    }

    // Validação do formato do localizador
    if (localizador.length < 5 || localizador.length > 8) {
      return res.status(400).json({
        success: false,
        error: 'Localizador deve ter entre 5 e 8 caracteres'
      });
    }

    // Detectar se é GOL (G3 ou 6 caracteres)
    const isGol = localizador.toUpperCase().trim().startsWith('G3') || localizador.trim().length === 6;

    // Validação específica para GOL
    if (isGol) {
      if (!sobrenome || !sobrenome.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Para reservas GOL, o sobrenome é obrigatório'
        });
      }
      if (!origem || !origem.trim() || origem.trim().length !== 3) {
        return res.status(400).json({
          success: false,
          error: 'Para reservas GOL, a origem (código IATA de 3 letras) é obrigatória'
        });
      }
    }

    console.log(`🔍 Iniciando busca de reserva: ${localizador}${sobrenome ? ' - ' + sobrenome : ''}${origem ? ' - ' + origem : ''}`);

    // Buscar nos sites das companhias aéreas
    const bookingData = await airlineBookingService.searchBooking({
      localizador: localizador.toUpperCase().trim(),
      sobrenome: sobrenome?.toUpperCase().trim() || '',
      origem: origem?.toUpperCase().trim() || ''
    });

    if (bookingData) {
      console.log(`✅ Reserva encontrada para ${localizador}`);

      return res.json({
        success: true,
        data: bookingData
      });
    } else {
      console.log(`❌ Reserva não encontrada para ${localizador}`);

      // Tentar método alternativo
      const alternativeData = await airlineBookingService.searchBookingAlternative({
        localizador: localizador.toUpperCase().trim(),
        sobrenome: sobrenome?.toUpperCase().trim() || '',
        origem: origem?.toUpperCase().trim() || ''
      });

      if (alternativeData) {
        return res.json({
          success: true,
          data: alternativeData,
          source: 'alternative'
        });
      }

      // Retornar mensagem detalhada para o usuário
      return res.status(404).json({
        success: false,
        error: 'Reserva não encontrada',
        message: 'Não foi possível localizar sua reserva. Códigos de reserva (PNR) não são acessíveis via APIs públicas de rastreamento de voos.',
        instructions: [
          'Para encontrar sua reserva, você precisa informar o NÚMERO DO VOO (exemplo: G31234, LA4567)',
          'Ou você pode cadastrar sua reserva manualmente no sistema com todas as informações',
          'Com o número do voo, conseguimos buscar dados atualizados em tempo real'
        ],
        helpLink: '/help/booking-search'
      });
    }
  } catch (error) {
    console.error('❌ Erro ao buscar reserva:', error);

    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor ao buscar reserva'
    });
  }
});

/**
 * GET /airlines
 * Lista as companhias aéreas suportadas
 */
router.get('/airlines', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        code: 'GOL',
        name: 'GOL Linhas Aéreas',
        website: 'https://www.voegol.com.br'
      },
      {
        code: 'LATAM',
        name: 'LATAM Airlines',
        website: 'https://www.latam.com'
      },
      {
        code: 'AZUL',
        name: 'Azul Linhas Aéreas',
        website: 'https://www.azul.com.br'
      }
    ]
  });
});

/**
 * POST /validate-localizador
 * Valida formato do localizador e sugere companhia
 */
router.post('/validate-localizador', (req, res) => {
  try {
    const { localizador } = req.body;

    if (!localizador) {
      return res.status(400).json({
        success: false,
        error: 'Localizador é obrigatório'
      });
    }

    const code = localizador.toUpperCase().trim();

    // Validações básicas
    const validations = {
      isValid: code.length >= 5 && code.length <= 8 && /^[A-Z0-9]+$/.test(code),
      length: code.length,
      format: /^[A-Z0-9]+$/.test(code),
      suggestedAirline: 'GOL' // padrão
    };

    // Detectar companhia baseada no padrão
    if (code.startsWith('G3') || code.includes('GOL')) {
      validations.suggestedAirline = 'GOL';
    } else if (code.startsWith('LA') || code.startsWith('JJ')) {
      validations.suggestedAirline = 'LATAM';
    } else if (code.startsWith('AD') || code.includes('AZUL')) {
      validations.suggestedAirline = 'AZUL';
    }

    return res.json({
      success: true,
      data: validations
    });
  } catch (error) {
    console.error('Erro ao validar localizador:', error);

    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default router;
/**
 * POST /register-booking
 * Cadastra manualmente uma reserva no sistema
 */
router.post('/register-booking', async (req, res) => {
  try {
    const {
      bookingCode,
      lastName,
      flightNumber,
      origin,
      destination,
      departureDate,
      departureTime,
      arrivalTime,
      airline,
      seat,
      gate,
      terminal,
      email
    } = req.body;

    // Validações obrigatórias
    if (!bookingCode || !lastName || !flightNumber || !origin || !destination || !departureDate) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: bookingCode, lastName, flightNumber, origin, destination, departureDate'
      });
    }

    const { PrismaClient } = require('@reservasegura/database');
    const prisma = new PrismaClient();

    try {
      // Verificar se já existe reserva com este código
      const existingBooking = await prisma.booking.findUnique({
        where: { bookingCode: bookingCode.toUpperCase() }
      });

      if (existingBooking) {
        await prisma.$disconnect();
        return res.status(409).json({
          success: false,
          error: 'Já existe uma reserva com este código de reserva'
        });
      }

      // Buscar ou criar usuário baseado no email
      let user = null;
      if (email) {
        user = await prisma.user.findUnique({ where: { email } });
      }

      if (!user) {
        // Criar usuário padrão
        const tempEmail = email || `${lastName.toLowerCase()}@temp.com`;
        user = await prisma.user.create({
          data: {
            email: tempEmail,
            name: lastName,
            password: 'temp123', // Senha temporária
            role: 'USER'
          }
        });
      }

      // Criar ou buscar voo
      let flight = await prisma.flight.findUnique({
        where: { flightNumber: flightNumber.toUpperCase() }
      });

      const departureDateTime = new Date(`${departureDate}T${departureTime || '00:00'}:00Z`);
      const arrivalDateTime = new Date(`${departureDate}T${arrivalTime || '02:00'}:00Z`);

      if (!flight) {
        flight = await prisma.flight.create({
          data: {
            flightNumber: flightNumber.toUpperCase(),
            origin: origin.toUpperCase(),
            destination: destination.toUpperCase(),
            departureTime: departureDateTime,
            arrivalTime: arrivalDateTime,
            airline: airline || 'GOL',
            aircraft: 'B737',
            availableSeats: 150,
            totalSeats: 180,
            basePrice: 500.00,
            status: 'SCHEDULED',
            departureGate: gate || null,
            departureTerminal: terminal || null
          }
        });
      }

      // Criar reserva
      const booking = await prisma.booking.create({
        data: {
          userId: user.id,
          flightId: flight.id,
          bookingCode: bookingCode.toUpperCase(),
          passengers: JSON.stringify([{
            firstName: '',
            lastName: lastName.toUpperCase(),
            document: '',
            seat: seat || null
          }]),
          totalAmount: 500.00,
          status: 'CONFIRMED',
          paymentStatus: 'PAID'
        },
        include: {
          flight: true,
          user: true
        }
      });

      await prisma.$disconnect();

      console.log(`✅ Reserva ${bookingCode} cadastrada com sucesso`);

      return res.status(201).json({
        success: true,
        message: 'Reserva cadastrada com sucesso',
        data: {
          bookingCode: booking.bookingCode,
          flightNumber: flight.flightNumber,
          route: `${flight.origin} → ${flight.destination}`,
          departure: flight.departureTime,
          passenger: lastName
        }
      });
    } catch (dbError) {
      await prisma.$disconnect();
      throw dbError;
    }
  } catch (error) {
    console.error('❌ Erro ao cadastrar reserva:', error);

    return res.status(500).json({
      success: false,
      error: 'Erro ao cadastrar reserva',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});
