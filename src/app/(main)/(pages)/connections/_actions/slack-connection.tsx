'use server'

import type { Option } from '@/components/ui/multiple-selector'

export const onSlackConnect = async (
  app_id: string,
  authed_user_id: string,
  authed_user_token: string,
  slack_access_token: string,
  bot_user_id: string,
  team_id: string,
  team_name: string,
  user_id: string
): Promise<void> => {
  if (!slack_access_token) return

  const { db } = await import('@/lib/db')

  const slackConnection = await db.slack.findFirst({
    where: { slackAccessToken: slack_access_token },
    include: { connections: true },
  })

  if (!slackConnection) {
    await db.slack.create({
      data: {
        userId: user_id,
        appId: app_id,
        authedUserId: authed_user_id,
        authedUserToken: authed_user_token,
        slackAccessToken: slack_access_token,
        botUserId: bot_user_id,
        teamId: team_id,
        teamName: team_name,
        connections: {
          create: { userId: user_id, type: 'Slack' },
        },
      },
    })
  }
}

export const getSlackConnection = async () => {
  const { currentUser } = await import('@clerk/nextjs')
  const { db } = await import('@/lib/db')

  const user = await currentUser()
  if (!user) return null

  return db.slack.findFirst({
    where: { userId: user.id },
  })
}

export async function listBotChannels(
  slackAccessToken: string
): Promise<Option[]> {
  const axios = (await import('axios')).default

  const url = `https://slack.com/api/conversations.list?${new URLSearchParams({
    types: 'public_channel,private_channel',
    limit: '200',
  })}`

  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${slackAccessToken}` },
  })

  if (!data.ok) throw new Error(data.error)
  if (!data?.channels?.length) return []

  return data.channels
    .filter((ch: any) => ch.is_member)
    .map((ch: any) => ({
      label: ch.name,
      value: ch.id,
    }))
}

const postMessageInSlackChannel = async (
  slackAccessToken: string,
  slackChannel: string,
  content: string
): Promise<void> => {
  const axios = (await import('axios')).default

  await axios.post(
    'https://slack.com/api/chat.postMessage',
    { channel: slackChannel, text: content },
    {
      headers: {
        Authorization: `Bearer ${slackAccessToken}`,
        'Content-Type': 'application/json;charset=utf-8',
      },
    }
  )
}

export const postMessageToSlack = async (
  slackAccessToken: string,
  selectedSlackChannels: Option[],
  content: string
): Promise<{ message: string }> => {
  if (!content) return { message: 'Content is empty' }
  if (!selectedSlackChannels?.length)
    return { message: 'Channel not selected' }

  for (const channel of selectedSlackChannels) {
    await postMessageInSlackChannel(
      slackAccessToken,
      channel.value,
      content
    )
  }

  return { message: 'Success' }
}
