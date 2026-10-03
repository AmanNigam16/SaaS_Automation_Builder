'use server'

import { Option } from '@/components/ui/multiple-selector'
import { db } from '@/lib/db'
import { validateWorkflowForPublish } from '@/lib/workflow-validation'
import { auth, currentUser } from '@clerk/nextjs'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { registerTriggerLifecycle, unregisterTriggerLifecycle } from '@/lib/workflow-triggers'

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
  if (!state) {
    await unregisterTriggerLifecycle(workflowId)
    return 'Workflow unpublished'
  }
  try {
    const requestHeaders = headers()
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
    const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https'
    await registerTriggerLifecycle({
      workflowId,
      plan: validation!.plan,
      baseUrl: host ? `${protocol}://${host}` : undefined,
    })
  } catch {
    await db.workflows.updateMany({ where: { id: workflowId, userId }, data: { publish: false } })
    await unregisterTriggerLifecycle(workflowId).catch(() => undefined)
    return 'Could not activate the trigger. The workflow remains unpublished.'
  }
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
  _accessToken?: string,
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
        slackAccessToken: null,
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
        notionAccessToken: null,
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

export const onDuplicateWorkflow = async (workflowId: string) => {
  const { userId } = auth()
  if (!userId) return { message: 'Unauthorized' }

  const source = await db.workflows.findFirst({
    where: { id: workflowId, userId },
  })
  if (!source) return { message: 'Workflow not found' }

  await db.workflows.create({
    data: {
      userId,
      name: `${source.name} Copy`,
      description: source.description,
      nodes: source.nodes,
      edges: source.edges,
      flowPath: source.flowPath,
      discordTemplate: source.discordTemplate,
      notionTemplate: source.notionTemplate,
      slackTemplate: source.slackTemplate,
      slackChannels: source.slackChannels,
      notionDbId: source.notionDbId,
      publish: false,
    },
  })

  revalidatePath('/workflows')
  return { message: 'Workflow duplicated as an unpublished draft' }
}

type WorkflowImport = {
  format?: unknown
  version?: unknown
  workflow?: unknown
}

const optionalString = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.slice(0, maxLength) : null

export const onImportWorkflow = async (content: string) => {
  const { userId } = auth()
  if (!userId) return { message: 'Unauthorized' }
  if (!content || content.length > 1_000_000) {
    return { message: 'Choose a Fuzzie workflow export smaller than 1 MB' }
  }

  let imported: WorkflowImport
  try {
    imported = JSON.parse(content) as WorkflowImport
  } catch {
    return { message: 'The selected file is not valid JSON' }
  }

  if (imported.format !== 'fuzzie-workflow' || imported.version !== 1) {
    return { message: 'This is not a supported Fuzzie workflow export' }
  }

  const workflow = imported.workflow
  if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
    return { message: 'The workflow export is incomplete' }
  }

  const data = workflow as Record<string, unknown>
  const name = optionalString(data.name, 120)?.trim()
  const description = optionalString(data.description, 1000)?.trim()
  const nodes = optionalString(data.nodes, 500_000)
  const edges = optionalString(data.edges, 500_000)

  if (!name || description == null || nodes === null || edges === null) {
    return { message: 'The workflow export has invalid required fields' }
  }

  try {
    const parsedNodes = JSON.parse(nodes)
    const parsedEdges = JSON.parse(edges)
    if (!Array.isArray(parsedNodes) || !Array.isArray(parsedEdges)) throw new Error()
  } catch {
    return { message: 'The workflow graph in this export is invalid' }
  }

  const slackChannels = Array.isArray(data.slackChannels)
    ? data.slackChannels.filter((value): value is string => typeof value === 'string').slice(0, 100)
    : []

  await db.workflows.create({
    data: {
      userId,
      name: `${name} (Imported)`,
      description,
      nodes,
      edges,
      discordTemplate: optionalString(data.discordTemplate, 20_000),
      notionTemplate: optionalString(data.notionTemplate, 20_000),
      slackTemplate: optionalString(data.slackTemplate, 20_000),
      slackChannels,
      notionDbId: optionalString(data.notionDbId, 500),
      publish: false,
    },
  })

  revalidatePath('/workflows')
  return { message: 'Workflow imported as an unpublished draft' }
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
