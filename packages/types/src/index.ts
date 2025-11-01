import { z } from 'zod';

export * from './airlines';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['USER', 'ADMIN', 'AGENT']),
  isActive: z.boolean(),
});

export const CheckInStatus = z.enum(['OPEN', 'CLOSED', 'NOT_AVAILABLE', 'COMPLETED']);
export const FlightCategory = z.enum(['ALL', 'UPCOMING', 'PENDING', 'CHECKIN_OPEN', 'CHECKIN_CLOSED', 'FLOWN']);

export const FlightSchema = z.object({
  id: z.string(),
  flightNumber: z.string(),
  origin: z.string(),
  destination: z.string(),
  departureTime: z.date(),
  arrivalTime: z.date(),
  airline: z.string(),
  aircraft: z.string(),
  status: z.enum(['SCHEDULED', 'DELAYED', 'CANCELLED', 'BOARDING', 'DEPARTED', 'ARRIVED', 'CONFIRMADO']),
  checkInStatus: CheckInStatus.optional(),
  locator: z.string().optional(),
  passengerFirstName: z.string().optional(),
  passengerLastName: z.string().optional(),

  // Campos de monitoramento em tempo real
  realDepartureTime: z.date().optional(),
  estimatedDepartureTime: z.date().optional(),
  realArrivalTime: z.date().optional(),
  estimatedArrivalTime: z.date().optional(),
  departureGate: z.string().optional(),
  departureTerminal: z.string().optional(),
  arrivalGate: z.string().optional(),
  arrivalTerminal: z.string().optional(),
  delayMinutes: z.number().optional(),

  // Posição GPS em tempo real
  currentLatitude: z.number().optional(),
  currentLongitude: z.number().optional(),
  currentAltitude: z.number().optional(),
  currentSpeed: z.number().optional(),
  currentHeading: z.number().optional(),

  // Metadados
  trackingEnabled: z.boolean().optional(),
  lastTrackedAt: z.date().optional(),
});

export const BookingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  flightId: z.string(),
  bookingCode: z.string(),
  locator: z.string(),
  passengers: z.array(z.object({
    firstName: z.string(),
    lastName: z.string(),
    documentType: z.string(),
    documentNumber: z.string(),
    dateOfBirth: z.date(),
    nationality: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  })),
  totalAmount: z.number(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
  paymentStatus: z.enum(['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED']),
  checkInStatus: CheckInStatus.optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

export const FlightSearchSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  departureDate: z.date(),
  returnDate: z.date().optional(),
  passengers: z.number().min(1).max(10),
  tripType: z.enum(['ONE_WAY', 'ROUND_TRIP']),
});

export type User = z.infer<typeof UserSchema>;
export type Flight = z.infer<typeof FlightSchema>;
export type Booking = z.infer<typeof BookingSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type FlightSearch = z.infer<typeof FlightSearchSchema>;
export type CheckInStatusType = z.infer<typeof CheckInStatus>;
export type FlightCategoryType = z.infer<typeof FlightCategory>;