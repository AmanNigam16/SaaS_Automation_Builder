export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  // ✅ Import EVERYTHING at runtime
  const { google } = await import('googleapis')
  const { auth } = await import('@clerk/nextjs')
  const { db } = await import('@/lib/db')
  const {
    createGoogleOauthClient,
    getGoogleDriveAccessToken,
  } = await import('@/lib/google-drive')

  const oauth2Client = createGoogleOauthClient()
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ message: 'User not found' })
  }

  const accessToken = await getGoogleDriveAccessToken(userId)
  if (!accessToken) {
    return NextResponse.json(
      { message: 'Connect Google Drive first' },
      { status: 400 }
    )
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  const drive = google.drive({
    version: 'v3',
    auth: oauth2Client,
  })

  const channelId = uuidv4()

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
      type: 'web_hook',
      address: `${
        process.env.NGROK_URI || req.nextUrl.origin
      }/api/drive-activity/notification`,
      kind: 'api#channel',
    },
  })

  if (listener.status === 200) {
    await db.user.updateMany({
      where: { clerkId: userId },
      data: {
        googleResourceId: listener.data.resourceId,
      },
    })

    return new NextResponse('Listening to changes...')
  }

  return new NextResponse('Oops! something went wrong, try again', {
    status: 500,
  })
}
