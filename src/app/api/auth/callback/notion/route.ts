import axios from 'axios'
import { Client } from '@notionhq/client'
import { NextRequest, NextResponse } from 'next/server'
import { getCallbackUrl } from '@/lib/app-url'
import { verifyOauthState } from '@/lib/oauth-state'
import { saveNotionConnection } from '@/lib/provider-connections'

const STATE_COOKIE = 'notion_oauth_state'

const redirectToConnections = (req: NextRequest, result: string) => {
  const response = NextResponse.redirect(
    new URL(`/connections?notion_${result}=true`, req.nextUrl.origin)
  )
  response.cookies.set(STATE_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/api/auth/callback/notion',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}

export async function GET(req: NextRequest) {
  const clientId = process.env.NOTION_CLIENT_ID
  const clientSecret = process.env.NOTION_API_SECRET
  const userId = verifyOauthState(
    req.cookies.get(STATE_COOKIE)?.value,
    req.nextUrl.searchParams.get('state'),
    clientSecret,
    Date.now(),
    'notion'
  )
  if (!userId || !clientId || !clientSecret || req.nextUrl.searchParams.get('error')) {
    return redirectToConnections(req, 'error')
  }
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return redirectToConnections(req, 'error')

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const { data } = await axios.post(
      'https://api.notion.com/v1/oauth/token',
      { grant_type: 'authorization_code', code, redirect_uri: getCallbackUrl('/api/auth/callback/notion', req.nextUrl.origin) },
      { headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basic}`, 'Notion-Version': '2022-06-28' }, timeout: 10_000 }
    )
    if (!data?.access_token || !data?.workspace_id) return redirectToConnections(req, 'error')
    const notion = new Client({ auth: data.access_token, timeoutMs: 10_000 })
    const search = await notion.search({
      filter: { value: 'database', property: 'object' },
      sort: { direction: 'ascending', timestamp: 'last_edited_time' },
    })
    await saveNotionConnection(userId, {
      accessToken: data.access_token,
      workspaceId: data.workspace_id,
      workspaceIcon: data.workspace_icon ?? '',
      workspaceName: data.workspace_name ?? '',
      databaseId: search.results[0]?.id ?? '',
    })
    return redirectToConnections(req, 'connected')
  } catch {
    console.error('Notion OAuth callback failed')
    return redirectToConnections(req, 'error')
  }
}
