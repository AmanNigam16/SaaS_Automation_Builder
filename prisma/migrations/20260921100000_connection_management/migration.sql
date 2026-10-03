DROP INDEX IF EXISTS "Connections_type_key";

ALTER TABLE "Connections"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'CONNECTED',
ADD COLUMN "grantedPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN "lastErrorCode" TEXT;

CREATE UNIQUE INDEX "Connections_userId_type_key"
ON "Connections"("userId", "type");

CREATE INDEX "Connections_userId_idx"
ON "Connections"("userId");

CREATE TABLE "ConnectionAuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "accountLabel" TEXT,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConnectionAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConnectionAuditEvent_userId_createdAt_idx"
ON "ConnectionAuditEvent"("userId", "createdAt");

ALTER TABLE "ConnectionAuditEvent"
ADD CONSTRAINT "ConnectionAuditEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("clerkId")
ON DELETE CASCADE ON UPDATE CASCADE;
