-- Migration: add_notification_system
-- Created: 2025-11-04
-- Description: Adiciona sistema de notificações e contadores de falha de scraping

BEGIN;

-- 1. Adicionar campos em ExternalBooking
ALTER TABLE "ExternalBooking"
  ADD COLUMN IF NOT EXISTS "scrapingFailures" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastScrapingError" TEXT;

-- 2. Modificar Notification para tornar userId opcional
ALTER TABLE "Notification"
  ALTER COLUMN "userId" DROP NOT NULL;

-- 3. Adicionar novos campos em Notification
ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "bookingCode" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" TEXT,
  ADD COLUMN IF NOT EXISTS "actionUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "read" BOOLEAN NOT NULL DEFAULT false;

-- 4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS "Notification_bookingCode_idx" ON "Notification"("bookingCode");
CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");
CREATE INDEX IF NOT EXISTS "Notification_priority_idx" ON "Notification"("priority");

-- 5. Verificar mudanças
DO $$
BEGIN
  RAISE NOTICE '✅ Migração aplicada com sucesso!';
  RAISE NOTICE '   - ExternalBooking: campos scrapingFailures e lastScrapingError adicionados';
  RAISE NOTICE '   - Notification: userId agora é opcional';
  RAISE NOTICE '   - Notification: campos bookingCode, metadata, actionUrl, read adicionados';
  RAISE NOTICE '   - Índices criados para melhor performance';
END $$;

COMMIT;
