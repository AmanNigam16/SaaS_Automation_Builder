type HeaderReader = {
  get(name: string): string | null
}

const FALLBACK_APP_URL = 'http://localhost:3000'

const removeTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const getAppUrl = (origin?: string | null) => {
  if (origin) return removeTrailingSlash(origin)

  if (process.env.NEXT_PUBLIC_URL) {
    return removeTrailingSlash(process.env.NEXT_PUBLIC_URL)
  }

  if (process.env.VERCEL_URL) {
    return `https://${removeTrailingSlash(process.env.VERCEL_URL)}`
  }

  return FALLBACK_APP_URL
}

export const getRequestOrigin = (headers?: HeaderReader | null) => {
  const host = headers?.get('x-forwarded-host') ?? headers?.get('host')
  if (!host) return undefined

  const proto =
    headers?.get('x-forwarded-proto') ??
    (host.includes('localhost') ? 'http' : 'https')

  return `${proto}://${host}`
}

export const getCallbackUrl = (path: string, origin?: string | null) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getAppUrl(origin)}${normalizedPath}`
}

export const getDiscordOauthUrl = (origin?: string | null) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID ?? '',
    response_type: 'code',
    redirect_uri: getCallbackUrl('/api/auth/callback/discord', origin),
    scope:
      'identify guilds connections guilds.members.read email webhook.incoming',
  })

  return `https://discord.com/oauth2/authorize?${params.toString()}`
}

export const getNotionOauthUrl = (origin?: string | null) => {
  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID ?? '',
    response_type: 'code',
    owner: 'user',
    redirect_uri: getCallbackUrl('/api/auth/callback/notion', origin),
  })

  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`
}

export const getSlackOauthUrl = (origin?: string | null) => {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID ?? '',
    scope: 'chat:write,channels:read,groups:read,mpim:read,im:read',
    user_scope: 'chat:write,channels:read,groups:read,mpim:read,im:read',
    redirect_uri: getCallbackUrl('/api/auth/callback/slack', origin),
  })

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`
}
