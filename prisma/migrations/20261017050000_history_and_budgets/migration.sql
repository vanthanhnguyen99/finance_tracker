CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE "Budget" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "currency" "Currency" NOT NULL,
  "scope" TEXT NOT NULL,
  "category" TEXT,
  "scopeKey" TEXT NOT NULL,
  "limitMinor" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Budget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAllowlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Budget_limit_check" CHECK ("limitMinor" > 0),
  CONSTRAINT "Budget_month_check" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND substring("month", 1, 4) <> '0000'),
  CONSTRAINT "Budget_scope_check" CHECK (
    ("scope" = 'TOTAL' AND "category" IS NULL AND "scopeKey" = 'TOTAL') OR
    ("scope" = 'UNCATEGORIZED' AND "category" IS NULL AND "scopeKey" = 'UNCATEGORIZED') OR
    ("scope" = 'CATEGORY' AND "category" IS NOT NULL AND length(btrim("category")) > 0 AND "scopeKey" = 'CATEGORY:' || "category")
  )
);
CREATE UNIQUE INDEX "Budget_userId_month_currency_scopeKey_key" ON "Budget"("userId", "month", "currency", "scopeKey");
CREATE INDEX "Transaction_userId_createdAt_id_idx" ON "Transaction"("userId", "createdAt" DESC, "id" DESC);
CREATE INDEX "Exchange_userId_createdAt_id_idx" ON "Exchange"("userId", "createdAt" DESC, "id" DESC);
