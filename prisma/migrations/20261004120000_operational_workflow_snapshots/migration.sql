ALTER TABLE "Workflows"
ADD COLUMN "publishedFlowPath" TEXT,
ADD COLUMN "draftVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "publishedVersion" INTEGER;

UPDATE "Workflows"
SET "publishedFlowPath" = "flowPath",
    "publishedVersion" = 1
WHERE "publish" = TRUE AND "flowPath" IS NOT NULL;

ALTER TABLE "WorkflowRun"
ADD COLUMN "workflowVersion" INTEGER,
ADD COLUMN "executionPlan" JSONB;
