import { lookup } from 'node:dns/promises'
import { isPrivateAddress, validatePublicHttpsUrl } from '@/lib/network-safety'
import { resolveExpression, type WorkflowContext, type WorkflowNodeConfig, type WorkflowValue } from '@/lib/workflow-semantics'

const REQUEST_TIMEOUT_MS = 10_000
const MAX_RESPONSE_CHARS = 100_000

const resolveText = (value: string | undefined, context: WorkflowContext) =>
  String(resolveExpression(value ?? '', context))

const parseObject = (value: string | undefined, context: WorkflowContext, label: string) => {
  if (!value?.trim()) return {}
  try {
    const parsed = JSON.parse(resolveText(value, context))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    return parsed as Record<string, unknown>
  } catch {
    throw new Error(`${label} must resolve to a JSON object`)
  }
}

export const executeOutboundWebhook = async (
  config: WorkflowNodeConfig,
  context: WorkflowContext
): Promise<Record<string, WorkflowValue>> => {
  const url = validatePublicHttpsUrl(resolveText(config.webhookUrl, context))
  const addresses = await lookup(url.hostname, { all: true })
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Webhook URL must resolve to a public host')
  }

  const query = parseObject(config.webhookQuery, context, 'Webhook query')
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, String(value)))
  const rawHeaders = parseObject(config.webhookHeaders, context, 'Webhook headers')
  const headers = Object.fromEntries(Object.entries(rawHeaders).map(([key, value]) => [key, String(value)]))
  const method = config.webhookMethod ?? 'POST'
  const body = ['GET', 'DELETE'].includes(method)
    ? undefined
    : resolveText(config.webhookBody ?? '{}', context)
  if (body && !Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')) {
    headers['content-type'] = 'application/json'
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const text = (await response.text()).slice(0, MAX_RESPONSE_CHARS)
  let responseBody: WorkflowValue = text
  try {
    responseBody = JSON.parse(text) as WorkflowValue
  } catch {}
  if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`)
  return { status: response.status, body: responseBody }
}
