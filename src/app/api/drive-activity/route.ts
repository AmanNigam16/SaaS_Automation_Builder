export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  // ✅ Import EVERYTHING at runtime
  const { google } = await import('googleapis')
  const { auth, clerkClient } = await import('@clerk/nextjs')
  const { db } = await import('@/lib/db')

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH2_REDIRECT_URI
  )

  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ message: 'User not found' })
  }

  const clerkResponse =
    await clerkClient.users.getUserOauthAccessToken(
      userId,
      'oauth_google'
    )

  const accessToken = clerkResponse?.[0]?.token
  if (!accessToken) {
    return NextResponse.json({ message: 'No Google access token found' })
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
      address: `${process.env.NGROK_URI}/api/drive-activity/notification`,
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
