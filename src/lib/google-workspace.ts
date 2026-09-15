import { google } from 'googleapis'
import { getGoogleWorkspaceClient } from '@/lib/google-drive'
import { createRawEmail } from '@/lib/google-email-message'
import { resolveExpression, type WorkflowContext, type WorkflowNodeConfig } from '@/lib/workflow-semantics'

const REQUEST_TIMEOUT_MS = 10_000
const GMAIL_COMPOSE_SCOPE = 'https://www.googleapis.com/auth/gmail.compose'
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar'

const required = (value: string | undefined, label: string) => {
  const normalized = value?.trim()
  if (!normalized) throw new Error(`${label} is required`)
  return normalized
}

const resolveText = (
  value: string | undefined,
  context: WorkflowContext,
  label: string
) => required(String(resolveExpression(value ?? '', context)), label)

export const executeGmailAction = async (
  clerkUserId: string,
  config: WorkflowNodeConfig,
  context: WorkflowContext
) => {
  const auth = await getGoogleWorkspaceClient(clerkUserId, [GMAIL_COMPOSE_SCOPE])
  const gmail = google.gmail({ version: 'v1', auth })
  const raw = createRawEmail({
    to: resolveText(config.to, context, 'Recipient'),
    cc: config.cc ? String(resolveExpression(config.cc, context)) : undefined,
    bcc: config.bcc ? String(resolveExpression(config.bcc, context)) : undefined,
    subject: resolveText(config.subject, context, 'Subject'),
    body: resolveText(config.body, context, 'Body'),
  })

  if (config.operation === 'gmail_create_draft') {
    const response = await gmail.users.drafts.create(
      { userId: 'me', requestBody: { message: { raw } } },
      { timeout: REQUEST_TIMEOUT_MS }
    )
    return { draftId: response.data.id ?? null, messageId: response.data.message?.id ?? null, threadId: null }
  }

  const response = await gmail.users.messages.send(
    { userId: 'me', requestBody: { raw } },
    { timeout: REQUEST_TIMEOUT_MS }
  )
  return { draftId: null, messageId: response.data.id ?? null, threadId: response.data.threadId ?? null }
}

export { createRawEmail }

const resolveDate = (value: string | undefined, context: WorkflowContext, label: string) => {
  const text = resolveText(value, context, label)
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date and time`)
  return date
}

const eventBody = (config: WorkflowNodeConfig, context: WorkflowContext) => {
  const start = resolveDate(config.start, context, 'Start time')
  const end = resolveDate(config.end, context, 'End time')
  if (end <= start) throw new Error('End time must be after start time')
  const timeZone = config.timeZone?.trim() || 'UTC'
  const attendees = (config.attendees ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => ({ email }))

  return {
    summary: resolveText(config.summary, context, 'Event title'),
    description: config.description
      ? String(resolveExpression(config.description, context))
      : undefined,
    location: config.location
      ? String(resolveExpression(config.location, context))
      : undefined,
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
    attendees: attendees.length ? attendees : undefined,
    reminders: config.reminderMinutes
      ? { useDefault: false, overrides: [{ method: 'popup' as const, minutes: config.reminderMinutes }] }
      : { useDefault: true },
  }
}

export const executeCalendarAction = async (
  clerkUserId: string,
  config: WorkflowNodeConfig,
  context: WorkflowContext
) => {
  const auth = await getGoogleWorkspaceClient(clerkUserId, [CALENDAR_SCOPE])
  const calendar = google.calendar({ version: 'v3', auth })
  const calendarId = config.calendarId?.trim() || 'primary'

  if (config.operation === 'calendar_delete') {
    const eventId = resolveText(config.eventId, context, 'Event ID')
    await calendar.events.delete({ calendarId, eventId, sendUpdates: 'all' }, { timeout: REQUEST_TIMEOUT_MS })
    return { eventId, eventUrl: null, deleted: true }
  }

  const requestBody = eventBody(config, context)
  if (config.conflictPolicy === 'stop') {
    const busy = await calendar.freebusy.query(
      {
        requestBody: {
          timeMin: requestBody.start.dateTime,
          timeMax: requestBody.end.dateTime,
          timeZone: requestBody.start.timeZone,
          items: [{ id: calendarId }],
        },
      },
      { timeout: REQUEST_TIMEOUT_MS }
    )
    if (busy.data.calendars?.[calendarId]?.busy?.length) {
      throw new Error('Calendar conflict detected')
    }
  }

  if (config.operation === 'calendar_update') {
    const eventId = resolveText(config.eventId, context, 'Event ID')
    const response = await calendar.events.update(
      { calendarId, eventId, requestBody, sendUpdates: 'all' },
      { timeout: REQUEST_TIMEOUT_MS }
    )
    return { eventId: response.data.id ?? eventId, eventUrl: response.data.htmlLink ?? null, deleted: false }
  }

  const response = await calendar.events.insert(
    { calendarId, requestBody, sendUpdates: 'all' },
    { timeout: REQUEST_TIMEOUT_MS }
  )
  return { eventId: response.data.id ?? null, eventUrl: response.data.htmlLink ?? null, deleted: false }
}
