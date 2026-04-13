import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { getCallbackUrl } from '@/lib/app-url'
import { getGoogleDriveScopes } from '@/lib/google-drive'

export async function GET(req: NextRequest) {
  const { userId } = auth()

  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.nextUrl.origin))
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: getCallbackUrl('/api/auth/callback/google', req.nextUrl.origin),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: getGoogleDriveScopes().join(' '),
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  )
}
