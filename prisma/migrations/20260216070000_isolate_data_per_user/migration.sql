ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "userId" TEXT;

ALTER TABLE "Exchange"
ADD COLUMN IF NOT EXISTS "userId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_userId_fkey'
  ) THEN
    ALTER TABLE "Transaction"
    ADD CONSTRAINT "Transaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "UserAllowlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Exchange_userId_fkey'
  ) THEN
    ALTER TABLE "Exchange"
    ADD CONSTRAINT "Exchange_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "UserAllowlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Transaction_userId_createdAt_idx"
ON "Transaction"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Exchange_userId_createdAt_idx"
ON "Exchange"("userId", "createdAt");
