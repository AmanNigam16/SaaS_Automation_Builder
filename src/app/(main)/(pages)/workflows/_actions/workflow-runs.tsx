'use server'

import { randomUUID } from 'crypto'
import { auth } from '@clerk/nextjs'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import {
  deleteScheduledJob,
  executeDurableWorkflowRun,
  parseFlowSteps,
  parseWorkflowExecutionState,
} from '@/lib/workflow-runner'
import { validateWorkflowForPublish } from '@/lib/workflow-validation'

const STALE_RUN_MS = 15 * 60 * 1000

const getRequestBaseUrl = () => {
  const requestHeaders = headers()
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https'
  return host ? `${protocol}://${host}` : undefined
}

export const runWorkflowNow = async (workflowId: string) => {
  const { userId } = auth()
  if (!userId) return { message: 'Unauthorized' }

  const validation = await validateWorkflowForPublish(workflowId, userId)
  if (!validation.valid) return { message: `Cannot run: ${validation.message}` }

  const workflow = await db.workflows.findFirst({
    where: { id: workflowId, userId },
  })
  if (!workflow) return { message: 'Workflow not found' }

  const result = await executeDurableWorkflowRun(workflow, validation.plan, {
    eventId: `manual:${randomUUID()}`,
    triggerType: 'Manual run',
    metadata: { requestedBy: 'user' },
    baseUrl: getRequestBaseUrl(),
  })

  revalidatePath('/logs')
  return {
    message:
      result.status === 'succeeded'
        ? 'Workflow completed'
        : result.status === 'failed'
          ? 'Workflow failed. See Logs for details.'
          : 'Workflow could not be started',
  }
}

export const retryWorkflowRun = async (runId: string) => {
  const { userId } = auth()
  if (!userId) return { message: 'Unauthorized' }

  const run = await db.workflowRun.findFirst({
    where: { id: runId, workflow: { userId } },
    include: {
      workflow: true,
      steps: { orderBy: [{ stepIndex: 'asc' }, { attempt: 'desc' }] },
    },
  })
  if (!run) return { message: 'Workflow run not found' }

  const isStaleRunning =
    run.status === 'RUNNING' &&
    Date.now() - run.startedAt.getTime() > STALE_RUN_MS
  if (
    !(
      run.status === 'QUEUED' ||
      run.status === 'WAITING' ||
      run.status === 'FAILED' ||
      run.status === 'PAUSED' ||
      isStaleRunning
    )
  ) {
    return {
      message: 'Only waiting, queued, failed, paused, or interrupted runs can be retried',
    }
  }

  if (isStaleRunning) {
    const paused = await db.workflowRun.updateMany({
      where: { id: run.id, status: 'RUNNING' },
      data: { status: 'PAUSED' },
    })
    if (!paused.count) return { message: 'This run is already being handled' }
  }

  const steps = parseFlowSteps(run.workflow.flowPath)
  const latestStepByIndex = new Map<number, (typeof run.steps)[number]>()
  const nextAttemptByStep = new Map<number, number>()
  const reservedStepIndexes = new Set<number>()

  for (const step of run.steps) {
    if (!latestStepByIndex.has(step.stepIndex)) {
      latestStepByIndex.set(step.stepIndex, step)
    }
    nextAttemptByStep.set(
      step.stepIndex,
      Math.max(nextAttemptByStep.get(step.stepIndex) ?? 1, step.attempt + 1)
    )
    if (step.creditCharged) reservedStepIndexes.add(step.stepIndex)
  }

  const executionState = !Array.isArray(steps)
    ? parseWorkflowExecutionState(run.output)
    : null
  const startStepIndex = Array.isArray(steps)
    ? steps.findIndex(
        (_, index) => latestStepByIndex.get(index)?.status !== 'SUCCEEDED'
      )
    : executionState?.nextStepIndex ?? 0
  if (Array.isArray(steps) && startStepIndex < 0) {
    return { message: 'This run has no retryable step' }
  }
  if (!Array.isArray(steps) && !executionState) {
    return { message: 'This run has no resumable execution state' }
  }

  if (run.status === 'WAITING') {
    if (run.retryAt && run.retryAt.getTime() > Date.now()) {
      return { message: `This run can resume after ${run.retryAt.toLocaleString()}` }
    }
    await deleteScheduledJob(run.retryJobId ?? undefined).catch(() => undefined)
  }

  const result = await executeDurableWorkflowRun(
    run.workflow,
    steps,
    {
      eventId: run.triggerEventId,
      triggerType: run.triggerType,
      metadata: run.input ?? undefined,
      baseUrl: getRequestBaseUrl(),
    },
    {
      runId: run.id,
      startStepIndex,
      nextAttemptByStep,
      reservedStepIndexes,
      retryCount: run.retryCount,
      executionState: executionState ?? undefined,
    }
  )

  revalidatePath('/logs')
  return {
    message:
      result.status === 'succeeded'
        ? 'Workflow retry completed'
        : result.status === 'waiting'
          ? 'Workflow is scheduled for a safe retry'
        : result.status === 'failed'
          ? 'Retry failed. See Logs for details.'
          : 'This run is already being handled',
  }
}
