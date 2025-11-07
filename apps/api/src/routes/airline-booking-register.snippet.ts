
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
