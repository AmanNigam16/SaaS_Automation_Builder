'use server'

import { Option } from '@/components/ui/multiple-selector'
import { db } from '@/lib/db'
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

  return await db.user.findUnique({
    where: { clerkId: userId },
    select: { googleResourceId: true },
  })
}

/* ----------------------------------
   Publish / Unpublish Workflow
---------------------------------- */
export const onFlowPublish = async (workflowId: string, state: boolean) => {
  const published = await db.workflows.update({
    where: { id: workflowId },
    data: { publish: state },
  })

  return published.publish ? 'Workflow published' : 'Workflow unpublished'
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
  if (type === 'Discord') {
    await db.workflows.update({
      where: { id: workflowId },
      data: { discordTemplate: content },
    })
    return 'Discord template saved'
  }

  if (type === 'Slack') {
    await db.workflows.update({
      where: { id: workflowId },
      data: {
        slackTemplate: content,
        slackAccessToken: accessToken,
      },
    })

    if (channels?.length) {
      for (const channel of channels.map((c) => c.value)) {
        await db.workflows.update({
          where: { id: workflowId },
          data: {
            slackChannels: { push: channel },
          },
        })
      }
    }

    return 'Slack template saved'
  }

  if (type === 'Notion') {
    await db.workflows.update({
      where: { id: workflowId },
      data: {
        notionTemplate: content,
        notionAccessToken: accessToken,
        notionDbId,
      },
    })
    return 'Notion template saved'
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
  return await db.workflows.findUnique({
    where: { id: flowId },
    select: {
      nodes: true,
      edges: true,
    },
  })
}
