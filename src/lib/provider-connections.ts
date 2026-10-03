import { db } from '@/lib/db'
import { decryptSecret, encryptSecret } from '@/lib/credential-encryption'

const recordConnectionEvent = (
  userId: string,
  provider: string,
  action: string,
  accountLabel: string | null,
  outcome = 'SUCCEEDED'
) =>
  db.connectionAuditEvent.create({
    data: { userId, provider, action, accountLabel, outcome },
  })

const markConnectionHealthy = (
  userId: string,
  provider: string,
  grantedPermissions: string[] = []
) =>
  db.connections.upsert({
    where: { userId_type: { userId, type: provider } },
    update: {
      status: 'CONNECTED',
      grantedPermissions,
      lastCheckedAt: new Date(),
      lastErrorCode: null,
    },
    create: {
      userId,
      type: provider,
      status: 'CONNECTED',
      grantedPermissions,
      lastCheckedAt: new Date(),
    },
  })

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
        url: encryptSecret(connection.webhookUrl),
        guildId: connection.guildId,
        guildName: connection.guildName,
      },
    })
    await markConnectionHealthy(clerkUserId, 'Discord', [
      'webhook.incoming',
      'identify',
      'guilds',
    ])
    await recordConnectionEvent(
      clerkUserId,
      'Discord',
      'RECONNECTED',
      connection.guildName || connection.webhookName
    )
    return
  }

  await db.discordWebhook.create({
    data: {
      userId: clerkUserId,
      channelId: connection.channelId,
      webhookId: connection.webhookId,
      name: connection.webhookName,
      url: encryptSecret(connection.webhookUrl),
      guildId: connection.guildId,
      guildName: connection.guildName,
      connections: { create: { userId: clerkUserId, type: 'Discord' } },
    },
  })
  await markConnectionHealthy(clerkUserId, 'Discord', [
    'webhook.incoming',
    'identify',
    'guilds',
  ])
  await recordConnectionEvent(
    clerkUserId,
    'Discord',
    'CONNECTED',
    connection.guildName || connection.webhookName
  )
}

type NotionConnection = {
  accessToken: string
  workspaceId: string
  workspaceIcon: string
  workspaceName: string
  databaseId: string
  grantedPermissions?: string[]
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
    await db.notion.update({
      where: { id: existing.id },
      data: {
        accessToken: encryptSecret(connection.accessToken),
        workspaceId: connection.workspaceId,
        workspaceIcon: connection.workspaceIcon,
        workspaceName: connection.workspaceName,
        databaseId: connection.databaseId,
      },
    })
    await markConnectionHealthy(
      clerkUserId,
      'Notion',
      connection.grantedPermissions
    )
    await recordConnectionEvent(
      clerkUserId,
      'Notion',
      'RECONNECTED',
      connection.workspaceName
    )
    return
  }

  await db.notion.create({
    data: {
      userId: clerkUserId,
      accessToken: encryptSecret(connection.accessToken),
      workspaceId: connection.workspaceId,
      workspaceIcon: connection.workspaceIcon,
      workspaceName: connection.workspaceName,
      databaseId: connection.databaseId,
      connections: { create: { userId: clerkUserId, type: 'Notion' } },
    },
  })
  await markConnectionHealthy(
    clerkUserId,
    'Notion',
    connection.grantedPermissions
  )
  await recordConnectionEvent(
    clerkUserId,
    'Notion',
    'CONNECTED',
    connection.workspaceName
  )
}

type SlackConnection = {
  appId: string
  authedUserId: string
  authedUserToken: string | null
  slackAccessToken: string
  botUserId: string
  teamId: string
  teamName: string
  grantedPermissions?: string[]
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
    await db.slack.update({
      where: { id: existing.id },
      data: {
        appId: connection.appId,
        authedUserId: connection.authedUserId,
        authedUserToken: connection.authedUserToken
          ? encryptSecret(connection.authedUserToken)
          : null,
        slackAccessToken: encryptSecret(connection.slackAccessToken),
        botUserId: connection.botUserId,
        teamId: connection.teamId,
        teamName: connection.teamName,
      },
    })
    await markConnectionHealthy(
      clerkUserId,
      'Slack',
      connection.grantedPermissions
    )
    await recordConnectionEvent(
      clerkUserId,
      'Slack',
      'RECONNECTED',
      connection.teamName
    )
    return
  }

  await db.slack.create({
    data: {
      userId: clerkUserId,
      appId: connection.appId,
      authedUserId: connection.authedUserId,
      authedUserToken: connection.authedUserToken
        ? encryptSecret(connection.authedUserToken)
        : null,
      slackAccessToken: encryptSecret(connection.slackAccessToken),
      botUserId: connection.botUserId,
      teamId: connection.teamId,
      teamName: connection.teamName,
      connections: { create: { userId: clerkUserId, type: 'Slack' } },
    },
  })
  await markConnectionHealthy(
    clerkUserId,
    'Slack',
    connection.grantedPermissions
  )
  await recordConnectionEvent(
    clerkUserId,
    'Slack',
    'CONNECTED',
    connection.teamName
  )
}

export const auditConnectionEvent = recordConnectionEvent
export const updateConnectionHealth = async (
  userId: string,
  provider: string,
  healthy: boolean,
  errorCode?: string
) =>
  db.connections.updateMany({
    where: { userId, type: provider },
    data: {
      status: healthy ? 'CONNECTED' : 'RECONNECT_REQUIRED',
      lastCheckedAt: new Date(),
      lastErrorCode: healthy ? null : errorCode ?? 'PROVIDER_ERROR',
    },
  })

export const getDiscordWebhookSecret = async (clerkUserId: string) => {
  const connection = await db.discordWebhook.findFirst({
    where: { userId: clerkUserId },
    select: { url: true },
  })
  return decryptSecret(connection?.url)
}

export const getSlackAccessToken = async (clerkUserId: string) => {
  const connection = await db.slack.findFirst({
    where: { userId: clerkUserId },
    select: { slackAccessToken: true },
  })
  return decryptSecret(connection?.slackAccessToken)
}

export const getNotionAccessToken = async (clerkUserId: string) => {
  const connection = await db.notion.findFirst({
    where: { userId: clerkUserId },
    select: { accessToken: true },
  })
  return decryptSecret(connection?.accessToken)
}
