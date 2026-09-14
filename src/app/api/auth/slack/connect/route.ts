import { auth } from '@clerk/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { getCallbackUrl } from '@/lib/app-url'
import { createOauthState, GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS } from '@/lib/oauth-state'

const STATE_COOKIE = 'slack_oauth_state'

export async function GET(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.redirect(new URL('/sign-in', req.nextUrl.origin))

  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/connections?slack_error=configuration', req.nextUrl.origin))
  }

  const { state, cookieValue } = createOauthState(userId, clientSecret, Date.now(), 'slack')
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'chat:write,channels:read,groups:read,mpim:read,im:read',
    redirect_uri: getCallbackUrl('/api/auth/callback/slack', req.nextUrl.origin),
    state,
  })
  const response = NextResponse.redirect(`https://slack.com/oauth/v2/authorize?${params}`)
  response.cookies.set(STATE_COOKIE, cookieValue, {
    httpOnly: true,
    maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
    path: '/api/auth/callback/slack',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
