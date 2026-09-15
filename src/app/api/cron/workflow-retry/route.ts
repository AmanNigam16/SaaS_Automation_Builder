export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  deleteScheduledJob,
  executeDurableWorkflowRun,
  parseFlowSteps,
} from '@/lib/workflow-runner'

const hasValidRetryToken = (token: string | null, expectedHash: string | null) => {
  if (!token || !expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash)) {
    return false
  }

  const actual = createHash('sha256').update(token).digest()
  return timingSafeEqual(actual, Buffer.from(expectedHash, 'hex'))
}

export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get('run_id')
  const retryToken = req.headers.get('x-workflow-retry-token')
  if (!runId || !retryToken) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
  }

  const run = await db.workflowRun.findUnique({
    where: { id: runId },
    include: {
      workflow: true,
      steps: { orderBy: [{ stepIndex: 'asc' }, { attempt: 'desc' }] },
    },
  })
  if (!run || !hasValidRetryToken(retryToken, run.retryTokenHash)) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
  }

  const claimed = await db.workflowRun.updateMany({
    where: {
      id: run.id,
      status: 'WAITING',
      retryTokenHash: run.retryTokenHash,
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
  if (!claimed.count) {
    return NextResponse.json({ message: 'already handled' }, { status: 200 })
  }

  await deleteScheduledJob(run.retryJobId ?? undefined).catch(() => undefined)

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

  const steps = parseFlowSteps(run.workflow.flowPath)
  const startStepIndex = steps.findIndex(
    (_, index) => latestStepByIndex.get(index)?.status !== 'SUCCEEDED'
  )
  if (startStepIndex < 0) {
    await db.workflowRun.update({
      where: { id: run.id },
      data: { status: 'SUCCEEDED', finishedAt: new Date() },
    })
    return NextResponse.json({ message: 'already completed' }, { status: 200 })
  }

  const result = await executeDurableWorkflowRun(
    run.workflow,
    steps,
    {
      eventId: run.triggerEventId,
      triggerType: run.triggerType,
      metadata: run.input ?? undefined,
      baseUrl: req.nextUrl.origin,
    },
    {
      runId: run.id,
      startStepIndex,
      nextAttemptByStep,
      reservedStepIndexes,
      retryCount: run.retryCount,
      alreadyClaimed: true,
    }
  )

  return NextResponse.json({ message: result.status }, { status: 200 })
}
