export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { createHash } from 'crypto'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { executeDurableWorkflowRun } from '@/lib/workflow-runner'
import { getTriggerConfig, getTriggerKind, verifyWebhookSignature } from '@/lib/workflow-triggers'
import { parseWorkflowPlan, type WorkflowValue } from '@/lib/workflow-semantics'

const MAX_BODY_BYTES = 256 * 1024
const SENSITIVE_KEY = /authorization|cookie|password|secret|token|api[-_]?key/i

const sanitizePayload = (value: WorkflowValue, depth = 0): WorkflowValue => {
  if (depth > 8) return '[truncated]'
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizePayload(item, depth + 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).slice(0, 100).map(([key, child]) => [
        key,
        SENSITIVE_KEY.test(key) ? '[redacted]' : sanitizePayload(child, depth + 1),
      ])
    )
  }
  return typeof value === 'string' && value.length > 20_000 ? `${value.slice(0, 20_000)}…` : value
}

const inferSchema = (value: unknown, depth = 0): unknown => {
  if (depth > 4) return 'unknown'
  if (value === null) return 'null'
  if (Array.isArray(value)) return { type: 'array', items: value.length ? inferSchema(value[0], depth + 1) : 'unknown' }
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 50).map(([key, child]) => [key, inferSchema(child, depth + 1)]))
  return typeof value
}

export async function POST(req: NextRequest, { params }: { params: { workflowId: string } }) {
  const length = Number(req.headers.get('content-length') ?? '0')
  if (length > MAX_BODY_BYTES) return Response.json({ message: 'Payload too large' }, { status: 413 })
  const rawBody = await req.text()
  if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) return Response.json({ message: 'Payload too large' }, { status: 413 })

  const state = await db.workflowTriggerState.findUnique({
    where: { workflowId: params.workflowId },
    include: { workflow: true },
  })
  const plan = parseWorkflowPlan(state?.workflow.flowPath)
  if (!state?.workflow.publish || !plan || getTriggerKind(plan) !== 'webhook') {
    return Response.json({ message: 'Webhook is not active' }, { status: 404 })
  }
  const config = getTriggerConfig(plan)
  if (config.webhookRequireSignature && !verifyWebhookSignature(rawBody, req.headers.get('x-fuzzie-signature'))) {
    return Response.json({ message: 'Invalid webhook signature' }, { status: 401 })
  }
  const throttleMs = (config.triggerThrottleSeconds ?? 0) * 1000
  if (throttleMs && state.lastRunAt && state.lastRunAt.getTime() + throttleMs > Date.now()) {
    return Response.json({ message: 'Webhook is throttled; retry later' }, { status: 429 })
  }
  const claimed = await db.workflowTriggerState.updateMany({
    where: { id: state.id, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] },
    data: { leaseUntil: new Date(Date.now() + 60_000) },
  })
  if (!claimed.count) return Response.json({ message: 'Webhook is already being processed' }, { status: 409 })

  let payload: WorkflowValue
  try { payload = rawBody ? JSON.parse(rawBody) as WorkflowValue : null } catch { payload = rawBody }
  const safePayload = sanitizePayload(payload)
  const eventId = req.headers.get('x-event-id')?.slice(0, 200) || createHash('sha256').update(rawBody).digest('hex')
  const metadata = {
    payload: safePayload,
    receivedAt: new Date().toISOString(),
    contentType: req.headers.get('content-type'),
  } as Record<string, WorkflowValue>
  try {
    const result = await executeDurableWorkflowRun(state.workflow, plan, {
      eventId: `webhook:${eventId}`,
      triggerType: 'Incoming webhook',
      metadata: metadata as Prisma.InputJsonValue,
      baseUrl: req.nextUrl.origin,
    })
    await db.workflowTriggerState.update({
      where: { id: state.id },
      data: {
        checkpoint: { schema: inferSchema(payload), capturedAt: new Date().toISOString() } as Prisma.InputJsonValue,
        lastRunAt: new Date(),
        leaseUntil: null,
      },
    })
    return Response.json({ accepted: true, status: result.status }, { status: result.status === 'duplicate' ? 200 : 202 })
  } catch {
    await db.workflowTriggerState.updateMany({ where: { id: state.id }, data: { leaseUntil: null } })
    return Response.json({ message: 'Webhook processing failed' }, { status: 502 })
  }
}
