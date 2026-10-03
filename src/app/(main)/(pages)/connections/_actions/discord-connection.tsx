'use server'

import { auth, currentUser } from '@clerk/nextjs'
import { db } from '@/lib/db'
import { sendDiscordMessageForUser } from '@/lib/provider-actions'

export const getDiscordConnectionUrl = async () => {
  const user = await currentUser()
  if (!user) return null
  return db.discordWebhook.findFirst({ where: { userId: user.id }, select: { name: true, guildName: true } })
}

export const testDiscordMessage = async (content: string) => {
  const { userId } = auth()
  if (!userId) return { message: 'Unauthorized' }
  return sendDiscordMessageForUser(userId, content)
}
