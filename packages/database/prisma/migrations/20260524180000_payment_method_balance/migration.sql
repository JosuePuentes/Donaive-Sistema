-- Saldo disponible por método de pago (caja / banco operativo)
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "balance" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- Relación explícita método → cuenta (si no existía en BD)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_methods_bank_account_id_fkey'
  ) THEN
    ALTER TABLE "payment_methods"
      ADD CONSTRAINT "payment_methods_bank_account_id_fkey"
      FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
