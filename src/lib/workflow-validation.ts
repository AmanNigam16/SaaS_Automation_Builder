import { db } from '@/lib/db'

const SUPPORTED_ACTIONS = new Set(['Discord', 'Slack', 'Notion'])
const SUPPORTED_TRIGGER = 'Google Drive'

type StoredNode = {
  id: string
  type: string
}

type StoredEdge = {
  source: string
  target: string
}

const parseArray = <T>(value: string | null): T[] | null => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export const validateLinearWorkflowGraph = (
  nodesValue: string | null,
  edgesValue: string | null
) => {
  const nodes = parseArray<StoredNode>(nodesValue)
  const edges = parseArray<StoredEdge>(edgesValue)

  if (!nodes || !edges || nodes.length < 2) {
    return { valid: false as const, message: 'Add a trigger and an action' }
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  if (nodeById.size !== nodes.length || nodes.some((node) => !node.id)) {
    return { valid: false as const, message: 'Workflow nodes are invalid' }
  }

  const unsupportedNode = nodes.find(
    (node) =>
      node.type !== SUPPORTED_TRIGGER && !SUPPORTED_ACTIONS.has(node.type)
  )
  if (unsupportedNode) {
    return {
      valid: false as const,
      message: `${unsupportedNode.type} is not executable yet`,
    }
  }

  const incoming = new Map<string, number>()
  const outgoing = new Map<string, string>()

  for (const edge of edges) {
    if (
      !nodeById.has(edge.source) ||
      !nodeById.has(edge.target) ||
      edge.source === edge.target
    ) {
      return {
        valid: false as const,
        message: 'Workflow contains an invalid edge',
      }
    }

    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1)
    if (incoming.get(edge.target)! > 1 || outgoing.has(edge.source)) {
      return {
        valid: false as const,
        message: 'Branching and merged paths are not executable yet',
      }
    }
    outgoing.set(edge.source, edge.target)
  }

  const roots = nodes.filter((node) => !incoming.has(node.id))
  if (roots.length !== 1 || roots[0].type !== SUPPORTED_TRIGGER) {
    return {
      valid: false as const,
      message: 'Start with one connected Google Drive trigger',
    }
  }

  const visited = new Set<string>()
  const steps: string[] = []
  let current: StoredNode | undefined = roots[0]

  while (current) {
    if (visited.has(current.id)) {
      return { valid: false as const, message: 'Workflow cannot contain a cycle' }
    }

    visited.add(current.id)
    if (current.type !== SUPPORTED_TRIGGER) steps.push(current.type)

    const nextId = outgoing.get(current.id)
    current = nextId ? nodeById.get(nextId) : undefined
  }

  if (visited.size !== nodes.length || steps.length === 0) {
    return { valid: false as const, message: 'Connect every workflow node' }
  }

  return { valid: true as const, steps }
}

export const validateWorkflowForPublish = async (
  workflowId: string,
  userId: string
) => {
  const workflow = await db.workflows.findFirst({
    where: { id: workflowId, userId },
  })
  if (!workflow) {
    return { valid: false as const, message: 'Workflow not found' }
  }

  const graph = validateLinearWorkflowGraph(workflow.nodes, workflow.edges)
  if (!graph.valid) return graph

  const [googleUser, discord, slack, notion] = await Promise.all([
    db.user.findUnique({
      where: { clerkId: userId },
      select: {
        googleResourceId: true,
        LocalGoogleCredential: { select: { subscribed: true } },
      },
    }),
    graph.steps.includes('Discord')
      ? db.discordWebhook.findFirst({ where: { userId }, select: { id: true } })
      : null,
    graph.steps.includes('Slack') && workflow.slackAccessToken
      ? db.slack.findFirst({
          where: { userId, slackAccessToken: workflow.slackAccessToken },
          select: { id: true },
        })
      : null,
    graph.steps.includes('Notion') && workflow.notionAccessToken
      ? db.notion.findFirst({
          where: {
            userId,
            accessToken: workflow.notionAccessToken,
            databaseId: workflow.notionDbId ?? undefined,
          },
          select: { id: true },
        })
      : null,
  ])

  if (
    !googleUser?.googleResourceId ||
    !googleUser.LocalGoogleCredential?.subscribed
  ) {
    return {
      valid: false as const,
      message: 'Create the Google Drive listener before publishing',
    }
  }

  if (
    graph.steps.includes('Discord') &&
    (!discord || !workflow.discordTemplate?.trim())
  ) {
    return {
      valid: false as const,
      message: 'Connect Discord and save its message template',
    }
  }

  if (
    graph.steps.includes('Slack') &&
    (!slack || !workflow.slackTemplate?.trim() || !workflow.slackChannels.length)
  ) {
    return {
      valid: false as const,
      message: 'Connect Slack, select channels, and save its template',
    }
  }

  if (
    graph.steps.includes('Notion') &&
    (!notion || !workflow.notionTemplate?.trim() || !workflow.notionDbId)
  ) {
    return {
      valid: false as const,
      message: 'Connect Notion and save its database template',
    }
  }

  return graph
}
