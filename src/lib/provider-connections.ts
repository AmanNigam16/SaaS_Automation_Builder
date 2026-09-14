import { db } from '@/lib/db'

type DiscordConnection = {
  channelId: string
  webhookId: string
  webhookName: string
  webhookUrl: string
  guildId: string
  guildName: string
}

export const saveDiscordConnection = async (
  clerkUserId: string,
  connection: DiscordConnection
) => {
  const existing = await db.discordWebhook.findFirst({
    where: { userId: clerkUserId },
    select: { id: true },
  })

  if (existing) {
    await db.discordWebhook.update({
      where: { id: existing.id },
      data: {
        channelId: connection.channelId,
        webhookId: connection.webhookId,
        name: connection.webhookName,
        url: connection.webhookUrl,
        guildId: connection.guildId,
        guildName: connection.guildName,
      },
    })
    return
  }

  await db.discordWebhook.create({
    data: {
      userId: clerkUserId,
      channelId: connection.channelId,
      webhookId: connection.webhookId,
      name: connection.webhookName,
      url: connection.webhookUrl,
      guildId: connection.guildId,
      guildName: connection.guildName,
      connections: { create: { userId: clerkUserId, type: 'Discord' } },
    },
  })
}

type NotionConnection = {
  accessToken: string
  workspaceId: string
  workspaceIcon: string
  workspaceName: string
  databaseId: string
}

export const saveNotionConnection = async (
  clerkUserId: string,
  connection: NotionConnection
) => {
  const existing = await db.notion.findFirst({
    where: { userId: clerkUserId },
    select: { id: true },
  })

  if (existing) {
    await db.notion.update({ where: { id: existing.id }, data: connection })
    return
  }

  await db.notion.create({
    data: {
      userId: clerkUserId,
      ...connection,
      connections: { create: { userId: clerkUserId, type: 'Notion' } },
    },
  })
}

type SlackConnection = {
  appId: string
  authedUserId: string
  authedUserToken: string | null
  slackAccessToken: string
  botUserId: string
  teamId: string
  teamName: string
}

export const saveSlackConnection = async (
  clerkUserId: string,
  connection: SlackConnection
) => {
  const existing = await db.slack.findFirst({
    where: { userId: clerkUserId },
    select: { id: true },
  })

  if (existing) {
    await db.slack.update({ where: { id: existing.id }, data: connection })
    return
  }

  await db.slack.create({
    data: {
      userId: clerkUserId,
      ...connection,
      connections: { create: { userId: clerkUserId, type: 'Slack' } },
    },
  })
}
