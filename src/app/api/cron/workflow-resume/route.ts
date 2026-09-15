export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  deleteScheduledJob,
  executeDurableWorkflowRun,
  parseFlowSteps,
  parseWorkflowExecutionState,
  verifyWorkflowResumeToken,
} from '@/lib/workflow-runner'

export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get('run_id')
  const token = req.headers.get('x-workflow-resume-token')
  if (!runId || !token) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
  }

  const run = await db.workflowRun.findUnique({
    where: { id: runId },
    include: {
      workflow: true,
      steps: { orderBy: [{ stepIndex: 'asc' }, { attempt: 'desc' }] },
    },
  })
  if (
    !run ||
    run.status !== 'WAITING' ||
    !verifyWorkflowResumeToken(token, run.retryTokenHash ?? undefined)
  ) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
  }
  if (run.retryAt && run.retryAt.getTime() > Date.now() + 60_000) {
    return NextResponse.json({ message: 'wait is not ready' }, { status: 409 })
  }

  const executionState = parseWorkflowExecutionState(run.output)
  const plan = parseFlowSteps(run.workflow.flowPath)
  if (!executionState || Array.isArray(plan)) {
    return NextResponse.json({ message: 'resume state missing' }, { status: 409 })
  }

  const claimed = await db.workflowRun.updateMany({
    where: { id: run.id, status: 'WAITING', retryTokenHash: run.retryTokenHash },
    data: {
      status: 'RUNNING',
      error: null,
      retryAt: null,
      retryJobId: null,
      retryTokenHash: null,
      finishedAt: null,
    },
  })
  if (!claimed.count) {
    return NextResponse.json({ message: 'already handled' }, { status: 200 })
  }

  await deleteScheduledJob(run.retryJobId ?? undefined).catch(() => undefined)
  const nextAttemptByStep = new Map<number, number>()
  const reservedStepIndexes = new Set<number>()
  for (const step of run.steps) {
    nextAttemptByStep.set(
      step.stepIndex,
      Math.max(nextAttemptByStep.get(step.stepIndex) ?? 1, step.attempt + 1)
    )
    if (step.creditCharged) reservedStepIndexes.add(step.stepIndex)
  }

  const result = await executeDurableWorkflowRun(
    run.workflow,
    plan,
    {
      eventId: run.triggerEventId,
      triggerType: run.triggerType,
      metadata: run.input ?? undefined,
      baseUrl: req.nextUrl.origin,
    },
    {
      runId: run.id,
      startStepIndex: executionState.nextStepIndex,
      nextAttemptByStep,
      reservedStepIndexes,
      retryCount: run.retryCount,
      alreadyClaimed: true,
      executionState,
    }
  )

  return NextResponse.json({ message: result.status }, { status: 200 })
}
