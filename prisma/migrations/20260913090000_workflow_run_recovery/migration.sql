ALTER TABLE "WorkflowStepRun"
  ADD COLUMN "retryable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "creditCharged" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "errorCode" TEXT;
