import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'
import { getCallbackUrl } from '@/lib/app-url'
import { verifyOauthState } from '@/lib/oauth-state'
import { saveDiscordConnection } from '@/lib/provider-connections'

const STATE_COOKIE = 'discord_oauth_state'

const redirectToConnections = (req: NextRequest, result: string) => {
  const response = NextResponse.redirect(
    new URL(`/connections?discord_${result}=true`, req.nextUrl.origin)
  )
  response.cookies.set(STATE_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/api/auth/callback/discord',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}

export async function GET(req: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  const userId = verifyOauthState(
    req.cookies.get(STATE_COOKIE)?.value,
    req.nextUrl.searchParams.get('state'),
    clientSecret,
    Date.now(),
    'discord'
  )

  if (!userId || !clientId || !clientSecret || req.nextUrl.searchParams.get('error')) {
    return redirectToConnections(req, 'error')
  }

  const code = req.nextUrl.searchParams.get('code')
  if (!code) return redirectToConnections(req, 'error')

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: getCallbackUrl('/api/auth/callback/discord', req.nextUrl.origin),
      code,
    })
    const { data } = await axios.post('https://discord.com/api/oauth2/token', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10_000,
    })
    const webhook = data?.webhook
    if (!data?.access_token || !webhook?.id || !webhook?.url || !webhook?.channel_id || !webhook?.guild_id) {
      return redirectToConnections(req, 'error')
    }
    const { data: guilds } = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${data.access_token}` },
      timeout: 10_000,
    })
    const guildName = Array.isArray(guilds)
      ? guilds.find((guild: { id?: string; name?: string }) => guild.id === webhook.guild_id)?.name ?? ''
      : ''

    await saveDiscordConnection(userId, {
      channelId: webhook.channel_id,
      webhookId: webhook.id,
      webhookName: webhook.name ?? 'Discord webhook',
      webhookUrl: webhook.url,
      guildId: webhook.guild_id,
      guildName,
    })
    return redirectToConnections(req, 'connected')
  } catch {
    console.error('Discord OAuth callback failed')
    return redirectToConnections(req, 'error')
  }
}
