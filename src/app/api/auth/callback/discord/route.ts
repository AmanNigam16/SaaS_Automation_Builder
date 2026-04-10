import axios from 'axios'
import { NextResponse, NextRequest } from 'next/server'
import url from 'url'
import { getCallbackUrl } from '@/lib/app-url'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (code) {
    const data = new url.URLSearchParams()
    data.append('client_id', process.env.DISCORD_CLIENT_ID!)
    data.append('client_secret', process.env.DISCORD_CLIENT_SECRET!)
    data.append('grant_type', 'authorization_code')
    data.append(
      'redirect_uri',
      getCallbackUrl('/api/auth/callback/discord', req.nextUrl.origin)
    )
    data.append('code', code.toString())

    const output = await axios.post(
      'https://discord.com/api/oauth2/token',
      data,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    if (output.data) {
      const access = output.data.access_token
      const UserGuilds: any = await axios.get(
        `https://discord.com/api/users/@me/guilds`,
        {
          headers: {
            Authorization: `Bearer ${access}`,
          },
        }
      )

      const UserGuild = UserGuilds.data.filter(
        (guild: any) => guild.id == output.data.webhook.guild_id
      )

      const redirectUrl = new URL('/connections', req.nextUrl.origin)
      redirectUrl.searchParams.set('webhook_id', output.data.webhook.id)
      redirectUrl.searchParams.set('webhook_url', output.data.webhook.url)
      redirectUrl.searchParams.set('webhook_name', output.data.webhook.name)
      redirectUrl.searchParams.set('guild_id', output.data.webhook.guild_id)
      redirectUrl.searchParams.set('guild_name', UserGuild[0]?.name ?? '')
      redirectUrl.searchParams.set('channel_id', output.data.webhook.channel_id)

      return NextResponse.redirect(
        redirectUrl
      )
    }

    return NextResponse.redirect(new URL('/connections', req.nextUrl.origin))
  }

  return NextResponse.redirect(new URL('/connections', req.nextUrl.origin))
}
