import { NextRequest, NextResponse } from 'next/server'
import { getCallbackUrl } from '@/lib/app-url'
import { verifyOauthState } from '@/lib/oauth-state'
import { saveSlackConnection } from '@/lib/provider-connections'

const STATE_COOKIE = 'slack_oauth_state'

const redirectToConnections = (req: NextRequest, result: string) => {
  const response = NextResponse.redirect(
    new URL(`/connections?slack_${result}=true`, req.nextUrl.origin)
  )
  response.cookies.set(STATE_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/api/auth/callback/slack',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}

export async function GET(req: NextRequest) {
  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  const userId = verifyOauthState(
    req.cookies.get(STATE_COOKIE)?.value,
    req.nextUrl.searchParams.get('state'),
    clientSecret,
    Date.now(),
    'slack'
  )
  if (!userId || !clientId || !clientSecret || req.nextUrl.searchParams.get('error')) {
    return redirectToConnections(req, 'error')
  }
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return redirectToConnections(req, 'error')

  try {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: getCallbackUrl('/api/auth/callback/slack', req.nextUrl.origin) }),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await response.json()
    if (!data?.ok || !data?.access_token || !data?.team?.id) return redirectToConnections(req, 'error')
    await saveSlackConnection(userId, {
      appId: data.app_id ?? '',
      authedUserId: data.authed_user?.id ?? '',
      authedUserToken: null,
      slackAccessToken: data.access_token,
      botUserId: data.bot_user_id ?? '',
      teamId: data.team.id,
      teamName: data.team.name ?? '',
    })
    return redirectToConnections(req, 'connected')
  } catch {
    console.error('Slack OAuth callback failed')
    return redirectToConnections(req, 'error')
  }
}
