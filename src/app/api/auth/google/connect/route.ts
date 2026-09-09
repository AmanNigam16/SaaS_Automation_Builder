import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { getCallbackUrl } from '@/lib/app-url'
import { getGoogleDriveScopes } from '@/lib/google-drive'
import {
  createOauthState,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
} from '@/lib/oauth-state'

export async function GET(req: NextRequest) {
  const { userId } = auth()

  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.nextUrl.origin))
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const redirectUrl = new URL('/connections', req.nextUrl.origin)
    redirectUrl.searchParams.set('google_error', 'configuration')
    return NextResponse.redirect(redirectUrl)
  }

  const state = createOauthState()

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: getCallbackUrl('/api/auth/callback/google', req.nextUrl.origin),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: getGoogleDriveScopes().join(' '),
    state,
  })

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  )

  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
    path: '/api/auth/callback/google',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}
