import { Router } from 'express';
import { getExternalBookingService, BookingSearchParams, CreateExternalBookingData } from '../services/external-booking.service';

const router = Router();
const externalBookingService = getExternalBookingService();

/**
 * POST /search
 * Busca uma reserva pelo localizador + sobrenome (Modelo CVC)
 */
router.post('/search', async (req, res) => {
  try {
    const { localizador, sobrenome, origem }: BookingSearchParams = req.body;

    // Validações
    if (!localizador || !sobrenome) {
      return res.status(400).json({
        success: false,
        error: 'Localizador e sobrenome são obrigatórios'
      });
    }

    // Buscar reserva
    const booking = await externalBookingService.searchBooking({
      localizador,
      sobrenome,
      origem
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Reserva não encontrada',
        message: 'Não encontramos uma reserva com este localizador e sobrenome.',
        suggestion: 'Verifique se os dados estão corretos ou cadastre sua reserva manualmente.'
      });
    }

    return res.json({
      success: true,
      data: booking,
      message: 'Reserva encontrada com sucesso!'
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar reserva:', error);

    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar reserva',
      message: error.message
    });
  }
});

/**
 * POST /register
 * Cadastra uma nova reserva (Modelo CVC - usuário cadastra manualmente)
 */
router.post('/register', async (req, res) => {
  try {
    const data: CreateExternalBookingData = req.body;

    // Validações obrigatórias
    const requiredFields = [
      'bookingCode',
      'lastName',
      'fullName',
      'airline',
      'flightNumber',
      'origin',
      'destination',
      'departureDate'
    ];

    const missingFields = requiredFields.filter(field => !data[field as keyof CreateExternalBookingData]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios faltando',
        missingFields
      });
    }

    // Converter departureDate para Date se necessário
    if (typeof data.departureDate === 'string') {
      data.departureDate = new Date(data.departureDate);
    }

    if (data.arrivalDate && typeof data.arrivalDate === 'string') {
      data.arrivalDate = new Date(data.arrivalDate);
    }

    if (data.purchaseDate && typeof data.purchaseDate === 'string') {
      data.purchaseDate = new Date(data.purchaseDate);
    }

    // Cadastrar reserva
    const result = await externalBookingService.createBooking(data);

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Reserva cadastrada com sucesso! Você pode consultá-la usando o localizador e sobrenome.'
    });
  } catch (error: any) {
    console.error('❌ Erro ao cadastrar reserva:', error);

    // Se for erro de duplicata, retornar 409 Conflict
    if (error.message && error.message.includes('Já existe uma reserva')) {
      return res.status(409).json({
        success: false,
        error: 'Reserva duplicada',
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erro ao cadastrar reserva',
      message: error.message
    });
  }
});

/**
 * GET /list
 * Lista todas as reservas (com paginação)
 */
router.get('/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await externalBookingService.listBookings(page, pageSize);

    return res.json({
      success: true,
      data: result.bookings,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error('❌ Erro ao listar reservas:', error);

    return res.status(500).json({
      success: false,
      error: 'Erro ao listar reservas',
      message: error.message
    });
  }
});

/**
 * PUT /:id
 * Atualiza uma reserva existente
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data: Partial<CreateExternalBookingData> = req.body;

    // Converter datas se necessário
    if (data.departureDate && typeof data.departureDate === 'string') {
      data.departureDate = new Date(data.departureDate);
    }

    if (data.arrivalDate && typeof data.arrivalDate === 'string') {
      data.arrivalDate = new Date(data.arrivalDate);
    }

    const booking = await externalBookingService.updateBooking(id, data);

    return res.json({
      success: true,
      data: booking,
      message: 'Reserva atualizada com sucesso!'
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar reserva:', error);

    return res.status(500).json({
      success: false,
      error: 'Erro ao atualizar reserva',
      message: error.message
    });
  }
});

/**
 * DELETE /:id
 * Deleta uma reserva
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await externalBookingService.deleteBooking(id);

    return res.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('❌ Erro ao deletar reserva:', error);

    return res.status(500).json({
      success: false,
      error: 'Erro ao deletar reserva',
      message: error.message
    });
  }
});

export default router;
