export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import {
  executeDurableWorkflowRun,
  parseFlowSteps,
} from '@/lib/workflow-runner'
import { matchesDriveTrigger } from '@/lib/workflow-semantics'

const MAX_CONCURRENT_WORKFLOWS = 4

export async function POST(req: NextRequest) {
  const channelResourceId = req.headers.get('x-goog-resource-id')
  const channelId = req.headers.get('x-goog-channel-id')
  const channelToken = req.headers.get('x-goog-channel-token')
  const messageNumber = req.headers.get('x-goog-message-number')
  const resourceState = req.headers.get('x-goog-resource-state')
  const supportedResourceStates = new Set([
    'add',
    'remove',
    'update',
    'trash',
    'untrash',
    'change',
    'changed',
  ])

  if (
    !channelResourceId ||
    !channelId ||
    !channelToken ||
    !messageNumber ||
    resourceState === 'sync' ||
    !resourceState ||
    !supportedResourceStates.has(resourceState)
  ) {
    return Response.json({ message: 'success' }, { status: 200 })
  }

  const [{ db }, { google }, { getGoogleDriveClient }] = await Promise.all([
    import('@/lib/db'),
    import('googleapis'),
    import('@/lib/google-drive'),
  ])

  const user = await db.user.findFirst({
    where: {
      googleResourceId: channelResourceId,
      LocalGoogleCredential: {
        is: {
          channelId,
          webhookToken: channelToken,
          subscribed: true,
        },
      },
    },
    select: {
      id: true,
      clerkId: true,
      credits: true,
      LocalGoogleCredential: { select: { pageToken: true } },
    },
  })

  if (!user) {
    return Response.json({ message: 'success' }, { status: 200 })
  }

  const availableCredits = Number.parseInt(user.credits ?? '0')
  if (!(user.credits === 'Unlimited' || availableCredits > 0)) {
    return Response.json({ message: 'no credits' }, { status: 200 })
  }

  const pageToken = user.LocalGoogleCredential?.pageToken
  const oauth2Client = await getGoogleDriveClient(user.clerkId)

  if (!pageToken || !oauth2Client) {
    return Response.json({ message: 'success' }, { status: 200 })
  }

  const drive = google.drive({ version: 'v3', auth: oauth2Client })
  const workflows = await db.workflows.findMany({
    where: { userId: user.clerkId, publish: true },
  })
  const workflowExecutions = workflows.map((flow) => ({
    flow,
    steps: parseFlowSteps(flow.flowPath),
  }))

  const counts = { changes: 0, started: 0, succeeded: 0, failed: 0, duplicates: 0 }
  let currentPageToken = pageToken

  while (currentPageToken) {
    const response = await drive.changes.list({
      pageToken: currentPageToken,
      includeRemoved: true,
      supportsAllDrives: true,
      fields:
        'nextPageToken,newStartPageToken,changes(fileId,removed,time,file(id,name,mimeType,modifiedTime,trashed,parents))',
    })

    const changes = (response.data.changes ?? []).map((change, index) => {
      const eventId = createHash('sha256')
        .update(`${channelResourceId}:${currentPageToken}:${index}`)
        .digest('hex')

      return {
        eventId,
        metadata: {
          fileId: change.fileId ?? change.file?.id ?? null,
          fileName: change.file?.name ?? null,
          mimeType: change.file?.mimeType ?? null,
          modifiedTime: change.file?.modifiedTime ?? change.time ?? null,
          removed: change.removed ?? false,
          resourceState,
          parentIds: change.file?.parents ?? [],
        },
      }
    })

    for (const change of changes) {
      counts.changes++

      const matchingWorkflows = workflowExecutions.filter(({ steps }) => {
        if (Array.isArray(steps)) return true
        const triggerNode = steps.nodes.find((node) => node.id === steps.triggerId)
        return triggerNode ? matchesDriveTrigger(triggerNode.config, change.metadata) : false
      })
      for (let offset = 0; offset < matchingWorkflows.length; offset += MAX_CONCURRENT_WORKFLOWS) {
        const batch = matchingWorkflows.slice(offset, offset + MAX_CONCURRENT_WORKFLOWS)
        const results = await Promise.all(
          batch.map(({ flow, steps }) =>
            executeDurableWorkflowRun(flow, steps, {
              eventId: change.eventId,
              triggerType: 'Google Drive',
              metadata: change.metadata,
            })
          )
        )

        for (const result of results) {
          if (result.status === 'duplicate') counts.duplicates++
          else {
            counts.started++
            if (result.status === 'succeeded') counts.succeeded++
            if (result.status === 'failed') counts.failed++
          }
        }
      }
    }

    const nextPageToken = response.data.nextPageToken ?? response.data.newStartPageToken
    if (!nextPageToken) throw new Error('Drive change response has no continuation token')

    const advanced = await db.localGoogleCredential.updateMany({
      where: {
        userId: user.id,
        channelId,
        pageToken: currentPageToken,
        subscribed: true,
      },
      data: { pageToken: nextPageToken },
    })

    if (!advanced.count) break
    currentPageToken = response.data.nextPageToken ?? ''
  }

  return Response.json(
    {
      message: 'notification processed',
      ...counts,
    },
    { status: 200 }
  )
}
