ALTER TABLE "LocalGoogleCredential"
ADD COLUMN "refreshToken" TEXT,
ADD COLUMN "expiryDate" TIMESTAMP(3),
ADD COLUMN "grantedScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "accountEmail" TEXT,
ADD COLUMN "accountName" TEXT,
ADD COLUMN "webhookToken" TEXT;
