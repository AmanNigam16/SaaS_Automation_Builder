'use server'

import { auth } from '@clerk/nextjs'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import {
  auditConnectionEvent,
  getDiscordWebhookSecret,
  getNotionAccessToken,
  getSlackAccessToken,
  updateConnectionHealth,
} from '@/lib/provider-connections'

export type ManagedProvider = 'Discord' | 'Notion' | 'Slack'

export type ProviderConnectionDetail = {
  connected: boolean
  accountLabel: string | null
  detail: string | null
  requiresReconnect: boolean
  grantedPermissions: string[]
}
export const getManagedConnectionDetails = async (
  clerkUserId: string
): Promise<Record<ManagedProvider, ProviderConnectionDetail>> => {
  const [discord, notion, slack, markers] = await Promise.all([
    db.discordWebhook.findFirst({
      where: { userId: clerkUserId },
      select: { guildName: true, name: true },
    }),
    db.notion.findFirst({
      where: { userId: clerkUserId },
      select: { workspaceName: true, databaseId: true },
    }),
    db.slack.findFirst({
      where: { userId: clerkUserId },
      select: { teamName: true, botUserId: true },
    }),
    db.connections.findMany({
      where: {
        userId: clerkUserId,
        type: { in: ['Discord', 'Notion', 'Slack'] },
      },
      select: { type: true, status: true, grantedPermissions: true },
    }),
  ])
  const markerByProvider = new Map(markers.map((marker) => [marker.type, marker]))

  return {
    Discord: {
      connected: Boolean(discord),
      accountLabel: discord?.guildName || discord?.name || null,
      detail: discord?.name || null,
      requiresReconnect:
        markerByProvider.get('Discord')?.status === 'RECONNECT_REQUIRED',
      grantedPermissions:
        markerByProvider.get('Discord')?.grantedPermissions ?? [],
    },
    Notion: {
      connected: Boolean(notion),
      accountLabel: notion?.workspaceName || null,
      detail: notion?.databaseId ? 'Database selected' : 'Select a database',
      requiresReconnect:
        markerByProvider.get('Notion')?.status === 'RECONNECT_REQUIRED',
      grantedPermissions:
        markerByProvider.get('Notion')?.grantedPermissions ?? [],
    },
    Slack: {
      connected: Boolean(slack),
      accountLabel: slack?.teamName || null,
      detail: slack?.botUserId ? 'Bot connected' : null,
      requiresReconnect:
        markerByProvider.get('Slack')?.status === 'RECONNECT_REQUIRED',
      grantedPermissions:
        markerByProvider.get('Slack')?.grantedPermissions ?? [],
    },
  }
}

const requireUserId = () => {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')
  return userId
}

export const testManagedConnection = async (provider: ManagedProvider) => {
  const userId = requireUserId()
  let accountLabel: string | null = null

  try {
    if (provider === 'Discord') {
      const url = await getDiscordWebhookSecret(userId)
      if (!url) throw new Error('Discord is not connected')
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Discord connection requires reconnecting')
      const data = await response.json()
      accountLabel = data.guild_id ? `Server ${data.guild_id}` : data.name ?? null
    } else if (provider === 'Slack') {
      const token = await getSlackAccessToken(userId)
      if (!token) throw new Error('Slack is not connected')
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('Slack connection requires reconnecting')
      accountLabel = data.team ?? null
    } else {
      const token = await getNotionAccessToken(userId)
      if (!token) throw new Error('Notion is not connected')
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
        },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Notion connection requires reconnecting')
      const data = await response.json()
      accountLabel = data.name ?? null
    }

    await updateConnectionHealth(userId, provider, true)
    await auditConnectionEvent(userId, provider, 'TESTED', accountLabel)
    return { ok: true, message: `${provider} connection is healthy` }
  } catch (error) {
    await updateConnectionHealth(userId, provider, false, 'PROVIDER_AUTH_FAILED')
    await auditConnectionEvent(userId, provider, 'TESTED', accountLabel, 'FAILED')
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : `${provider} connection test failed`,
    }
  }
}

export const disconnectManagedConnection = async (provider: ManagedProvider) => {
  const userId = requireUserId()

  if (provider === 'Discord') {
    const url = await getDiscordWebhookSecret(userId)
    if (url) {
      await fetch(url, {
        method: 'DELETE',
        signal: AbortSignal.timeout(10_000),
      }).catch(() => undefined)
    }
    await db.$transaction([
      db.connections.deleteMany({ where: { userId, type: provider } }),
      db.discordWebhook.deleteMany({ where: { userId } }),
    ])
  } else if (provider === 'Slack') {
    const token = await getSlackAccessToken(userId)
    if (token) {
      await fetch('https://slack.com/api/auth.revoke', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      }).catch(() => undefined)
    }
    await db.$transaction([
      db.workflows.updateMany({
        where: { userId },
        data: { slackAccessToken: null, slackChannels: [] },
      }),
      db.connections.deleteMany({ where: { userId, type: provider } }),
      db.slack.deleteMany({ where: { userId } }),
    ])
  } else {
    await db.$transaction([
      db.workflows.updateMany({
        where: { userId },
        data: { notionAccessToken: null },
      }),
      db.connections.deleteMany({ where: { userId, type: provider } }),
      db.notion.deleteMany({ where: { userId } }),
    ])
  }

  await auditConnectionEvent(userId, provider, 'DISCONNECTED', null)
  revalidatePath('/connections')
  return { ok: true, message: `${provider} disconnected` }
}
