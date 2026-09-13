import { auth } from '@clerk/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { getCallbackUrl } from '@/lib/app-url'
import { createOauthState, GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS } from '@/lib/oauth-state'

const STATE_COOKIE = 'notion_oauth_state'

export async function GET(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.redirect(new URL('/sign-in', req.nextUrl.origin))

  const clientId = process.env.NOTION_CLIENT_ID
  const clientSecret = process.env.NOTION_API_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/connections?notion_error=configuration', req.nextUrl.origin))
  }

  const { state, cookieValue } = createOauthState(userId, clientSecret, Date.now(), 'notion')
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    owner: 'user',
    redirect_uri: getCallbackUrl('/api/auth/callback/notion', req.nextUrl.origin),
    state,
  })
  const response = NextResponse.redirect(`https://api.notion.com/v1/oauth/authorize?${params}`)
  response.cookies.set(STATE_COOKIE, cookieValue, {
    httpOnly: true,
    maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
    path: '/api/auth/callback/notion',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
