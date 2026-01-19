'use server'

export const onDiscordConnect = async (
  channel_id: string,
  webhook_id: string,
  webhook_name: string,
  webhook_url: string,
  id: string,
  guild_name: string,
  guild_id: string
) => {
  if (!webhook_id) return

  const { db } = await import('@/lib/db')

  const webhook = await db.discordWebhook.findFirst({
    where: { userId: id },
    include: { connections: { select: { type: true } } },
  })

  if (!webhook) {
    await db.discordWebhook.create({
      data: {
        userId: id,
        webhookId: webhook_id,
        channelId: channel_id,
        guildId: guild_id,
        name: webhook_name,
        url: webhook_url,
        guildName: guild_name,
        connections: {
          create: { userId: id, type: 'Discord' },
        },
      },
    })
    return
  }

  const webhook_channel = await db.discordWebhook.findUnique({
    where: { channelId: channel_id },
    include: { connections: { select: { type: true } } },
  })

  if (!webhook_channel) {
    await db.discordWebhook.create({
      data: {
        userId: id,
        webhookId: webhook_id,
        channelId: channel_id,
        guildId: guild_id,
        name: webhook_name,
        url: webhook_url,
        guildName: guild_name,
        connections: {
          create: { userId: id, type: 'Discord' },
        },
      },
    })
  }
}

export const getDiscordConnectionUrl = async () => {
  const { currentUser } = await import('@clerk/nextjs')
  const { db } = await import('@/lib/db')

  const user = await currentUser()
  if (!user) return null

  return db.discordWebhook.findFirst({
    where: { userId: user.id },
    select: {
      url: true,
      name: true,
      guildName: true,
    },
  })
}

export const postContentToWebHook = async (content: string, url: string) => {
  if (!content) return { message: 'String empty' }

  const axios = (await import('axios')).default
  await axios.post(url, { content })

  return { message: 'success' }
}
