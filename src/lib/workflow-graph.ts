import { compileWorkflowGraph } from './workflow-semantics.ts'

export const validateLinearWorkflowGraph = (
  nodesValue: string | null,
  edgesValue: string | null
) => compileWorkflowGraph(nodesValue, edgesValue)
