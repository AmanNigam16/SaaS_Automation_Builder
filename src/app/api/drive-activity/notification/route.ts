export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import {
  executeWorkflowSteps,
  parseFlowSteps,
  scheduleWorkflowResume,
} from '@/lib/workflow-runner'

export async function POST(req: NextRequest) {
  console.log('🔴 Changed')

  // ✅ Use request headers (build-safe)
  const channelResourceId = req.headers.get('x-goog-resource-id')

  if (!channelResourceId) {
    return Response.json({ message: 'success' }, { status: 200 })
  }

  // ✅ Import Prisma ONLY at runtime
  const { db } = await import('@/lib/db')

  const user = await db.user.findFirst({
    where: {
      googleResourceId: channelResourceId,
    },
    select: { clerkId: true, credits: true },
  })

  if (!user) {
    return Response.json({ message: 'success' }, { status: 200 })
  }

  if (!(user.credits === 'Unlimited' || parseInt(user.credits!) > 0)) {
    return Response.json({ message: 'no credits' }, { status: 200 })
  }

  const workflows = await db.workflows.findMany({
    where: {
      userId: user.clerkId,
      publish: true,
    },
  })

  for (const flow of workflows) {
    const flowPath = parseFlowSteps(flow.flowPath)
    const result = await executeWorkflowSteps(flow, flowPath)

    if (result.paused && result.remainingSteps.length) {
      await scheduleWorkflowResume({
        flowId: flow.id,
        steps: result.remainingSteps,
        baseUrl: process.env.NGROK_URI || req.nextUrl.origin,
      })
    }

    await db.user.update({
      where: { clerkId: user.clerkId },
      data: {
        credits:
          user.credits === 'Unlimited'
            ? 'Unlimited'
            : `${parseInt(user.credits!) - 1}`,
      },
    })
  }

  return Response.json({ message: 'flow completed' }, { status: 200 })
}
