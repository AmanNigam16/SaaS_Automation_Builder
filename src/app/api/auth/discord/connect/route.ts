import { auth } from '@clerk/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { getCallbackUrl } from '@/lib/app-url'
import { createOauthState, GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS } from '@/lib/oauth-state'

const STATE_COOKIE = 'discord_oauth_state'

export async function GET(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.redirect(new URL('/sign-in', req.nextUrl.origin))

  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/connections?discord_error=configuration', req.nextUrl.origin))
  }

  const { state, cookieValue } = createOauthState(userId, clientSecret, Date.now(), 'discord')
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: getCallbackUrl('/api/auth/callback/discord', req.nextUrl.origin),
    scope: 'identify guilds connections guilds.members.read email webhook.incoming',
    state,
  })
  const response = NextResponse.redirect(`https://discord.com/oauth2/authorize?${params}`)
  response.cookies.set(STATE_COOKIE, cookieValue, {
    httpOnly: true,
    maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
    path: '/api/auth/callback/discord',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
