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

    // Validação dos dados obrigatórios
    if (!localizador || !sobrenome) {
      return res.status(400).json({
        success: false,
        error: 'Localizador e sobrenome são obrigatórios'
      });
    }

    // Validação do formato do localizador
    if (localizador.length < 5 || localizador.length > 8) {
      return res.status(400).json({
        success: false,
        error: 'Localizador deve ter entre 5 e 8 caracteres'
      });
    }

    console.log(`🔍 Iniciando busca de reserva: ${localizador} - ${sobrenome}`);

    // Buscar nos sites das companhias aéreas
    const bookingData = await airlineBookingService.searchBooking({
      localizador: localizador.toUpperCase().trim(),
      sobrenome: sobrenome.toUpperCase().trim(),
      origem: origem?.toUpperCase().trim()
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
        sobrenome: sobrenome.toUpperCase().trim(),
        origem: origem?.toUpperCase().trim()
      });

      if (alternativeData) {
        return res.json({
          success: true,
          data: alternativeData,
          source: 'alternative'
        });
      }

      return res.status(404).json({
        success: false,
        error: 'Reserva não encontrada nas companhias aéreas consultadas'
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