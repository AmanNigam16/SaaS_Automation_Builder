import axios from 'axios'
import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { postContentToWebHook } from '@/app/(main)/(pages)/connections/_actions/discord-connection'
import { onCreateNewPageInDatabase } from '@/app/(main)/(pages)/connections/_actions/notion-connection'
import { postMessageToSlack } from '@/app/(main)/(pages)/connections/_actions/slack-connection'

type WorkflowRecord = {
  id: string
  userId: string
  discordTemplate: string | null
  slackChannels: string[]
  slackAccessToken: string | null
  slackTemplate: string | null
  notionDbId: string | null
  notionAccessToken: string | null
  notionTemplate: string | null
  flowPath: string | null
  cronPath: string | null
  publish: boolean | null
}

type StoredCronState = {
  jobId?: number
  steps: string[]
  resumeTokenHash?: string
}

type DurableRunInput = {
  eventId: string
  triggerType: string
  metadata?: Prisma.InputJsonValue
  baseUrl?: string
}

type ExistingRunOptions = {
  runId: string
  startStepIndex: number
  nextAttemptByStep: Map<number, number>
  reservedStepIndexes?: Set<number>
  retryCount?: number
  alreadyClaimed?: boolean
}

type ActionFailure = {
  message: string
  retryable: boolean
  errorCode: string
}

const CONFIGURATION_ERRORS = new Set([
  'Discord template is missing',
  'Discord connection is missing',
  'Slack configuration is incomplete',
  'Notion configuration is incomplete',
])

const RETRY_DELAYS_MS = [5 * 60_000, 15 * 60_000, 60 * 60_000]

export const getRetryDelayMs = (retryCount: number) =>
  RETRY_DELAYS_MS[retryCount] ?? null

const getErrorMessage = (error: unknown, stepType: string) => {
  if (error instanceof SyntaxError) return 'Notion template is invalid'
  if (error instanceof Error && CONFIGURATION_ERRORS.has(error.message)) {
    return error.message
  }

  return `${stepType} action failed`
}

const getActionFailure = (error: unknown, stepType: string): ActionFailure => {
  if (error instanceof SyntaxError) {
    return {
      message: 'Notion template is invalid',
      retryable: false,
      errorCode: 'INVALID_TEMPLATE',
    }
  }

  if (error instanceof Error && CONFIGURATION_ERRORS.has(error.message)) {
    return {
      message: error.message,
      retryable: false,
      errorCode: 'CONFIGURATION',
    }
  }

  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) {
      return {
        message: `${stepType} is rate limited. Retry this run later.`,
        retryable: true,
        errorCode: 'RATE_LIMITED',
      }
    }

    if (error.code === 'ECONNABORTED') {
      return {
        message: `${stepType} timed out. Review before retrying because the provider may have received the request.`,
        retryable: true,
        errorCode: 'TIMEOUT',
      }
    }
  }

  return {
    message: getErrorMessage(error, stepType),
    retryable: false,
    errorCode: 'PROVIDER_ERROR',
  }
}

const prepareAction = async (flow: WorkflowRecord, step: string) => {
  if (step === 'Discord') {
    if (!flow.discordTemplate) throw new Error('Discord template is missing')

    const discordMessage = await db.discordWebhook.findFirst({
      where: { userId: flow.userId },
      select: { url: true },
    })

    if (!discordMessage) throw new Error('Discord connection is missing')

    return async () => {
      await postContentToWebHook(flow.discordTemplate!, discordMessage.url)
    }
  }

  if (step === 'Slack') {
    if (
      !flow.slackAccessToken ||
      !flow.slackTemplate ||
      !flow.slackChannels.length
    ) {
      throw new Error('Slack configuration is incomplete')
    }

    const channels = flow.slackChannels.map((channel) => ({
      label: channel,
      value: channel,
    }))

    return async () => {
      await postMessageToSlack(
        flow.slackAccessToken!,
        channels,
        flow.slackTemplate!
      )
    }
  }

  if (step === 'Notion') {
    if (
      !flow.notionDbId ||
      !flow.notionAccessToken ||
      !flow.notionTemplate
    ) {
      throw new Error('Notion configuration is incomplete')
    }

    const content = JSON.parse(flow.notionTemplate)
    return async () => {
      await onCreateNewPageInDatabase(
        flow.notionDbId!,
        flow.notionAccessToken!,
        content
      )
    }
  }

  throw new Error(`${step} is not executable`)
}

const executeAction = async (flow: WorkflowRecord, step: string) => {
  const action = await prepareAction(flow, step)
  await action()
}

const reserveActionCredit = async (clerkUserId: string) => {
  const reserved = await db.$queryRaw<Array<{ credits: string }>>`
    UPDATE "User"
    SET "credits" = CASE
      WHEN "credits" = 'Unlimited' THEN "credits"
      ELSE (("credits")::integer - 1)::text
    END
    WHERE "clerkId" = ${clerkUserId}
      AND (
        "credits" = 'Unlimited'
        OR ("credits" ~ '^[0-9]+$' AND ("credits")::integer > 0)
      )
    RETURNING "credits"
  `

  return reserved.length === 1
}

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

const isPublicProductionUrl = (value: string | undefined) => {
  if (!value || process.env.VERCEL_ENV !== 'production') return false

  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

const formatCronDate = (date: Date) =>
  [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
    String(date.getUTCHours()).padStart(2, '0'),
    String(date.getUTCMinutes()).padStart(2, '0'),
    String(date.getUTCSeconds()).padStart(2, '0'),
  ].join('')

const scheduleWorkflowRetry = async ({
  runId,
  retryAt,
  baseUrl,
}: {
  runId: string
  retryAt: Date
  baseUrl: string
}) => {
  if (!process.env.CRON_JOB_KEY || !isPublicProductionUrl(baseUrl)) return null

  const scheduledAt = new Date(retryAt)
  scheduledAt.setUTCSeconds(0, 0)
  if (scheduledAt <= new Date()) scheduledAt.setUTCMinutes(scheduledAt.getUTCMinutes() + 1)

  const resumeToken = randomBytes(32).toString('hex')
  const resumeTokenHash = createHash('sha256')
    .update(resumeToken)
    .digest('hex')
  const response = await axios.put(
    'https://api.cron-job.org/jobs',
    {
      job: {
        enabled: true,
        title: `Workflow retry ${runId}`,
        saveResponses: false,
        url: `${normalizeBaseUrl(baseUrl)}/api/cron/workflow-retry?run_id=${encodeURIComponent(runId)}`,
        requestMethod: 0,
        extendedData: {
          headers: { 'X-Workflow-Retry-Token': resumeToken },
        },
        schedule: {
          timezone: 'UTC',
          expiresAt: formatCronDate(new Date(scheduledAt.getTime() + 2 * 60_000)),
          hours: [scheduledAt.getUTCHours()],
          mdays: [scheduledAt.getUTCDate()],
          minutes: [scheduledAt.getUTCMinutes()],
          months: [scheduledAt.getUTCMonth() + 1],
          wdays: [-1],
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.CRON_JOB_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    }
  )

  const jobId = response.data.jobId
  if (!Number.isSafeInteger(jobId) || jobId <= 0) {
    throw new Error('Cron scheduler returned an invalid job ID')
  }

  return { jobId: jobId as number, resumeTokenHash, scheduledAt }
}

export const parseFlowSteps = (value: string | null | undefined) => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const parseStoredCronState = (
  value: string | null | undefined
): StoredCronState | null => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)

    if (Array.isArray(parsed)) {
      return { steps: parsed }
    }

    if (parsed && Array.isArray(parsed.steps)) {
      return {
        jobId:
          typeof parsed.jobId === 'number' ? parsed.jobId : undefined,
        steps: parsed.steps,
        resumeTokenHash:
          typeof parsed.resumeTokenHash === 'string'
            ? parsed.resumeTokenHash
            : undefined,
      }
    }
  } catch {
    return null
  }

  return null
}

export const executeWorkflowSteps = async (
  flow: WorkflowRecord,
  steps: string[]
) => {
  for (let current = 0; current < steps.length; current++) {
    const step = steps[current]

    if (step === 'Wait') {
      return {
        paused: true,
        remainingSteps: steps.slice(current + 1),
      }
    }

    await executeAction(flow, step)
  }

  return {
    paused: false,
    remainingSteps: [],
  }
}

export const verifyWorkflowResumeToken = (
  token: string | null,
  expectedHash?: string
) => {
  if (!token || !expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash)) {
    return false
  }

  const actual = createHash('sha256').update(token).digest()
  return timingSafeEqual(actual, Buffer.from(expectedHash, 'hex'))
}

export const executeDurableWorkflowRun = async (
  flow: WorkflowRecord,
  steps: string[],
  trigger: DurableRunInput,
  existingRun?: ExistingRunOptions
) => {
  let run

  if (existingRun) {
    if (!existingRun.alreadyClaimed) {
      const claimed = await db.workflowRun.updateMany({
        where: {
          id: existingRun.runId,
          status: { in: ['QUEUED', 'WAITING', 'FAILED', 'PAUSED'] },
        },
        data: {
          status: 'RUNNING',
          error: null,
          retryAt: null,
          retryJobId: null,
          retryTokenHash: null,
          finishedAt: null,
        },
      })

      if (!claimed.count) return { status: 'unavailable' as const }
    }
    run = { id: existingRun.runId }
  } else {
    try {
      run = await db.workflowRun.create({
        data: {
          workflowId: flow.id,
          triggerType: trigger.triggerType,
          triggerEventId: trigger.eventId,
          status: 'QUEUED',
          input: trigger.metadata,
        },
        select: { id: true },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { status: 'duplicate' as const }
      }

      throw error
    }

    const claimed = await db.workflowRun.updateMany({
      where: { id: run.id, status: 'QUEUED' },
      data: { status: 'RUNNING' },
    })

    if (!claimed.count) return { status: 'unavailable' as const }
  }

  const startStepIndex = existingRun?.startStepIndex ?? 0

  if (!steps.length || startStepIndex >= steps.length) {
    await db.workflowRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        error: 'Workflow has no executable actions',
        finishedAt: new Date(),
      },
    })

    return { status: 'failed' as const, runId: run.id }
  }

  for (let stepIndex = startStepIndex; stepIndex < steps.length; stepIndex++) {
    const stepType = steps[stepIndex]
    const stepRun = await db.workflowStepRun.create({
      data: {
        workflowRunId: run.id,
        stepIndex,
        stepType,
        attempt: existingRun?.nextAttemptByStep.get(stepIndex) ?? 1,
      },
      select: { id: true },
    })

    try {
      const action = await prepareAction(flow, stepType)

      const creditReserved = existingRun?.reservedStepIndexes?.has(stepIndex)
        ? true
        : await reserveActionCredit(flow.userId)
      if (!creditReserved) {
        await db.workflowStepRun.update({
          where: { id: stepRun.id },
          data: {
            status: 'FAILED',
            error: 'No credits are available for this action',
            errorCode: 'NO_CREDITS',
            finishedAt: new Date(),
          },
        })
        await db.workflowRun.update({
          where: { id: run.id },
          data: {
            status: 'FAILED',
            error: 'No credits are available for this action',
            finishedAt: new Date(),
          },
        })
        return { status: 'failed' as const, runId: run.id }
      }

      await db.workflowStepRun.update({
        where: { id: stepRun.id },
        data: { creditCharged: true },
      })

      await action()
      await db.workflowStepRun.update({
        where: { id: stepRun.id },
        data: {
          status: 'SUCCEEDED',
          output: { message: 'Action completed' },
          finishedAt: new Date(),
        },
      })
    } catch (error) {
      const failure = getActionFailure(error, stepType)
      const retryDelayMs =
        failure.errorCode === 'RATE_LIMITED'
          ? getRetryDelayMs(existingRun?.retryCount ?? 0)
          : null

      if (retryDelayMs !== null && trigger.baseUrl) {
        const retryAt = new Date(Date.now() + retryDelayMs)
        const scheduled = await scheduleWorkflowRetry({
          runId: run.id,
          retryAt,
          baseUrl: trigger.baseUrl,
        })

        if (scheduled) {
          try {
            await db.$transaction([
              db.workflowStepRun.update({
                where: { id: stepRun.id },
                data: {
                  status: 'FAILED',
                  error: failure.message,
                  errorCode: failure.errorCode,
                  retryable: true,
                  finishedAt: new Date(),
                },
              }),
              db.workflowRun.update({
                where: { id: run.id },
                data: {
                  status: 'WAITING',
                  error: failure.message,
                  retryAt: scheduled.scheduledAt,
                  retryCount: { increment: 1 },
                  retryJobId: scheduled.jobId,
                  retryTokenHash: scheduled.resumeTokenHash,
                },
              }),
            ])

            return {
              status: 'waiting' as const,
              runId: run.id,
              retryAt: scheduled.scheduledAt,
            }
          } catch {
            await deleteScheduledJob(scheduled.jobId).catch(() => undefined)
          }
        }
      }

      await db.$transaction([
        db.workflowStepRun.update({
          where: { id: stepRun.id },
          data: {
            status: 'FAILED',
            error: failure.message,
            errorCode: failure.errorCode,
            retryable: failure.retryable,
            finishedAt: new Date(),
          },
        }),
        db.workflowRun.update({
          where: { id: run.id },
          data: {
            status: 'FAILED',
            error: failure.message,
            finishedAt: new Date(),
          },
        }),
      ])

      return { status: 'failed' as const, runId: run.id }
    }
  }

  await db.workflowRun.update({
    where: { id: run.id },
    data: {
      status: 'SUCCEEDED',
      output: { completedSteps: steps.length },
      finishedAt: new Date(),
    },
  })

  return { status: 'succeeded' as const, runId: run.id }
}

export const scheduleWorkflowResume = async ({
  flowId,
  steps,
  baseUrl,
}: {
  flowId: string
  steps: string[]
  baseUrl: string
}) => {
  if (!process.env.CRON_JOB_KEY) {
    throw new Error('Cron scheduler is not configured')
  }

  const resumeToken = randomBytes(32).toString('hex')
  const resumeTokenHash = createHash('sha256')
    .update(resumeToken)
    .digest('hex')
  const response = await axios.put(
    'https://api.cron-job.org/jobs',
    {
      job: {
        enabled: true,
        title: `Workflow wait ${flowId}`,
        saveResponses: false,
        url: `${normalizeBaseUrl(baseUrl)}/api/cron/wait?flow_id=${flowId}`,
        requestMethod: 0,
        extendedData: {
          headers: { 'X-Workflow-Resume-Token': resumeToken },
        },
        schedule: {
          timezone: 'UTC',
          expiresAt: 0,
          hours: [-1],
          mdays: [-1],
          minutes: [-1],
          months: [-1],
          wdays: [-1],
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.CRON_JOB_KEY!}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const jobId = response.data.jobId
  if (!Number.isSafeInteger(jobId) || jobId <= 0) {
    throw new Error('Cron scheduler returned an invalid job ID')
  }

  try {
    await db.workflows.update({
      where: { id: flowId },
      data: {
        cronPath: JSON.stringify({ jobId, steps, resumeTokenHash }),
      },
    })
  } catch (error) {
    await deleteScheduledJob(jobId).catch(() => undefined)
    throw error
  }

  return jobId as number
}

export const deleteScheduledJob = async (jobId?: number) => {
  if (!jobId || !process.env.CRON_JOB_KEY) return

  await axios.delete(`https://api.cron-job.org/jobs/${jobId}`, {
    headers: {
      Authorization: `Bearer ${process.env.CRON_JOB_KEY}`,
      'Content-Type': 'application/json',
    },
  })
}
