import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { google } from 'googleapis'
import { getCallbackUrl } from '@/lib/app-url'
import {
  createGoogleOauthClient,
  upsertGoogleDriveConnection,
} from '@/lib/google-drive'

export async function GET(req: NextRequest) {
  const { userId } = auth()

  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.nextUrl.origin))
  }

  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/connections', req.nextUrl.origin))
  }

  const oauth2Client = createGoogleOauthClient(
    getCallbackUrl('/api/auth/callback/google', req.nextUrl.origin)
  )

  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token) {
    return NextResponse.redirect(new URL('/connections', req.nextUrl.origin))
  }

  oauth2Client.setCredentials(tokens)

  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: 'v2',
  })

  const profile = await oauth2.userinfo.get()

  await upsertGoogleDriveConnection({
    clerkUserId: userId,
    accessToken: tokens.access_token,
    googleAccountId: profile.data.id ?? null,
  })

  const redirectUrl = new URL('/connections', req.nextUrl.origin)
  redirectUrl.searchParams.set('google_connected', 'true')

  return NextResponse.redirect(redirectUrl)
}
