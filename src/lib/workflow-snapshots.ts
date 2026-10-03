export const getPublishedFlowPath = ({
  publishedFlowPath,
  flowPath,
}: {
  publishedFlowPath?: string | null
  flowPath: string | null
}) => publishedFlowPath ?? flowPath

export const getRunFlowPath = ({
  executionPlan,
  flowPath,
}: {
  executionPlan?: unknown
  flowPath: string | null
}) => (executionPlan ? JSON.stringify(executionPlan) : flowPath)
