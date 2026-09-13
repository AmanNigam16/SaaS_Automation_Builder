import { createHmac, randomUUID, timingSafeEqual } from 'crypto'

export const GOOGLE_OAUTH_STATE_COOKIE = 'google_oauth_state'
export const GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60

type GoogleOauthState = {
  version: 1
  state: string
  clerkUserId: string
  expiresAt: number
}

const sign = (payload: string, secret: string, provider: string) => {
  const key = createHmac('sha256', secret)
    .update(`fuzzie/oauth-state/v1/${provider}`)
    .digest()
  return createHmac('sha256', key).update(payload).digest('base64url')
}

export const createOauthState = (
  clerkUserId: string,
  secret: string,
  now = Date.now(),
  provider = 'google'
) => {
  if (!clerkUserId || !secret) throw new Error('OAuth state configuration is missing')

  const state = randomUUID()
  const payload = Buffer.from(
    JSON.stringify({
      version: 1,
      state,
      clerkUserId,
      expiresAt: now + GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS * 1000,
    } satisfies GoogleOauthState)
  ).toString('base64url')

  return { state, cookieValue: `${payload}.${sign(payload, secret, provider)}` }
}

export const verifyOauthState = (
  cookieValue: string | undefined,
  receivedState: string | null,
  secret: string | undefined,
  now = Date.now(),
  provider = 'google'
): string | null => {
  if (!cookieValue || cookieValue.length > 2048 || !receivedState || !secret) {
    return null
  }

  const parts = cookieValue.split('.')
  if (parts.length !== 2) return null

  const [payload, signature] = parts
  const expected = Buffer.from(sign(payload, secret, provider))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as GoogleOauthState
    if (
      data.version !== 1 ||
      typeof data.state !== 'string' ||
      data.state !== receivedState ||
      typeof data.clerkUserId !== 'string' ||
      !data.clerkUserId ||
      typeof data.expiresAt !== 'number' ||
      data.expiresAt <= now ||
      data.expiresAt > now + GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS * 1000
    ) {
      return null
    }

    return data.clerkUserId
  } catch {
    return null
  }
}
