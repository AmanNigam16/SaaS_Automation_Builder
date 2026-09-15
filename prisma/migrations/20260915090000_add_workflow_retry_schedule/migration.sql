ALTER TABLE "WorkflowRun"
  ADD COLUMN "retryAt" TIMESTAMP(3),
  ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "retryJobId" INTEGER,
  ADD COLUMN "retryTokenHash" TEXT;

CREATE INDEX "WorkflowRun_status_retryAt_idx"
  ON "WorkflowRun"("status", "retryAt");
