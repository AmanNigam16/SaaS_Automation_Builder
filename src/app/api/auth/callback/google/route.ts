import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getCallbackUrl } from '@/lib/app-url'
import {
  createGoogleOauthClient,
  upsertGoogleDriveConnection,
} from '@/lib/google-drive'
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  verifyOauthState,
} from '@/lib/oauth-state'

const redirectToConnections = (
  req: NextRequest,
  result?: { key: 'google_connected' | 'google_error'; value: string }
) => {
  const redirectUrl = new URL('/connections', req.nextUrl.origin)
  if (result) redirectUrl.searchParams.set(result.key, result.value)

  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/api/auth/callback/google',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}

export async function GET(req: NextRequest) {
  const oauthError = req.nextUrl.searchParams.get('error')
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const expectedState = req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value

  const userId = verifyOauthState(
    expectedState,
    state,
    process.env.GOOGLE_CLIENT_SECRET
  )

  if (!userId) {
    return redirectToConnections(req, {
      key: 'google_error',
      value: 'invalid_state',
    })
  }

  if (oauthError) {
    return redirectToConnections(req, {
      key: 'google_error',
      value: 'authorization_denied',
    })
  }

  if (!code) {
    return redirectToConnections(req, {
      key: 'google_error',
      value: 'missing_code',
    })
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return redirectToConnections(req, {
      key: 'google_error',
      value: 'configuration',
    })
  }

  try {
    const oauth2Client = createGoogleOauthClient(
      getCallbackUrl('/api/auth/callback/google', req.nextUrl.origin)
    )

    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
      return redirectToConnections(req, {
        key: 'google_error',
        value: 'token_exchange',
      })
    }

    oauth2Client.setCredentials(tokens)

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    })
    const drive = google.drive({
      auth: oauth2Client,
      version: 'v3',
    })

    const [profile] = await Promise.all([
      oauth2.userinfo.get(),
      drive.about.get({ fields: 'user(permissionId)' }),
    ])

    await upsertGoogleDriveConnection({
      clerkUserId: userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      grantedScopes: tokens.scope?.split(' ').filter(Boolean) ?? [],
      googleAccountId: profile.data.id ?? null,
      accountEmail: profile.data.email ?? null,
      accountName: profile.data.name ?? null,
    })

    return redirectToConnections(req, {
      key: 'google_connected',
      value: 'true',
    })
  } catch {
    // OAuth errors can contain authorization codes or tokens; do not log them.
    console.error('Google OAuth callback failed')

    return redirectToConnections(req, {
      key: 'google_error',
      value: 'callback_failed',
    })
  }
}
