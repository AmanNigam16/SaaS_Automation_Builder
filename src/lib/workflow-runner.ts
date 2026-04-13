import axios from 'axios'
import { db } from '@/lib/db'
import { postContentToWebHook } from '@/app/(main)/(pages)/connections/_actions/discord-connection'
import { onCreateNewPageInDatabase } from '@/app/(main)/(pages)/connections/_actions/notion-connection'
import { postMessageToSlack } from '@/app/(main)/(pages)/connections/_actions/slack-connection'

type WorkflowRecord = {
  id: string
  userId: string
  discordTemplate: string | null
  slackChannels: string[]
  slackAccessToken: string | null
  slackTemplate: string | null
  notionDbId: string | null
  notionAccessToken: string | null
  notionTemplate: string | null
  flowPath: string | null
  cronPath: string | null
  publish: boolean | null
}

type StoredCronState = {
  jobId?: number
  steps: string[]
}

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

export const parseFlowSteps = (value: string | null | undefined) => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const parseStoredCronState = (
  value: string | null | undefined
): StoredCronState | null => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)

    if (Array.isArray(parsed)) {
      return { steps: parsed }
    }

    if (parsed && Array.isArray(parsed.steps)) {
      return {
        jobId:
          typeof parsed.jobId === 'number' ? parsed.jobId : undefined,
        steps: parsed.steps,
      }
    }
  } catch {
    return null
  }

  return null
}

export const executeWorkflowSteps = async (
  flow: WorkflowRecord,
  steps: string[]
) => {
  for (let current = 0; current < steps.length; current++) {
    const step = steps[current]

    if (step === 'Wait') {
      return {
        paused: true,
        remainingSteps: steps.slice(current + 1),
      }
    }

    if (step === 'Discord' && flow.discordTemplate) {
      const discordMessage = await db.discordWebhook.findFirst({
        where: { userId: flow.userId },
        select: { url: true },
      })

      if (discordMessage) {
        await postContentToWebHook(flow.discordTemplate, discordMessage.url)
      }
    }

    if (
      step === 'Slack' &&
      flow.slackAccessToken &&
      flow.slackTemplate &&
      flow.slackChannels.length
    ) {
      const channels = flow.slackChannels.map((channel) => ({
        label: channel,
        value: channel,
      }))

      await postMessageToSlack(
        flow.slackAccessToken,
        channels,
        flow.slackTemplate
      )
    }

    if (
      step === 'Notion' &&
      flow.notionDbId &&
      flow.notionAccessToken &&
      flow.notionTemplate
    ) {
      await onCreateNewPageInDatabase(
        flow.notionDbId,
        flow.notionAccessToken,
        JSON.parse(flow.notionTemplate)
      )
    }
  }

  return {
    paused: false,
    remainingSteps: [],
  }
}

export const scheduleWorkflowResume = async ({
  flowId,
  steps,
  baseUrl,
}: {
  flowId: string
  steps: string[]
  baseUrl: string
}) => {
  const response = await axios.put(
    'https://api.cron-job.org/jobs',
    {
      job: {
        enabled: true,
        title: `Workflow wait ${flowId}`,
        saveResponses: false,
        url: `${normalizeBaseUrl(baseUrl)}/api/cron/wait?flow_id=${flowId}`,
        requestMethod: 0,
        schedule: {
          timezone: 'UTC',
          expiresAt: 0,
          hours: [-1],
          mdays: [-1],
          minutes: [-1],
          months: [-1],
          wdays: [-1],
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.CRON_JOB_KEY!}`,
        'Content-Type': 'application/json',
      },
    }
  )

  await db.workflows.update({
    where: { id: flowId },
    data: {
      cronPath: JSON.stringify({
        jobId: response.data.jobId,
        steps,
      }),
    },
  })

  return response.data.jobId as number
}

export const deleteScheduledJob = async (jobId?: number) => {
  if (!jobId || !process.env.CRON_JOB_KEY) return

  await axios.delete(`https://api.cron-job.org/jobs/${jobId}`, {
    headers: {
      Authorization: `Bearer ${process.env.CRON_JOB_KEY}`,
      'Content-Type': 'application/json',
    },
  })
}
