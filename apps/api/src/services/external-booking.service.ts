import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BookingSearchParams {
  localizador: string;
  sobrenome: string;
  origem?: string; // Opcional, mas ajuda a filtrar
}

export interface CreateExternalBookingData {
  bookingCode: string;
  lastName: string;
  firstName?: string;
  fullName: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureDate: Date;
  arrivalDate?: Date;
  seat?: string;
  class?: string;
  gate?: string;
  terminal?: string;
  checkInStatus?: string;
  bookingStatus?: string;
  email?: string;
  phone?: string;
  document?: string;
  source?: string;
  externalId?: string;
  purchaseDate?: Date;
  totalAmount?: number;
  autoUpdate?: boolean;
  rawData?: any;
}

class ExternalBookingService {
  /**
   * Busca uma reserva no banco de dados local
   * Modelo CVC: Localizador + Sobrenome
   */
  async searchBooking(params: BookingSearchParams) {
    const { localizador, sobrenome, origem } = params;

    console.log(`🔍 [ExternalBooking] Buscando reserva: ${localizador} - ${sobrenome}${origem ? ` - ${origem}` : ''}`);

    try {
      // Normalizar entrada
      const normalizedCode = localizador.toUpperCase().trim();
      const normalizedLastName = sobrenome.toUpperCase().trim();

      // Buscar no banco de dados
      // PostgreSQL usa ILIKE para busca case-insensitive
      const bookings = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "ExternalBooking"
        WHERE UPPER("bookingCode") = UPPER($1)
        AND (UPPER("lastName") = UPPER($2) OR UPPER("fullName") LIKE UPPER($3))
        ${origem ? 'AND UPPER("origin") = UPPER($4)' : ''}
        ORDER BY "departureDate" DESC
      `, normalizedCode, normalizedLastName, `%${normalizedLastName}%`, ...(origem ? [origem.toUpperCase().trim()] : []));

      if (bookings.length === 0) {
        console.log(`❌ [ExternalBooking] Nenhuma reserva encontrada para ${normalizedCode} - ${normalizedLastName}`);
        return null;
      }

      // Retornar a mais recente
      const booking = bookings[0];
      console.log(`✅ [ExternalBooking] Reserva encontrada: ${booking.id} - Voo ${booking.flightNumber}`);

      return {
        id: booking.id,
        bookingCode: booking.bookingCode,
        passengerName: booking.fullName,
        firstName: booking.firstName,
        lastName: booking.lastName,
        airline: booking.airline,
        flightNumber: booking.flightNumber,
        origin: booking.origin,
        destination: booking.destination,
        departureDate: booking.departureDate.toISOString(),
        arrivalDate: booking.arrivalDate?.toISOString(),
        flightDate: booking.departureDate.toISOString(),
        seat: booking.seat,
        class: booking.class,
        gate: booking.gate,
        terminal: booking.terminal,
        checkInStatus: booking.checkInStatus,
        status: booking.bookingStatus,
        email: booking.email,
        phone: booking.phone,
        document: booking.document,
        source: booking.source,
        purchaseDate: booking.purchaseDate?.toISOString(),
        totalAmount: booking.totalAmount,
        lastUpdated: booking.lastUpdated.toISOString(),
        createdAt: booking.createdAt.toISOString()
      };
    } catch (error) {
      console.error('❌ [ExternalBooking] Erro ao buscar reserva:', error);
      throw error;
    }
  }

  /**
   * Cria/Cadastra uma nova reserva externa
   * Modelo CVC: Permite usuário cadastrar sua reserva manualmente
   */
  async createBooking(data: CreateExternalBookingData) {
    console.log(`📝 [ExternalBooking] Cadastrando nova reserva: ${data.bookingCode} - ${data.lastName}`);

    try {
      const booking = await prisma.externalBooking.create({
        data: {
          bookingCode: data.bookingCode.toUpperCase().trim(),
          lastName: data.lastName.toUpperCase().trim(),
          firstName: data.firstName?.toUpperCase().trim(),
          fullName: data.fullName.trim(),
          airline: data.airline.toUpperCase().trim(),
          flightNumber: data.flightNumber.toUpperCase().trim(),
          origin: data.origin.toUpperCase().trim(),
          destination: data.destination.toUpperCase().trim(),
          departureDate: data.departureDate,
          arrivalDate: data.arrivalDate,
          seat: data.seat?.trim(),
          class: data.class?.trim(),
          gate: data.gate?.trim(),
          terminal: data.terminal?.trim(),
          checkInStatus: data.checkInStatus || 'PENDING',
          bookingStatus: data.bookingStatus || 'CONFIRMED',
          email: data.email?.trim(),
          phone: data.phone?.trim(),
          document: data.document?.trim(),
          source: data.source || 'MANUAL',
          externalId: data.externalId,
          purchaseDate: data.purchaseDate,
          totalAmount: data.totalAmount,
          autoUpdate: data.autoUpdate || false,
          rawData: data.rawData ? JSON.stringify(data.rawData) : null
        }
      });

      console.log(`✅ [ExternalBooking] Reserva cadastrada com sucesso: ${booking.id}`);

      // Se autoUpdate = true, log para indicar que monitoramento está ativo
      if (data.autoUpdate) {
        console.log(`📊 [ExternalBooking] Monitoramento automático ATIVADO para ${booking.bookingCode}`);
      }

      return {
        id: booking.id,
        bookingCode: booking.bookingCode,
        autoUpdate: booking.autoUpdate,
        message: data.autoUpdate
          ? 'Reserva cadastrada com sucesso! Monitoramento automático ativado - você será notificado sobre qualquer mudança.'
          : 'Reserva cadastrada com sucesso! Você pode consultá-la usando o localizador e sobrenome.'
      };
    } catch (error: any) {
      // Verificar se é erro de duplicata
      if (error.code === 'P2002') {
        console.log(`⚠️  [ExternalBooking] Reserva já existe: ${data.bookingCode}`);
        throw new Error('Já existe uma reserva cadastrada com este localizador, sobrenome e companhia aérea');
      }

      console.error('❌ [ExternalBooking] Erro ao cadastrar reserva:', error);
      throw error;
    }
  }

  /**
   * Atualiza dados de uma reserva existente
   */
  async updateBooking(bookingId: string, data: Partial<CreateExternalBookingData>) {
    console.log(`🔄 [ExternalBooking] Atualizando reserva: ${bookingId}`);

    try {
      const booking = await prisma.externalBooking.update({
        where: { id: bookingId },
        data: {
          ...(data.seat && { seat: data.seat }),
          ...(data.gate && { gate: data.gate }),
          ...(data.terminal && { terminal: data.terminal }),
          ...(data.checkInStatus && { checkInStatus: data.checkInStatus }),
          ...(data.bookingStatus && { bookingStatus: data.bookingStatus }),
          ...(data.departureDate && { departureDate: data.departureDate }),
          ...(data.arrivalDate && { arrivalDate: data.arrivalDate }),
          lastUpdated: new Date()
        }
      });

      console.log(`✅ [ExternalBooking] Reserva atualizada: ${booking.id}`);

      return booking;
    } catch (error) {
      console.error('❌ [ExternalBooking] Erro ao atualizar reserva:', error);
      throw error;
    }
  }

  /**
   * Lista todas as reservas (com paginação)
   */
  async listBookings(page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;

    const [bookings, total] = await Promise.all([
      prisma.externalBooking.findMany({
        skip,
        take: pageSize,
        orderBy: {
          departureDate: 'desc'
        }
      }),
      prisma.externalBooking.count()
    ]);

    return {
      bookings,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * Deleta uma reserva
   */
  async deleteBooking(bookingId: string) {
    console.log(`🗑️  [ExternalBooking] Deletando reserva: ${bookingId}`);

    try {
      await prisma.externalBooking.delete({
        where: { id: bookingId }
      });

      console.log(`✅ [ExternalBooking] Reserva deletada: ${bookingId}`);

      return { success: true, message: 'Reserva deletada com sucesso' };
    } catch (error) {
      console.error('❌ [ExternalBooking] Erro ao deletar reserva:', error);
      throw error;
    }
  }
}

// Singleton instance
let externalBookingServiceInstance: ExternalBookingService | null = null;

export function getExternalBookingService(): ExternalBookingService {
  if (!externalBookingServiceInstance) {
    externalBookingServiceInstance = new ExternalBookingService();
  }
  return externalBookingServiceInstance;
}

export default ExternalBookingService;
