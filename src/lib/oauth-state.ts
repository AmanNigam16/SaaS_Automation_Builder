import { randomUUID, timingSafeEqual } from 'crypto'

export const GOOGLE_OAUTH_STATE_COOKIE = 'google_oauth_state'
export const GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60

export const createOauthState = () => randomUUID()

export const isValidOauthState = (
  expectedState: string | undefined,
  receivedState: string | null
) => {
  if (!expectedState || !receivedState) return false

  const expected = Buffer.from(expectedState)
  const received = Buffer.from(receivedState)

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  )
}
