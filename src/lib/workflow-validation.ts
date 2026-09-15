import { db } from '@/lib/db'
import { validateLinearWorkflowGraph } from '@/lib/workflow-graph'

export { validateLinearWorkflowGraph } from '@/lib/workflow-graph'

export const validateWorkflowForPublish = async (
  workflowId: string,
  userId: string
) => {
  const workflow = await db.workflows.findFirst({
    where: { id: workflowId, userId },
  })
  if (!workflow) {
    return { valid: false as const, message: 'Workflow not found' }
  }

  const graph = validateLinearWorkflowGraph(workflow.nodes, workflow.edges)
  if (!graph.valid) return graph

  const [googleUser, discord, slack, notion] = await Promise.all([
    db.user.findUnique({
      where: { clerkId: userId },
      select: {
        googleResourceId: true,
        LocalGoogleCredential: { select: { subscribed: true, grantedScopes: true } },
      },
    }),
    graph.steps.includes('Discord')
      ? db.discordWebhook.findFirst({ where: { userId }, select: { id: true } })
      : null,
    graph.steps.includes('Slack') && workflow.slackAccessToken
      ? db.slack.findFirst({
          where: { userId, slackAccessToken: workflow.slackAccessToken },
          select: { id: true },
        })
      : null,
    graph.steps.includes('Notion') && workflow.notionAccessToken
      ? db.notion.findFirst({
          where: {
            userId,
            accessToken: workflow.notionAccessToken,
            databaseId: workflow.notionDbId ?? undefined,
          },
          select: { id: true },
        })
      : null,
  ])

  if (
    !googleUser?.googleResourceId ||
    !googleUser.LocalGoogleCredential?.subscribed
  ) {
    return {
      valid: false as const,
      message: 'Create the Google Drive listener before publishing',
    }
  }

  const requiredGoogleScopes = [
    ...(graph.steps.includes('Email')
      ? ['https://www.googleapis.com/auth/gmail.compose']
      : []),
    ...(graph.steps.includes('Google Calendar')
      ? ['https://www.googleapis.com/auth/calendar']
      : []),
    ...(graph.steps.includes('Google Drive Action')
      ? ['https://www.googleapis.com/auth/drive']
      : []),
  ]
  if (
    requiredGoogleScopes.some(
      (scope) => !googleUser.LocalGoogleCredential?.grantedScopes.includes(scope)
    )
  ) {
    return {
      valid: false as const,
      message: 'Reconnect Google to grant the permissions required by this workflow',
    }
  }

  if (graph.steps.includes('AI') && !process.env.GEMINI_API_KEY) {
    return {
      valid: false as const,
      message: 'Configure the Gemini API key before publishing AI actions',
    }
  }

  if (
    graph.steps.includes('Discord') &&
    (!discord || !workflow.discordTemplate?.trim())
  ) {
    return {
      valid: false as const,
      message: 'Connect Discord and save its message template',
    }
  }

  if (
    graph.steps.includes('Slack') &&
    (!slack || !workflow.slackTemplate?.trim() || !workflow.slackChannels.length)
  ) {
    return {
      valid: false as const,
      message: 'Connect Slack, select channels, and save its template',
    }
  }

  if (
    graph.steps.includes('Notion') &&
    (!notion || !workflow.notionTemplate?.trim() || !workflow.notionDbId)
  ) {
    return {
      valid: false as const,
      message: 'Connect Notion and save its database template',
    }
  }

  return graph
}
