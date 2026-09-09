export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  // ✅ Import EVERYTHING at runtime
  const { google } = await import('googleapis')
  const { auth } = await import('@clerk/nextjs')
  const { db } = await import('@/lib/db')
  const { getGoogleDriveClient } = await import('@/lib/google-drive')

  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ message: 'User not found' })
  }

  const dbUser = await db.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      googleResourceId: true,
      LocalGoogleCredential: {
        select: { subscribed: true },
      },
    },
  })
  if (!dbUser) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 })
  }

  if (dbUser.googleResourceId && dbUser.LocalGoogleCredential?.subscribed) {
    return NextResponse.json({ message: 'Already listening to changes' })
  }

  const oauth2Client = await getGoogleDriveClient(userId)
  if (!oauth2Client) {
    return NextResponse.json(
      { message: 'Connect or reconnect Google Drive first' },
      { status: 400 }
    )
  }

  const drive = google.drive({
    version: 'v3',
    auth: oauth2Client,
  })

  const channelId = uuidv4()
  const channelToken = uuidv4()

  const startPageTokenRes = await drive.changes.getStartPageToken({})
  const startPageToken = startPageTokenRes.data.startPageToken

  if (!startPageToken) {
    return NextResponse.json(
      { message: 'Failed to get startPageToken' },
      { status: 500 }
    )
  }

  const listener = await drive.changes.watch({
    pageToken: startPageToken,
    supportsAllDrives: true,
    supportsTeamDrives: true,
    requestBody: {
      id: channelId,
      token: channelToken,
      type: 'web_hook',
      address: `${
        process.env.NGROK_URI || req.nextUrl.origin
      }/api/drive-activity/notification`,
      kind: 'api#channel',
    },
  })

  if (listener.status === 200) {
    await db.$transaction([
      db.user.update({
        where: { id: dbUser.id },
        data: {
          googleResourceId: listener.data.resourceId,
        },
      }),
      db.localGoogleCredential.update({
        where: { userId: dbUser.id },
        data: {
          channelId,
          webhookToken: channelToken,
          pageToken: startPageToken,
          subscribed: true,
        },
      }),
    ])

    return new NextResponse('Listening to changes...')
  }

  return new NextResponse('Oops! something went wrong, try again', {
    status: 500,
  })
}
