DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD');
  END IF;
END
$$;

ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";

UPDATE "Transaction"
SET "paymentMethod" = 'CASH'
WHERE "type" = 'EXPENSE' AND "paymentMethod" IS NULL;
