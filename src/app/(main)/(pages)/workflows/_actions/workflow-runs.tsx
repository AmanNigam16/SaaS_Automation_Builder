'use server'

import { randomUUID } from 'crypto'
import { auth } from '@clerk/nextjs'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import {
  executeDurableWorkflowRun,
  parseFlowSteps,
} from '@/lib/workflow-runner'
import { validateWorkflowForPublish } from '@/lib/workflow-validation'

const STALE_RUN_MS = 15 * 60 * 1000

export const runWorkflowNow = async (workflowId: string) => {
  const { userId } = auth()
  if (!userId) return { message: 'Unauthorized' }

  const validation = await validateWorkflowForPublish(workflowId, userId)
  if (!validation.valid) return { message: `Cannot run: ${validation.message}` }

  const workflow = await db.workflows.findFirst({
    where: { id: workflowId, userId },
  })
  if (!workflow) return { message: 'Workflow not found' }

  const result = await executeDurableWorkflowRun(workflow, validation.steps, {
    eventId: `manual:${randomUUID()}`,
    triggerType: 'Manual run',
    metadata: { requestedBy: 'user' },
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
      run.status === 'FAILED' ||
      run.status === 'PAUSED' ||
      isStaleRunning
    )
  ) {
    return {
      message: 'Only queued, failed, paused, or interrupted runs can be retried',
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

  const startStepIndex = steps.findIndex(
    (_, index) => latestStepByIndex.get(index)?.status !== 'SUCCEEDED'
  )
  if (startStepIndex < 0) return { message: 'This run has no retryable step' }

  const result = await executeDurableWorkflowRun(
    run.workflow,
    steps,
    {
      eventId: run.triggerEventId,
      triggerType: run.triggerType,
      metadata: run.input ?? undefined,
    },
    {
      runId: run.id,
      startStepIndex,
      nextAttemptByStep,
      reservedStepIndexes,
    }
  )

  revalidatePath('/logs')
  return {
    message:
      result.status === 'succeeded'
        ? 'Workflow retry completed'
        : result.status === 'failed'
          ? 'Retry failed. See Logs for details.'
          : 'This run is already being handled',
  }
}
