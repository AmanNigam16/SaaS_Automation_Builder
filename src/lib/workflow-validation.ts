import { db } from '@/lib/db'
import { validateLinearWorkflowGraph } from '@/lib/workflow-graph'
import { getTriggerConfig, getTriggerKind } from '@/lib/workflow-triggers'

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
  const triggerKind = getTriggerKind(graph.plan)
  const triggerConfig = getTriggerConfig(graph.plan)

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
    graph.steps.includes('Slack')
      ? db.slack.findFirst({ where: { userId }, select: { id: true } })
      : null,
    graph.steps.includes('Notion')
      ? db.notion.findFirst({
          where: {
            userId,
            databaseId: workflow.notionDbId ?? undefined,
          },
          select: { id: true },
        })
      : null,
  ])

  if (triggerKind === 'drive' && (
    !googleUser?.googleResourceId ||
    !googleUser.LocalGoogleCredential?.subscribed
  )) {
    return {
      valid: false as const,
      message: 'Create the Google Drive listener before publishing',
    }
  }

  const requiredGoogleScopes = [
    ...(triggerKind === 'gmail'
      ? ['https://www.googleapis.com/auth/gmail.readonly']
      : []),
    ...(triggerKind === 'calendar'
      ? ['https://www.googleapis.com/auth/calendar']
      : []),
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
      (scope) => !googleUser?.LocalGoogleCredential?.grantedScopes.includes(scope)
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
    triggerKind === 'webhook' &&
    triggerConfig.webhookRequireSignature &&
    !process.env.INBOUND_WEBHOOK_SECRET
  ) {
    return {
      valid: false as const,
      message: 'Configure the inbound webhook signature secret before publishing',
    }
  }

  if (
    process.env.VERCEL_ENV === 'production' &&
    ['schedule', 'gmail', 'calendar', 'drive'].includes(triggerKind) &&
    !process.env.CRON_JOB_KEY
  ) {
    return {
      valid: false as const,
      message: 'Configure the trigger scheduler before publishing this workflow',
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
