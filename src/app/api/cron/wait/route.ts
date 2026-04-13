export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  deleteScheduledJob,
  executeWorkflowSteps,
  parseStoredCronState,
  scheduleWorkflowResume,
} from '@/lib/workflow-runner'

export async function GET(req: NextRequest) {
  const flowId = req.nextUrl.searchParams.get('flow_id')

  if (!flowId) {
    return NextResponse.json({ message: 'flow_id is required' }, { status: 400 })
  }

  const flow = await db.workflows.findUnique({
    where: { id: flowId },
  })

  if (!flow) {
    return NextResponse.json({ message: 'workflow not found' }, { status: 404 })
  }

  const cronState = parseStoredCronState(flow.cronPath)

  if (!cronState?.steps?.length) {
    return NextResponse.json({ message: 'no queued workflow steps' }, { status: 200 })
  }

  const result = await executeWorkflowSteps(flow, cronState.steps)

  await deleteScheduledJob(cronState.jobId)

  if (result.paused && result.remainingSteps.length) {
    const baseUrl = process.env.NGROK_URI || req.nextUrl.origin
    await scheduleWorkflowResume({
      flowId: flow.id,
      steps: result.remainingSteps,
      baseUrl,
    })

    return NextResponse.json({ message: 'workflow rescheduled' }, { status: 200 })
  }

  await db.workflows.update({
    where: { id: flow.id },
    data: {
      cronPath: null,
    },
  })

  return NextResponse.json({ message: 'workflow completed' }, { status: 200 })
}
