export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  deleteScheduledJob,
  executeWorkflowSteps,
  parseStoredCronState,
  scheduleWorkflowResume,
  verifyWorkflowResumeToken,
} from '@/lib/workflow-runner'

export async function GET(req: NextRequest) {
  const resumeToken = req.headers.get('x-workflow-resume-token')

  if (!resumeToken) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
  }

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

  if (!verifyWorkflowResumeToken(resumeToken, cronState.resumeTokenHash)) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
  }

  const claimed = await db.workflows.updateMany({
    where: { id: flow.id, cronPath: flow.cronPath },
    data: { cronPath: null },
  })

  if (!claimed.count) {
    return NextResponse.json({ message: 'workflow already resumed' }, { status: 200 })
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

  return NextResponse.json({ message: 'workflow completed' }, { status: 200 })
}
