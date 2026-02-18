DO $$
BEGIN
  CREATE TYPE "PasswordResetRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PasswordResetRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "newPasswordHash" TEXT NOT NULL,
  "status" "PasswordResetRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetRequest_userId_fkey'
  ) THEN
    ALTER TABLE "PasswordResetRequest"
    ADD CONSTRAINT "PasswordResetRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "UserAllowlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PasswordResetRequest_userId_status_createdAt_idx"
ON "PasswordResetRequest"("userId", "status", "createdAt");
