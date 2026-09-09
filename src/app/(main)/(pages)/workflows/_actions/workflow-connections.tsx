'use server'

import { Option } from '@/components/ui/multiple-selector'
import { db } from '@/lib/db'
import { validateWorkflowForPublish } from '@/lib/workflow-validation'
import { auth, currentUser } from '@clerk/nextjs'

/* ----------------------------------
   Helper: ensure DB user exists
---------------------------------- */
const getDbUser = async () => {
  const user = await currentUser()
  if (!user) return null

  return await db.user.upsert({
    where: { clerkId: user.id },
    update: {},
    create: {
      clerkId: user.id,
      email: user.emailAddresses[0].emailAddress,
      name: user.firstName ?? 'User',
    },
  })
}

/* ----------------------------------
   Google Listener
---------------------------------- */
export const getGoogleListener = async () => {
  const { userId } = auth()
  if (!userId) return

  return await db.user.findFirst({
    where: {
      clerkId: userId,
      LocalGoogleCredential: { is: { subscribed: true } },
    },
    select: { googleResourceId: true },
  })
}

/* ----------------------------------
   Publish / Unpublish Workflow
---------------------------------- */
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
    where: { id: workflowId, userId },
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

/* ----------------------------------
   Create / Update Node Templates
---------------------------------- */
export const onCreateNodeTemplate = async (
  content: string,
  type: string,
  workflowId: string,
  channels?: Option[],
  accessToken?: string,
  notionDbId?: string
) => {
  const { userId } = auth()
  if (!userId) return 'Unauthorized'

  if (type === 'Discord') {
    const updated = await db.workflows.updateMany({
      where: { id: workflowId, userId },
      data: { discordTemplate: content },
    })
    return updated.count ? 'Discord template saved' : 'Workflow not found'
  }

  if (type === 'Slack') {
    const updated = await db.workflows.updateMany({
      where: { id: workflowId, userId },
      data: {
        slackTemplate: content,
        slackAccessToken: accessToken,
        slackChannels: channels?.map((channel) => channel.value) ?? [],
      },
    })

    return updated.count ? 'Slack template saved' : 'Workflow not found'
  }

  if (type === 'Notion') {
    const updated = await db.workflows.updateMany({
      where: { id: workflowId, userId },
      data: {
        notionTemplate: content,
        notionAccessToken: accessToken,
        notionDbId,
      },
    })
    return updated.count ? 'Notion template saved' : 'Workflow not found'
  }
}

/* ----------------------------------
   Get Workflows (✅ FIXED)
---------------------------------- */
export const onGetWorkflows = async () => {
  const dbUser = await getDbUser()
  if (!dbUser) return []

  return await db.workflows.findMany({
    where: {
      userId: dbUser.clerkId, // ✅ CORRECT
    },
  })
}

/* ----------------------------------
   Create Workflow (✅ FIXED)
---------------------------------- */
export const onCreateWorkflow = async (
  name: string,
  description: string
) => {
  const dbUser = await getDbUser()
  if (!dbUser) return { message: 'Unauthorized' }

  await db.workflows.create({
    data: {
      userId: dbUser.clerkId, // ✅ CORRECT
      name,
      description,
    },
  })

  return { message: 'workflow created' }
}

/* ----------------------------------
   Get Nodes & Edges (Whiteboard)
---------------------------------- */
export const onGetNodesEdges = async (flowId: string) => {
  const { userId } = auth()
  if (!userId) return null

  return await db.workflows.findFirst({
    where: { id: flowId, userId },
    select: {
      nodes: true,
      edges: true,
    },
  })
}
