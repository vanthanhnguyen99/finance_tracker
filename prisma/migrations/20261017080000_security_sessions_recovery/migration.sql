CREATE TABLE "PasswordRecoveryToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordRecoveryToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordRecoveryToken_tokenHash_key" ON "PasswordRecoveryToken"("tokenHash");
CREATE INDEX "PasswordRecoveryToken_userId_idx" ON "PasswordRecoveryToken"("userId");
ALTER TABLE "PasswordRecoveryToken" ADD CONSTRAINT "PasswordRecoveryToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAllowlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Retire sessions and anonymous replacement-password requests from the old protocol.
DELETE FROM "Session";
UPDATE "PasswordResetRequest" SET "status" = 'REJECTED', "reviewedAt" = CURRENT_TIMESTAMP WHERE "status" = 'PENDING';
