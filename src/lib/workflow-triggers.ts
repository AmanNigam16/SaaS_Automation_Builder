import axios from 'axios'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { Prisma } from '@prisma/client'
import { google } from 'googleapis'
import { db } from '@/lib/db'
import { getGoogleWorkspaceClient } from '@/lib/google-drive'
import { executeDurableWorkflowRun } from '@/lib/workflow-runner'
import { getPublishedFlowPath } from '@/lib/workflow-snapshots'
import { createOrRenewDriveListener } from '@/lib/google-drive-listener'
import { getNextScheduleAt } from '@/lib/workflow-schedule'
import {
  parseWorkflowPlan,
  type WorkflowNodeConfig,
  type WorkflowPlan,
  type WorkflowValue,
} from '@/lib/workflow-semantics'

const POLL_LEASE_MS = 55_000
const MAX_EVENTS_PER_POLL = 50

const hash = (value: string) => createHash('sha256').update(value).digest('hex')

export const getTriggerConfig = (plan: WorkflowPlan) =>
  plan.nodes.find((node) => node.id === plan.triggerId)?.config ?? {}

export const getTriggerKind = (plan: WorkflowPlan) => {
  const trigger = plan.nodes.find((node) => node.id === plan.triggerId)
  return trigger?.type === 'Google Drive'
    ? 'drive'
    : trigger?.config.triggerKind ?? 'manual'
}

const deleteJob = async (jobId?: number | null) => {
  if (!jobId || !process.env.CRON_JOB_KEY) return
  await axios.delete(`https://api.cron-job.org/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${process.env.CRON_JOB_KEY}` },
    timeout: 10_000,
  })
}

const canRegisterJobs = (baseUrl?: string) => {
  if (!baseUrl || !process.env.CRON_JOB_KEY || process.env.VERCEL_ENV !== 'production') return false
  try { return new URL(baseUrl).protocol === 'https:' } catch { return false }
}

const createPollingJob = async (workflowId: string, baseUrl: string) => {
  const token = randomBytes(32).toString('hex')
  const response = await axios.put('https://api.cron-job.org/jobs', {
    job: {
      enabled: true,
      title: `Fuzzie trigger ${workflowId}`,
      saveResponses: false,
      url: `${baseUrl.replace(/\/+$/, '')}/api/cron/triggers?workflow_id=${encodeURIComponent(workflowId)}`,
      requestMethod: 1,
      extendedData: { headers: { 'X-Workflow-Trigger-Token': token } },
      schedule: { timezone: 'UTC', expiresAt: 0, hours: [-1], mdays: [-1], minutes: [-1], months: [-1], wdays: [-1] },
    },
  }, {
    headers: { Authorization: `Bearer ${process.env.CRON_JOB_KEY}`, 'Content-Type': 'application/json' },
    timeout: 10_000,
  })
  const jobId = response.data.jobId
  if (!Number.isSafeInteger(jobId) || jobId <= 0) throw new Error('Trigger scheduler returned an invalid job ID')
  return { jobId: jobId as number, tokenHash: hash(token) }
}

export const registerTriggerLifecycle = async ({
  workflowId,
  plan,
  baseUrl,
}: {
  workflowId: string
  plan: WorkflowPlan
  baseUrl?: string
}) => {
  const triggerKind = getTriggerKind(plan)
  const existing = await db.workflowTriggerState.findUnique({ where: { workflowId } })
  if (existing?.jobId) await deleteJob(existing.jobId)

  const needsPolling = ['schedule', 'gmail', 'calendar', 'drive'].includes(triggerKind)
  const scheduled = needsPolling && canRegisterJobs(baseUrl)
    ? await createPollingJob(workflowId, baseUrl!)
    : null
  const nextRunAt = triggerKind === 'schedule'
    ? getNextScheduleAt(getTriggerConfig(plan))
    : null

  await db.workflowTriggerState.upsert({
    where: { workflowId },
    create: {
      workflowId,
      triggerKind,
      nextRunAt,
      jobId: scheduled?.jobId,
      jobTokenHash: scheduled?.tokenHash,
    },
    update: {
      triggerKind,
      cursor: existing?.triggerKind === triggerKind ? existing.cursor : null,
      checkpoint: existing?.triggerKind === triggerKind ? existing.checkpoint ?? undefined : Prisma.DbNull,
      nextRunAt,
      leaseUntil: null,
      jobId: scheduled?.jobId,
      jobTokenHash: scheduled?.tokenHash,
    },
  })
}

export const unregisterTriggerLifecycle = async (workflowId: string) => {
  const state = await db.workflowTriggerState.findUnique({ where: { workflowId } })
  if (state?.jobId) await deleteJob(state.jobId).catch(() => undefined)
  await db.workflowTriggerState.deleteMany({ where: { workflowId } })
}

export const verifyTriggerToken = (token: string | null, expectedHash: string | null) => {
  if (!token || !expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash)) return false
  return timingSafeEqual(Buffer.from(hash(token), 'hex'), Buffer.from(expectedHash, 'hex'))
}

const executeEvents = async (
  workflow: Parameters<typeof executeDurableWorkflowRun>[0],
  plan: WorkflowPlan,
  triggerType: string,
  events: Array<{ id: string; data: Record<string, WorkflowValue> }>,
  baseUrl?: string
) => {
  const results = []
  for (const event of events.slice(0, MAX_EVENTS_PER_POLL)) {
    results.push(await executeDurableWorkflowRun(workflow, plan, {
      eventId: event.id,
      triggerType,
      metadata: event.data as Prisma.InputJsonValue,
      baseUrl,
    }))
  }
  return results
}

const header = (headers: Array<{ name?: string | null; value?: string | null }> | undefined, name: string) =>
  headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

const hasAttachment = (part: { filename?: string | null; parts?: unknown[] } | null | undefined): boolean =>
  Boolean(part?.filename) || Boolean(part?.parts?.some((child) => hasAttachment(child as typeof part)))

const pollGmail = async (
  workflow: Parameters<typeof executeDurableWorkflowRun>[0],
  plan: WorkflowPlan,
  cursor: string | null,
  lastRunAt: Date | null,
  config: WorkflowNodeConfig,
  baseUrl?: string
) => {
  const auth = await getGoogleWorkspaceClient(workflow.userId, ['https://www.googleapis.com/auth/gmail.readonly'])
  const gmail = google.gmail({ version: 'v1', auth })
  const profile = await gmail.users.getProfile({ userId: 'me' })
  const latestHistoryId = profile.data.historyId ?? cursor
  if (!cursor) return { cursor: latestHistoryId, events: 0 }

  const messageIds = new Set<string>()
  let pageToken: string | undefined
  try {
    do {
      const response = await gmail.users.history.list({ userId: 'me', startHistoryId: cursor, historyTypes: ['messageAdded'], pageToken, maxResults: 100 })
      for (const entry of response.data.history ?? []) {
        for (const added of entry.messagesAdded ?? []) if (added.message?.id) messageIds.add(added.message.id)
      }
      pageToken = response.data.nextPageToken ?? undefined
    } while (pageToken && messageIds.size < MAX_EVENTS_PER_POLL)
  } catch (error) {
    if ((error as { response?: { status?: number } }).response?.status !== 404) throw error
    const after = Math.floor((lastRunAt?.getTime() ?? Date.now() - 7 * 24 * 60 * 60_000) / 1000)
    const fallback = await gmail.users.messages.list({ userId: 'me', q: `after:${after}`, maxResults: MAX_EVENTS_PER_POLL })
    for (const message of fallback.data.messages ?? []) if (message.id) messageIds.add(message.id)
  }

  const messages = []
  const ids = Array.from(messageIds).slice(0, MAX_EVENTS_PER_POLL)
  for (let offset = 0; offset < ids.length; offset += 5) {
    messages.push(...await Promise.all(ids.slice(offset, offset + 5).map((id) =>
      gmail.users.messages.get({
        userId: 'me',
        id,
        format: config.gmailHasAttachment ? 'full' : 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        fields: 'id,threadId,labelIds,internalDate,payload(headers,filename,parts(filename,parts(filename)))',
      })
    )))
  }
  const events = messages.flatMap(({ data }) => {
    const headers = data.payload?.headers
    const from = header(headers, 'From')
    const to = header(headers, 'To')
    const subject = header(headers, 'Subject')
    const labels = data.labelIds ?? []
    if (config.gmailFrom && !from.toLowerCase().includes(config.gmailFrom.toLowerCase())) return []
    if (config.gmailTo && !to.toLowerCase().includes(config.gmailTo.toLowerCase())) return []
    if (config.gmailSubject && !subject.toLowerCase().includes(config.gmailSubject.toLowerCase())) return []
    if (config.gmailLabel && !labels.includes(config.gmailLabel)) return []
    if (config.gmailHasAttachment && !hasAttachment(data.payload)) return []
    return [{ id: `gmail:${data.id}`, data: { messageId: data.id ?? null, threadId: data.threadId ?? null, from, to, subject, labels, receivedAt: data.internalDate ? new Date(Number(data.internalDate)).toISOString() : null } }]
  })
  await executeEvents(workflow, plan, 'Gmail', events, baseUrl)
  return { cursor: latestHistoryId, events: events.length }
}

const pollCalendar = async (
  workflow: Parameters<typeof executeDurableWorkflowRun>[0],
  plan: WorkflowPlan,
  cursor: string | null,
  config: WorkflowNodeConfig,
  baseUrl?: string
) => {
  const auth = await getGoogleWorkspaceClient(workflow.userId, ['https://www.googleapis.com/auth/calendar'])
  const calendar = google.calendar({ version: 'v3', auth })
  const now = new Date()
  const mode = config.calendarTriggerMode ?? 'new'
  const response = mode === 'upcoming'
    ? await calendar.events.list({ calendarId: config.calendarTriggerId ?? 'primary', timeMin: now.toISOString(), timeMax: new Date(now.getTime() + (config.calendarUpcomingMinutes ?? 60) * 60_000).toISOString(), singleEvents: true, orderBy: 'startTime', maxResults: MAX_EVENTS_PER_POLL })
    : await calendar.events.list({ calendarId: config.calendarTriggerId ?? 'primary', updatedMin: cursor ?? now.toISOString(), showDeleted: false, singleEvents: true, maxResults: MAX_EVENTS_PER_POLL })
  const events = (response.data.items ?? []).flatMap((event) => {
    if (!event.id || event.status === 'cancelled') return []
    if (mode === 'new' && cursor && event.created && Date.parse(event.created) < Date.parse(cursor)) return []
    const start = event.start?.dateTime ?? event.start?.date ?? null
    return [{ id: `calendar:${mode}:${event.id}:${mode === 'upcoming' ? start : event.updated}`, data: { eventId: event.id, summary: event.summary ?? null, description: event.description ?? null, location: event.location ?? null, start, end: event.end?.dateTime ?? event.end?.date ?? null, htmlLink: event.htmlLink ?? null, organizerEmail: event.organizer?.email ?? null } }]
  })
  await executeEvents(workflow, plan, mode === 'upcoming' ? 'Upcoming Calendar event' : 'New Calendar event', events, baseUrl)
  return { cursor: now.toISOString(), events: events.length }
}

export const processWorkflowTrigger = async (workflowId: string, baseUrl?: string) => {
  const state = await db.workflowTriggerState.findUnique({ where: { workflowId }, include: { workflow: true } })
  if (!state?.workflow.publish) return { status: 'inactive' as const }
  const plan = parseWorkflowPlan(getPublishedFlowPath(state.workflow))
  if (!plan) return { status: 'invalid' as const }
  const config = getTriggerConfig(plan)
  const throttleMs = (config.triggerThrottleSeconds ?? 0) * 1000
  if (throttleMs && state.lastRunAt && state.lastRunAt.getTime() + throttleMs > Date.now()) {
    return { status: 'throttled' as const }
  }
  const claimed = await db.workflowTriggerState.updateMany({
    where: { id: state.id, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] },
    data: { leaseUntil: new Date(Date.now() + POLL_LEASE_MS) },
  })
  if (!claimed.count) return { status: 'busy' as const }

  try {
    let cursor = state.cursor
    let events = 0
    let nextRunAt = state.nextRunAt
    if (state.triggerKind === 'schedule') {
      if (state.nextRunAt && state.nextRunAt <= new Date()) {
        const eventId = `schedule:${state.nextRunAt.toISOString()}`
        await executeEvents(state.workflow, plan, 'Schedule', [{ id: eventId, data: { scheduledAt: state.nextRunAt.toISOString(), timeZone: config.scheduleTimeZone ?? 'UTC' } }], baseUrl)
        events = 1
        nextRunAt = getNextScheduleAt(config, new Date())
      }
    } else if (state.triggerKind === 'gmail') {
      const result = await pollGmail(state.workflow, plan, state.cursor, state.lastRunAt, config, baseUrl)
      cursor = result.cursor
      events = result.events
    } else if (state.triggerKind === 'calendar') {
      const result = await pollCalendar(state.workflow, plan, state.cursor, config, baseUrl)
      cursor = result.cursor
      events = result.events
    } else if (state.triggerKind === 'drive' && baseUrl) {
      const credential = await db.localGoogleCredential.findFirst({
        where: { user: { clerkId: state.workflow.userId } },
        select: { channelExpiration: true, subscribed: true },
      })
      if (
        !credential?.subscribed ||
        !credential.channelExpiration ||
        credential.channelExpiration.getTime() <= Date.now() + 24 * 60 * 60_000
      ) {
        await createOrRenewDriveListener({
          clerkUserId: state.workflow.userId,
          webhookOrigin: baseUrl,
          force: true,
          bypassSecret: process.env.VERCEL_ENV === 'preview' ? process.env.VERCEL_AUTOMATION_BYPASS_SECRET : undefined,
        })
      }
    }
    await db.workflowTriggerState.update({ where: { id: state.id }, data: { cursor, nextRunAt, lastRunAt: new Date(), leaseUntil: null } })
    return { status: 'processed' as const, events }
  } catch (error) {
    await db.workflowTriggerState.updateMany({ where: { id: state.id }, data: { leaseUntil: null } })
    throw error
  }
}

export const verifyWebhookSignature = (rawBody: string, signature: string | null) => {
  const secret = process.env.INBOUND_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
  if (signature.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
