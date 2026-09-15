export const EXECUTABLE_NODE_TYPES = new Set([
  'Google Drive',
  'Discord',
  'Slack',
  'Notion',
  'Condition',
  'Formatter',
  'Wait',
  'Loop',
])

export type WorkflowValue =
  | string
  | number
  | boolean
  | null
  | WorkflowValue[]
  | { [key: string]: WorkflowValue }

export type WorkflowContext = {
  trigger: Record<string, WorkflowValue>
  steps: Record<string, Record<string, WorkflowValue>>
  loop?: { item: WorkflowValue; index: number; items: WorkflowValue[] }
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'exists'
  | 'not_exists'
  | 'is_true'
  | 'is_false'

export type WorkflowNodeConfig = {
  template?: string
  conditionMode?: 'branch' | 'filter'
  combinator?: 'and' | 'or'
  conditions?: Array<{
    field: string
    operator: ConditionOperator
    value?: string
  }>
  formatterOperation?:
    | 'uppercase'
    | 'lowercase'
    | 'trim'
    | 'number'
    | 'date'
    | 'json_stringify'
    | 'json_parse'
    | 'list_join'
  input?: string
  amount?: number
  dateFormat?: 'iso' | 'date' | 'locale'
  separator?: string
  waitMode?: 'duration' | 'until'
  durationSeconds?: number
  until?: string
  items?: string
  maxItems?: number
}

export type WorkflowPlanNode = {
  id: string
  type: string
  config: WorkflowNodeConfig
}

export type WorkflowPlanEdge = {
  id: string
  source: string
  target: string
  branch?: 'true' | 'false'
}

export type WorkflowPlan = {
  version: 1
  triggerId: string
  nodes: WorkflowPlanNode[]
  edges: WorkflowPlanEdge[]
}

type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'list' | 'any'

export const WORKFLOW_NODE_SCHEMAS: Record<
  string,
  { inputs: Record<string, FieldType>; outputs: Record<string, FieldType> }
> = {
  'Google Drive': { inputs: {}, outputs: { fileId: 'string', fileName: 'string', mimeType: 'string', modifiedTime: 'date', removed: 'boolean', resourceState: 'string' } },
  Discord: { inputs: { message: 'string' }, outputs: { message: 'string' } },
  Slack: { inputs: { message: 'string' }, outputs: { message: 'string' } },
  Notion: { inputs: { properties: 'object' }, outputs: { message: 'string' } },
  Condition: { inputs: { value: 'any' }, outputs: { matched: 'boolean' } },
  Formatter: { inputs: { value: 'any' }, outputs: { result: 'any' } },
  Wait: { inputs: { duration: 'number', until: 'date' }, outputs: { resumedAt: 'date' } },
  Loop: { inputs: { items: 'list' }, outputs: { item: 'any', index: 'number', items: 'list' } },
  Email: { inputs: { to: 'string', subject: 'string', body: 'string' }, outputs: { message: 'string' } },
  AI: { inputs: { prompt: 'string' }, outputs: { result: 'any' } },
  'Custom Webhook': { inputs: { request: 'object' }, outputs: { response: 'object' } },
  'Google Calendar': { inputs: { event: 'object' }, outputs: { event: 'object' } },
  Trigger: { inputs: {}, outputs: { data: 'object' } },
  Action: { inputs: { data: 'any' }, outputs: { result: 'any' } },
}

type StoredNode = {
  id?: unknown
  type?: unknown
  data?: { metadata?: unknown }
}

type StoredEdge = {
  id?: unknown
  source?: unknown
  target?: unknown
  sourceHandle?: unknown
}

const parseArray = (value: string | null): unknown[] | null => {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

const asConfig = (value: unknown): WorkflowNodeConfig =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as WorkflowNodeConfig)
    : {}

const validateNodeConfig = (node: WorkflowPlanNode): string | null => {
  const config = node.config
  if (node.type === 'Condition') {
    if (!config.conditions?.length) return 'Configure at least one condition'
    if (
      config.conditions.some(
        (condition) => !condition.field?.trim() || !condition.operator
      )
    ) {
      return 'Complete every condition rule'
    }
  }
  if (node.type === 'Formatter' && (!config.formatterOperation || !config.input)) {
    return 'Choose a formatter operation and input'
  }
  if (node.type === 'Wait') {
    if (config.waitMode === 'until') {
      if (!config.until || Number.isNaN(Date.parse(config.until))) {
        return 'Choose a valid wait-until time'
      }
    } else if (!Number.isFinite(config.durationSeconds) || config.durationSeconds! < 1) {
      return 'Wait duration must be at least one second'
    }
  }
  if (node.type === 'Loop' && !config.items?.trim()) {
    return 'Choose a list to loop over'
  }
  if (
    node.type === 'Loop' &&
    config.maxItems !== undefined &&
    (!Number.isInteger(config.maxItems) || config.maxItems < 1 || config.maxItems > 100)
  ) {
    return 'Loop safety limit must be between 1 and 100'
  }
  return null
}

export const compileWorkflowGraph = (
  nodesValue: string | null,
  edgesValue: string | null
) => {
  const rawNodes = parseArray(nodesValue) as StoredNode[] | null
  const rawEdges = parseArray(edgesValue) as StoredEdge[] | null
  if (!rawNodes || !rawEdges || rawNodes.length < 2) {
    return { valid: false as const, message: 'Add a trigger and an action' }
  }

  const nodes: WorkflowPlanNode[] = []
  for (const node of rawNodes) {
    if (typeof node.id !== 'string' || typeof node.type !== 'string') {
      return { valid: false as const, message: 'Workflow nodes are invalid' }
    }
    if (!EXECUTABLE_NODE_TYPES.has(node.type)) {
      return { valid: false as const, message: `${node.type} is not executable yet` }
    }
    const normalized = { id: node.id, type: node.type, config: asConfig(node.data?.metadata) }
    const configError = validateNodeConfig(normalized)
    if (configError) return { valid: false as const, message: configError }
    nodes.push(normalized)
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  if (nodeById.size !== nodes.length) {
    return { valid: false as const, message: 'Workflow node IDs must be unique' }
  }

  const edges: WorkflowPlanEdge[] = []
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, number>()
  const conditionBranches = new Map<string, Set<string>>()
  for (let index = 0; index < rawEdges.length; index++) {
    const edge = rawEdges[index]
    if (
      typeof edge.source !== 'string' ||
      typeof edge.target !== 'string' ||
      !nodeById.has(edge.source) ||
      !nodeById.has(edge.target) ||
      edge.source === edge.target
    ) {
      return { valid: false as const, message: 'Workflow contains an invalid edge' }
    }
    const source = nodeById.get(edge.source)!
    const branch =
      source.type === 'Condition' &&
      (edge.sourceHandle === 'true' || edge.sourceHandle === 'false')
        ? edge.sourceHandle
        : undefined
    edges.push({
      id: typeof edge.id === 'string' ? edge.id : `edge-${index}`,
      source: edge.source,
      target: edge.target,
      branch,
    })
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1)
    outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1)
    if (source.type !== 'Condition' && outgoing.get(edge.source)! > 1) {
      return { valid: false as const, message: 'Only Condition nodes can create branches' }
    }
    if (source.type === 'Condition' && outgoing.get(edge.source)! > 2) {
      return { valid: false as const, message: 'A condition supports true and false paths only' }
    }
    if (source.type === 'Condition') {
      if (!branch) {
        return { valid: false as const, message: 'Connect condition paths using the True or False handle' }
      }
      const branches = conditionBranches.get(source.id) ?? new Set<string>()
      if (branches.has(branch)) {
        return { valid: false as const, message: `Condition ${branch} path can connect only once` }
      }
      branches.add(branch)
      conditionBranches.set(source.id, branches)
      if (source.config.conditionMode === 'filter' && branch === 'false') {
        return { valid: false as const, message: 'A filter uses only its True path' }
      }
    }
  }

  const roots = nodes.filter((node) => !incoming.has(node.id))
  if (roots.length !== 1 || roots[0].type !== 'Google Drive') {
    return { valid: false as const, message: 'Start with one connected Google Drive trigger' }
  }
  if (nodes.some((node) => node.id !== roots[0].id && !incoming.has(node.id))) {
    return { valid: false as const, message: 'Connect every workflow node' }
  }

  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target])
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false
    if (visited.has(id)) return true
    visiting.add(id)
    for (const next of adjacency.get(id) ?? []) if (!visit(next)) return false
    visiting.delete(id)
    visited.add(id)
    return true
  }
  if (!visit(roots[0].id)) {
    return { valid: false as const, message: 'Workflow cannot contain a cycle' }
  }
  if (visited.size !== nodes.length) {
    return { valid: false as const, message: 'Connect every workflow node' }
  }

  const plan: WorkflowPlan = { version: 1, triggerId: roots[0].id, nodes, edges }
  return { valid: true as const, plan, steps: nodes.filter((node) => node.type !== 'Google Drive').map((node) => node.type) }
}

export const parseWorkflowPlan = (value: string | null | undefined): WorkflowPlan | null => {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as WorkflowPlan
    return parsed?.version === 1 && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)
      ? parsed
      : null
  } catch {
    return null
  }
}

const getPath = (context: WorkflowContext, path: string): WorkflowValue | undefined => {
  const parts = path.replace(/^\{\{|\}\}$/g, '').trim().split('.')
  let current: unknown = context
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current as WorkflowValue | undefined
}

export const resolveExpression = (value: string, context: WorkflowContext): WorkflowValue => {
  const exact = value.match(/^\s*\{\{\s*([^}]+)\s*\}\}\s*$/)
  if (exact) return getPath(context, exact[1]) ?? null
  return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, path: string) => {
    const resolved = getPath(context, path)
    return resolved == null
      ? ''
      : typeof resolved === 'object'
        ? JSON.stringify(resolved)
        : String(resolved)
  })
}

const compare = (left: WorkflowValue | undefined, operator: ConditionOperator, right?: string) => {
  if (operator === 'exists') return left !== undefined && left !== null && left !== ''
  if (operator === 'not_exists') return left === undefined || left === null || left === ''
  if (operator === 'is_true') return left === true || left === 'true'
  if (operator === 'is_false') return left === false || left === 'false'
  const leftText = typeof left === 'string' ? left : JSON.stringify(left)
  if (operator === 'equals') return leftText === (right ?? '')
  if (operator === 'not_equals') return leftText !== (right ?? '')
  if (operator === 'contains') return leftText?.includes(right ?? '') ?? false
  if (operator === 'not_contains') return !(leftText?.includes(right ?? '') ?? false)
  const leftNumber = Number(left)
  const rightNumber = Number(right)
  if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) return false
  return operator === 'greater_than' ? leftNumber > rightNumber : leftNumber < rightNumber
}

export const evaluateCondition = (config: WorkflowNodeConfig, context: WorkflowContext) => {
  const results = (config.conditions ?? []).map((condition) =>
    compare(getPath(context, condition.field), condition.operator, condition.value)
  )
  return (config.combinator ?? 'and') === 'or'
    ? results.some(Boolean)
    : results.every(Boolean)
}

export const applyFormatter = (config: WorkflowNodeConfig, context: WorkflowContext): WorkflowValue => {
  const input = resolveExpression(config.input ?? '', context)
  switch (config.formatterOperation) {
    case 'uppercase': return String(input ?? '').toUpperCase()
    case 'lowercase': return String(input ?? '').toLowerCase()
    case 'trim': return String(input ?? '').trim()
    case 'number': {
      const value = Number(input)
      const amount = Number(config.amount ?? 0)
      if (!Number.isFinite(value) || !Number.isFinite(amount)) {
        throw new Error('Formatter received an invalid number')
      }
      return value + amount
    }
    case 'date': {
      const date = new Date(String(input))
      if (Number.isNaN(date.getTime())) throw new Error('Formatter received an invalid date')
      if (config.dateFormat === 'date') return date.toISOString().slice(0, 10)
      if (config.dateFormat === 'locale') return date.toLocaleString('en')
      return date.toISOString()
    }
    case 'json_stringify': return JSON.stringify(input)
    case 'json_parse': return JSON.parse(String(input)) as WorkflowValue
    case 'list_join': return Array.isArray(input) ? input.join(config.separator ?? ', ') : String(input ?? '')
    default: throw new Error('Formatter operation is not configured')
  }
}

export const getWaitUntil = (config: WorkflowNodeConfig, now = new Date()) => {
  if (config.waitMode === 'until') return new Date(config.until!)
  const seconds = Math.min(Math.max(config.durationSeconds ?? 1, 1), 30 * 24 * 60 * 60)
  return new Date(now.getTime() + seconds * 1000)
}

export const getNodeOutputFields = (node: WorkflowPlanNode) => {
  return Object.keys(WORKFLOW_NODE_SCHEMAS[node.type]?.outputs ?? {})
}
