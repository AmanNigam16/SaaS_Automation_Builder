'use server'

import { db } from '@/lib/db'
import {
  validateLinearWorkflowGraph,
  validateWorkflowForPublish,
} from '@/lib/workflow-validation'
import { auth } from '@clerk/nextjs'

export const onCreateNodesEdges = async (
  flowId: string,
  nodes: string,
  edges: string,
  _flowPath: string
) => {
  const { userId } = auth()
  if (!userId) return { message: 'Unauthorized' }

  const graph = validateLinearWorkflowGraph(nodes, edges)

  const flow = await db.workflows.updateMany({
    where: {
      id: flowId,
      userId,
    },
    data: {
      nodes,
      edges,
      flowPath: JSON.stringify(graph.valid ? graph.steps : []),
    },
  })

  return {
    message: flow.count ? 'flow saved' : 'Workflow not found',
  }
}

export const onFlowPublish = async (workflowId: string, state: boolean) => {
  const { userId } = auth()
  if (!userId) return 'Unauthorized'

  const validation = state
    ? await validateWorkflowForPublish(workflowId, userId)
    : null
  if (validation && !validation.valid) {
    return `Cannot publish: ${validation.message}`
  }

  const published = await db.workflows.updateMany({
    where: {
      id: workflowId,
      userId,
    },
    data: {
      publish: state,
      ...(validation?.valid
        ? { flowPath: JSON.stringify(validation.steps) }
        : {}),
    },
  })

  if (!published.count) return 'Workflow not found'
  return state ? 'Workflow published' : 'Workflow unpublished'
}
