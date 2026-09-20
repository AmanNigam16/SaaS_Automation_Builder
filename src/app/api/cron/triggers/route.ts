export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { processWorkflowTrigger, verifyTriggerToken } from '@/lib/workflow-triggers'

export async function POST(req: NextRequest) {
  const workflowId = req.nextUrl.searchParams.get('workflow_id')
  if (!workflowId) return Response.json({ message: 'Missing workflow ID' }, { status: 400 })
  const state = await db.workflowTriggerState.findUnique({
    where: { workflowId },
    select: { jobTokenHash: true },
  })
  if (!state || !verifyTriggerToken(req.headers.get('x-workflow-trigger-token'), state.jobTokenHash)) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await processWorkflowTrigger(workflowId, req.nextUrl.origin)
    return Response.json(result)
  } catch {
    return Response.json({ message: 'Trigger processing failed' }, { status: 502 })
  }
}
