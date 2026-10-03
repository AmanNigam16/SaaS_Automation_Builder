'use server'

import type { Option } from '@/components/ui/multiple-selector'
import { auth, currentUser } from '@clerk/nextjs'
import { db } from '@/lib/db'
import { listSlackChannelsForUser, sendSlackMessageForUser } from '@/lib/provider-actions'

export const getSlackConnection = async () => {
  const user = await currentUser()
  if (!user) return null
  return db.slack.findFirst({
    where: { userId: user.id },
    select: { appId: true, authedUserId: true, botUserId: true, teamId: true, teamName: true },
  })
}

export const listBotChannels = async (): Promise<Option[]> => {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')
  return listSlackChannelsForUser(userId)
}

export const testSlackMessage = async (channels: Option[], content: string) => {
  const { userId } = auth()
  if (!userId) return { message: 'Unauthorized' }
  return sendSlackMessageForUser(userId, channels, content)
}
