ALTER TABLE "UserAllowlist"
ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

DROP TABLE IF EXISTS "PasskeyCredential";
DROP TABLE IF EXISTS "WebAuthnChallenge";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PasskeyStatus') THEN
    DROP TYPE "PasskeyStatus";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChallengeType') THEN
    DROP TYPE "ChallengeType";
  END IF;
END $$;
