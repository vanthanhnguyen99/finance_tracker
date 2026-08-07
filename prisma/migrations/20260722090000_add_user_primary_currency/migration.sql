ALTER TABLE "UserAllowlist"
ADD COLUMN IF NOT EXISTS "primaryCurrency" "Currency" NOT NULL DEFAULT 'DKK';
