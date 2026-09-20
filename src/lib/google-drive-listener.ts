import { google } from 'googleapis'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'
import { getGoogleDriveClient } from '@/lib/google-drive'

export const createOrRenewDriveListener = async ({
  clerkUserId,
  webhookOrigin,
  bypassSecret,
  force = false,
}: {
  clerkUserId: string
  webhookOrigin: string
  bypassSecret?: string
  force?: boolean
}) => {
  const dbUser = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: {
      id: true,
      googleResourceId: true,
      LocalGoogleCredential: {
        select: { subscribed: true, channelId: true, channelExpiration: true },
      },
    },
  })
  if (!dbUser) throw new Error('User not found')
  const existing = Boolean(dbUser.googleResourceId && dbUser.LocalGoogleCredential?.subscribed)
  if (existing && !force) return { status: 'existing' as const }

  const oauth2Client = await getGoogleDriveClient(clerkUserId)
  if (!oauth2Client) throw new Error('Connect or reconnect Google Drive first')
  const drive = google.drive({ version: 'v3', auth: oauth2Client })
  if (existing && dbUser.LocalGoogleCredential?.channelId && dbUser.googleResourceId) {
    await drive.channels.stop({ requestBody: { id: dbUser.LocalGoogleCredential.channelId, resourceId: dbUser.googleResourceId } }).catch(() => undefined)
  }

  const channelId = uuidv4()
  const channelToken = uuidv4()
  const webhookUrl = new URL('/api/drive-activity/notification', webhookOrigin.replace(/\/+$/, ''))
  if (bypassSecret) webhookUrl.searchParams.set('x-vercel-protection-bypass', bypassSecret)
  const startPageToken = (await drive.changes.getStartPageToken({})).data.startPageToken
  if (!startPageToken) throw new Error('Failed to get the Drive start page token')
  const listener = await drive.changes.watch({
    pageToken: startPageToken,
    supportsAllDrives: true,
    requestBody: { id: channelId, token: channelToken, type: 'web_hook', address: webhookUrl.toString() },
  })
  if (listener.status !== 200 || !listener.data.resourceId) throw new Error('Could not create the Drive listener')
  const expiration = listener.data.expiration ? Number(listener.data.expiration) : Number.NaN
  await db.$transaction([
    db.user.update({ where: { id: dbUser.id }, data: { googleResourceId: listener.data.resourceId } }),
    db.localGoogleCredential.update({
      where: { userId: dbUser.id },
      data: {
        channelId,
        webhookToken: channelToken,
        pageToken: startPageToken,
        subscribed: true,
        channelExpiration: Number.isFinite(expiration) ? new Date(expiration) : null,
      },
    }),
  ])
  return { status: 'created' as const }
}
