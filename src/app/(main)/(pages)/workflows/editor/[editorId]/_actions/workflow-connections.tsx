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
      flowPath: JSON.stringify(graph.valid ? graph.plan : []),
      draftVersion: { increment: 1 },
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
        ? {
            flowPath: JSON.stringify(validation.plan),
            publishedFlowPath: JSON.stringify(validation.plan),
          }
        : {}),
    },
  })

  if (!published.count) return 'Workflow not found'
  if (state) {
    await db.$executeRaw`UPDATE "Workflows" SET "publishedVersion" = "draftVersion" WHERE "id" = ${workflowId} AND "userId" = ${userId}`
  }
  return state ? 'Workflow published' : 'Workflow unpublished'
}
