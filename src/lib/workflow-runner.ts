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
}

const CONFIGURATION_ERRORS = new Set([
  'Discord template is missing',
  'Discord connection is missing',
  'Slack configuration is incomplete',
  'Notion configuration is incomplete',
])

const getErrorMessage = (error: unknown, stepType: string) => {
  if (error instanceof SyntaxError) return 'Notion template is invalid'
  if (error instanceof Error && CONFIGURATION_ERRORS.has(error.message)) {
    return error.message
  }

  return `${stepType} action failed`
}

const executeAction = async (flow: WorkflowRecord, step: string) => {
  if (step === 'Discord') {
    if (!flow.discordTemplate) throw new Error('Discord template is missing')

    const discordMessage = await db.discordWebhook.findFirst({
      where: { userId: flow.userId },
      select: { url: true },
    })

    if (!discordMessage) throw new Error('Discord connection is missing')

    await postContentToWebHook(flow.discordTemplate, discordMessage.url)
    return
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

    await postMessageToSlack(
      flow.slackAccessToken,
      channels,
      flow.slackTemplate
    )
    return
  }

  if (step === 'Notion') {
    if (
      !flow.notionDbId ||
      !flow.notionAccessToken ||
      !flow.notionTemplate
    ) {
      throw new Error('Notion configuration is incomplete')
    }

    await onCreateNewPageInDatabase(
      flow.notionDbId,
      flow.notionAccessToken,
      JSON.parse(flow.notionTemplate)
    )
    return
  }

  throw new Error(`${step} is not executable`)
}

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

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
  trigger: DurableRunInput
) => {
  let run

  try {
    run = await db.workflowRun.create({
      data: {
        workflowId: flow.id,
        triggerType: trigger.triggerType,
        triggerEventId: trigger.eventId,
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

  if (!steps.length) {
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

  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    const stepType = steps[stepIndex]
    const stepRun = await db.workflowStepRun.create({
      data: {
        workflowRunId: run.id,
        stepIndex,
        stepType,
      },
      select: { id: true },
    })

    try {
      await executeAction(flow, stepType)
      await db.workflowStepRun.update({
        where: { id: stepRun.id },
        data: {
          status: 'SUCCEEDED',
          output: { message: 'Action completed' },
          finishedAt: new Date(),
        },
      })
    } catch (error) {
      const message = getErrorMessage(error, stepType)

      await db.$transaction([
        db.workflowStepRun.update({
          where: { id: stepRun.id },
          data: {
            status: 'FAILED',
            error: message,
            finishedAt: new Date(),
          },
        }),
        db.workflowRun.update({
          where: { id: run.id },
          data: {
            status: 'FAILED',
            error: message,
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
