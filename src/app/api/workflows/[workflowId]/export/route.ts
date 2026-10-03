export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { auth } from '@clerk/nextjs'
import { db } from '@/lib/db'

const safeFileName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workflow'

export async function GET(
  _request: Request,
  { params }: { params: { workflowId: string } }
) {
  const { userId } = auth()
  if (!userId) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  const workflow = await db.workflows.findFirst({
    where: { id: params.workflowId, userId },
    select: {
      name: true,
      description: true,
      nodes: true,
      edges: true,
      discordTemplate: true,
      notionTemplate: true,
      slackTemplate: true,
      slackChannels: true,
      notionDbId: true,
    },
  })
  if (!workflow) return Response.json({ message: 'Workflow not found' }, { status: 404 })

  return new Response(
    JSON.stringify({ format: 'fuzzie-workflow', version: 1, workflow }, null, 2),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="${safeFileName(workflow.name)}.json"`,
        'cache-control': 'private, no-store',
      },
    }
  )
}
