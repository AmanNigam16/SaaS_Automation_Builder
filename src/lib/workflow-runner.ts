import axios from 'axios'
import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { postContentToWebHook } from '@/app/(main)/(pages)/connections/_actions/discord-connection'
import { onCreateNewPageInDatabase } from '@/app/(main)/(pages)/connections/_actions/notion-connection'
import { postMessageToSlack } from '@/app/(main)/(pages)/connections/_actions/slack-connection'
import { executeCalendarAction, executeGmailAction } from '@/lib/google-workspace'
import {
  applyFormatter,
  evaluateCondition,
  getWaitUntil,
  parseWorkflowPlan,
  resolveExpression,
  type WorkflowContext,
  type WorkflowNodeConfig,
  type WorkflowPlan,
  type WorkflowPlanNode,
  type WorkflowValue,
} from '@/lib/workflow-semantics'

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
  executionState?: WorkflowExecutionState
}

export type WorkflowExecutionItem = {
  nodeId: string
  context: WorkflowContext
}

export type WorkflowExecutionState = {
  version: 1
  queue: WorkflowExecutionItem[]
  nextStepIndex: number
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

const prepareAction = async (
  flow: WorkflowRecord,
  step: string,
  context?: WorkflowContext,
  config: WorkflowNodeConfig = {}
) => {
  if (step === 'Discord') {
    const template = config.template
      ? String(resolveExpression(config.template, context!))
      : flow.discordTemplate
    if (!template) throw new Error('Discord template is missing')

    const discordMessage = await db.discordWebhook.findFirst({
      where: { userId: flow.userId },
      select: { url: true },
    })

    if (!discordMessage) throw new Error('Discord connection is missing')

    return async () => {
      await postContentToWebHook(template, discordMessage.url)
      return { message: 'Message sent' }
    }
  }

  if (step === 'Slack') {
    const template = config.template
      ? String(resolveExpression(config.template, context!))
      : flow.slackTemplate
    if (
      !flow.slackAccessToken ||
      !template ||
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
        template
      )
      return { message: 'Message sent' }
    }
  }

  if (step === 'Notion') {
    const template = config.template
      ? String(resolveExpression(config.template, context!))
      : flow.notionTemplate
    if (
      !flow.notionDbId ||
      !flow.notionAccessToken ||
      !template
    ) {
      throw new Error('Notion configuration is incomplete')
    }

    const content = JSON.parse(template)
    return async () => {
      const page = await onCreateNewPageInDatabase(
        flow.notionDbId!,
        flow.notionAccessToken!,
        content
      )
      return { message: 'Page created', pageId: page?.id ?? null }
    }
  }

  if (step === 'Email') {
    return () => executeGmailAction(flow.userId, config, context!)
  }

  if (step === 'Google Calendar') {
    return () => executeCalendarAction(flow.userId, config, context!)
  }

  throw new Error(`${step} is not executable`)
}

const executeAction = async (flow: WorkflowRecord, step: string) => {
  const action = await prepareAction(flow, step)
  await action()
}

const asWorkflowValue = (value: Prisma.InputJsonValue | undefined): Record<string, WorkflowValue> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, WorkflowValue>)
    : {}

export const parseWorkflowExecutionState = (
  value: Prisma.JsonValue | null | undefined
): WorkflowExecutionState | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const execution = (value as Record<string, Prisma.JsonValue>).execution
  if (!execution || typeof execution !== 'object' || Array.isArray(execution)) return null
  const state = execution as unknown as WorkflowExecutionState
  return state.version === 1 && Array.isArray(state.queue) && Number.isInteger(state.nextStepIndex)
    ? state
    : null
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

const scheduleWorkflowWait = async ({
  runId,
  resumeAt,
  baseUrl,
}: {
  runId: string
  resumeAt: Date
  baseUrl?: string
}) => {
  if (!process.env.CRON_JOB_KEY || !baseUrl || !isPublicProductionUrl(baseUrl)) {
    return null
  }

  const scheduledAt = new Date(resumeAt)
  scheduledAt.setUTCSeconds(0, 0)
  if (scheduledAt <= new Date()) scheduledAt.setUTCMinutes(scheduledAt.getUTCMinutes() + 1)
  const resumeToken = randomBytes(32).toString('hex')
  const resumeTokenHash = createHash('sha256').update(resumeToken).digest('hex')
  const response = await axios.put(
    'https://api.cron-job.org/jobs',
    {
      job: {
        enabled: true,
        title: `Workflow wait ${runId}`,
        saveResponses: false,
        url: `${normalizeBaseUrl(baseUrl)}/api/cron/workflow-resume?run_id=${encodeURIComponent(runId)}`,
        requestMethod: 0,
        extendedData: { headers: { 'X-Workflow-Resume-Token': resumeToken } },
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

  const plan = parseWorkflowPlan(value)
  if (plan) return plan

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && parsed.every((step) => typeof step === 'string')
      ? parsed
      : []
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

const executePlannedWorkflowRun = async ({
  flow,
  plan,
  runId,
  trigger,
  existingRun,
}: {
  flow: WorkflowRecord
  plan: WorkflowPlan
  runId: string
  trigger: DurableRunInput
  existingRun?: ExistingRunOptions
}) => {
  const nodeById = new Map(plan.nodes.map((node) => [node.id, node]))
  const outgoing = (nodeId: string, branch?: 'true' | 'false') =>
    plan.edges.filter(
      (edge) =>
        edge.source === nodeId &&
        (branch === undefined || edge.branch === branch || edge.branch === undefined)
    )

  const baseContext: WorkflowContext = {
    trigger: asWorkflowValue(trigger.metadata),
    steps: {},
  }
  const state: WorkflowExecutionState = existingRun?.executionState ?? {
    version: 1,
    queue: outgoing(plan.triggerId).map((edge) => ({
      nodeId: edge.target,
      context: baseContext,
    })),
    nextStepIndex: 0,
  }

  const persistState = () =>
    db.workflowRun.update({
      where: { id: runId },
      data: { output: { execution: state } as unknown as Prisma.InputJsonValue },
    })

  const completeStep = async (
    stepRunId: string,
    node: WorkflowPlanNode,
    item: WorkflowExecutionItem,
    output: Record<string, WorkflowValue>
  ) => {
    item.context.steps[node.id] = output
    await db.workflowStepRun.update({
      where: { id: stepRunId },
      data: {
        status: 'SUCCEEDED',
        output: output as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    })
  }

  const enqueue = (
    node: WorkflowPlanNode,
    context: WorkflowContext,
    branch?: 'true' | 'false'
  ) => {
    for (const edge of outgoing(node.id, branch)) {
      state.queue.push({
        nodeId: edge.target,
        context: structuredClone(context),
      })
    }
  }

  while (state.queue.length) {
    const item = state.queue.shift()!
    const node = nodeById.get(item.nodeId)
    if (!node) throw new Error('Workflow plan references a missing node')
    const stepIndex = state.nextStepIndex++
    const stepRun = await db.workflowStepRun.create({
      data: {
        workflowRunId: runId,
        stepIndex,
        stepType: node.type,
        attempt: existingRun?.nextAttemptByStep.get(stepIndex) ?? 1,
        input: {
          nodeId: node.id,
          config: node.config,
          context: item.context,
        } as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    })

    try {
      if (node.type === 'Condition') {
        const matched = evaluateCondition(node.config, item.context)
        await completeStep(stepRun.id, node, item, { matched })
        if ((node.config.conditionMode ?? 'branch') === 'branch') {
          enqueue(node, item.context, matched ? 'true' : 'false')
        } else if (matched) {
          enqueue(node, item.context, 'true')
        }
        await persistState()
        continue
      }

      if (node.type === 'Formatter') {
        const result = applyFormatter(node.config, item.context)
        await completeStep(stepRun.id, node, item, { result })
        enqueue(node, item.context)
        await persistState()
        continue
      }

      if (node.type === 'Loop') {
        const resolved = resolveExpression(node.config.items ?? '', item.context)
        if (!Array.isArray(resolved)) throw new Error('Loop input must resolve to a list')
        const maxItems = Math.min(Math.max(node.config.maxItems ?? 25, 1), 100)
        const items = resolved.slice(0, maxItems)
        await completeStep(stepRun.id, node, item, { items, count: items.length })
        const nextEdges = outgoing(node.id)
        for (let index = 0; index < items.length; index++) {
          const loopItem = items[index]
          for (const edge of nextEdges) {
            state.queue.push({
              nodeId: edge.target,
              context: structuredClone({
                ...item.context,
                loop: { item: loopItem, index, items },
              }),
            })
          }
        }
        await persistState()
        continue
      }

      if (node.type === 'Wait') {
        const resumeAt = getWaitUntil(node.config)
        await completeStep(stepRun.id, node, item, {
          resumedAt: resumeAt.toISOString(),
        })
        enqueue(node, item.context)
        let scheduled: Awaited<ReturnType<typeof scheduleWorkflowWait>> = null
        try {
          scheduled = await scheduleWorkflowWait({
            runId,
            resumeAt,
            baseUrl: trigger.baseUrl,
          })
          await db.workflowRun.update({
            where: { id: runId },
            data: {
              status: 'WAITING',
              error: null,
              retryAt: scheduled?.scheduledAt ?? resumeAt,
              retryJobId: scheduled?.jobId,
              retryTokenHash: scheduled?.resumeTokenHash,
              output: { execution: state } as unknown as Prisma.InputJsonValue,
            },
          })
        } catch (error) {
          if (scheduled?.jobId) await deleteScheduledJob(scheduled.jobId).catch(() => undefined)
          const message = error instanceof Error ? error.message : 'Wait scheduling failed'
          await db.workflowRun.update({
            where: { id: runId },
            data: {
              status: 'FAILED',
              error: message,
              output: { execution: state } as unknown as Prisma.InputJsonValue,
              finishedAt: new Date(),
            },
          })
          return { status: 'failed' as const, runId }
        }
        return { status: 'waiting' as const, runId, retryAt: resumeAt }
      }

      const action = await prepareAction(flow, node.type, item.context, node.config)
      const creditReserved = existingRun?.reservedStepIndexes?.has(stepIndex)
        ? true
        : await reserveActionCredit(flow.userId)
      if (!creditReserved) throw new Error('No credits are available for this action')
      await db.workflowStepRun.update({
        where: { id: stepRun.id },
        data: { creditCharged: true },
      })
      const output = await action()
      await completeStep(stepRun.id, node, item, output)
      enqueue(node, item.context)
      await persistState()
    } catch (error) {
      const failure =
        error instanceof Error && error.message === 'No credits are available for this action'
          ? { message: error.message, retryable: false, errorCode: 'NO_CREDITS' }
          : getActionFailure(error, node.type)
      state.nextStepIndex = stepIndex
      state.queue.unshift(item)
      const retryDelayMs =
        failure.errorCode === 'RATE_LIMITED'
          ? getRetryDelayMs(existingRun?.retryCount ?? 0)
          : null
      if (retryDelayMs !== null && trigger.baseUrl) {
        const retryAt = new Date(Date.now() + retryDelayMs)
        const scheduled = await scheduleWorkflowRetry({
          runId,
          retryAt,
          baseUrl: trigger.baseUrl,
        }).catch(() => null)
        if (scheduled) {
          try {
            await db.$transaction([
              db.workflowStepRun.update({
                where: { id: stepRun.id },
                data: { status: 'FAILED', error: failure.message, errorCode: failure.errorCode, retryable: true, finishedAt: new Date() },
              }),
              db.workflowRun.update({
                where: { id: runId },
                data: {
                  status: 'WAITING',
                  error: failure.message,
                  retryAt: scheduled.scheduledAt,
                  retryCount: { increment: 1 },
                  retryJobId: scheduled.jobId,
                  retryTokenHash: scheduled.resumeTokenHash,
                  output: { execution: state } as unknown as Prisma.InputJsonValue,
                },
              }),
            ])
            return { status: 'waiting' as const, runId, retryAt: scheduled.scheduledAt }
          } catch {
            await deleteScheduledJob(scheduled.jobId).catch(() => undefined)
          }
        }
      }
      await db.$transaction([
        db.workflowStepRun.update({
          where: { id: stepRun.id },
          data: { status: 'FAILED', error: failure.message, errorCode: failure.errorCode, retryable: failure.retryable, finishedAt: new Date() },
        }),
        db.workflowRun.update({
          where: { id: runId },
          data: { status: 'FAILED', error: failure.message, output: { execution: state } as unknown as Prisma.InputJsonValue, finishedAt: new Date() },
        }),
      ])
      return { status: 'failed' as const, runId }
    }
  }

  await db.workflowRun.update({
    where: { id: runId },
    data: {
      status: 'SUCCEEDED',
      output: { completedSteps: state.nextStepIndex, execution: state } as unknown as Prisma.InputJsonValue,
      finishedAt: new Date(),
    },
  })
  return { status: 'succeeded' as const, runId }
}

export const executeDurableWorkflowRun = async (
  flow: WorkflowRecord,
  steps: string[] | WorkflowPlan,
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

  if (!Array.isArray(steps)) {
    return executePlannedWorkflowRun({
      flow,
      plan: steps,
      runId: run.id,
      trigger,
      existingRun,
    })
  }

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
        }).catch(() => null)

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
