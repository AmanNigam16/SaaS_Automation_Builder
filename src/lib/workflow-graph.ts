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
      return { valid: false as const, message: 'Workflow contains an invalid edge' }
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
