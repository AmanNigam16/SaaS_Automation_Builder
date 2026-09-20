ALTER TABLE "LocalGoogleCredential"
ADD COLUMN "channelExpiration" TIMESTAMP(3);

CREATE TABLE "WorkflowTriggerState" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "triggerKind" TEXT NOT NULL,
  "cursor" TEXT,
  "checkpoint" JSONB,
  "nextRunAt" TIMESTAMP(3),
  "lastRunAt" TIMESTAMP(3),
  "leaseUntil" TIMESTAMP(3),
  "jobId" INTEGER,
  "jobTokenHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkflowTriggerState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkflowTriggerState_workflowId_key"
ON "WorkflowTriggerState"("workflowId");

CREATE INDEX "WorkflowTriggerState_triggerKind_nextRunAt_idx"
ON "WorkflowTriggerState"("triggerKind", "nextRunAt");

CREATE INDEX "WorkflowTriggerState_leaseUntil_idx"
ON "WorkflowTriggerState"("leaseUntil");

ALTER TABLE "WorkflowTriggerState"
ADD CONSTRAINT "WorkflowTriggerState_workflowId_fkey"
FOREIGN KEY ("workflowId") REFERENCES "Workflows"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
