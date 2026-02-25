CREATE INDEX IF NOT EXISTS "Transaction_userId_type_currency_createdAt_idx"
ON "Transaction"("userId", "type", "currency", "createdAt");
