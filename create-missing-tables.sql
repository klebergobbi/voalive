-- Criar tabela Notification se não existir
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "monitorId" TEXT,
    "bookingCode" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "BookingMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_monitorId_idx" ON "Notification"("monitorId");
CREATE INDEX IF NOT EXISTS "Notification_bookingCode_idx" ON "Notification"("bookingCode");
CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");

-- Criar tabela BookingChange se não existir  
CREATE TABLE IF NOT EXISTS "BookingChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monitorId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "oldFlightNumber" TEXT,
    "newFlightNumber" TEXT,
    "oldSeat" TEXT,
    "newSeat" TEXT,
    "oldDepartureTime" TIMESTAMP(3),
    "newDepartureTime" TIMESTAMP(3),
    "oldCheckInStatus" TEXT,
    "newCheckInStatus" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    CONSTRAINT "BookingChange_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "BookingMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BookingChange_monitorId_idx" ON "BookingChange"("monitorId");
CREATE INDEX IF NOT EXISTS "BookingChange_detectedAt_idx" ON "BookingChange"("detectedAt");

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS "ExternalBooking_bookingCode_idx" ON "ExternalBooking"("bookingCode");
CREATE INDEX IF NOT EXISTS "ExternalBooking_departureDate_idx" ON "ExternalBooking"("departureDate");

