'use server'

import { auth, currentUser } from '@clerk/nextjs'
import { db } from '@/lib/db'
import { createNotionPageForUser } from '@/lib/provider-actions'

export const getNotionConnection = async () => {
  const user = await currentUser()
  if (!user) return null
  return db.notion.findFirst({
    where: { userId: user.id },
    select: { databaseId: true, workspaceId: true, workspaceName: true, workspaceIcon: true },
  })
}

export const testNotionPage = async (databaseId: string, content: string) => {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')
  const connection = await db.notion.findFirst({ where: { userId, databaseId }, select: { id: true } })
  if (!connection) throw new Error('Notion database is not connected')
  return createNotionPageForUser(userId, databaseId, content)
}
