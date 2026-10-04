'use server'

import { auth } from '@clerk/nextjs'
import { db } from '@/lib/db'
import { getWorkflowTemplate } from '@/lib/workflow-templates'

export const createWorkflowFromTemplate = async (templateId: string) => {
  const { userId } = auth()
  if (!userId) return { message: 'Unauthorized' }
  const template = getWorkflowTemplate(templateId)
  if (!template) return { message: 'Template not found' }

  const workflow = await db.workflows.create({
    data: {
      userId,
      name: template.name,
      description: template.description,
      nodes: template.nodes,
      edges: template.edges,
      publish: false,
    },
    select: { id: true },
  })
  return { message: 'Template added as an unpublished draft', workflowId: workflow.id }
}
