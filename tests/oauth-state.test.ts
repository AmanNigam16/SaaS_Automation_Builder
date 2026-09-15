import assert from 'node:assert/strict'
import test from 'node:test'
import { createOauthState, verifyOauthState } from '../src/lib/oauth-state.ts'

const secret = 'test-only-secret'
const userId = 'user_test_123'
const now = Date.UTC(2026, 0, 1)

test('accepts a signed, user-bound OAuth state before expiry', () => {
  const { state, cookieValue } = createOauthState(userId, secret, now)

  assert.equal(verifyOauthState(cookieValue, state, secret, now + 1), userId)
})

test('rejects altered, mismatched, and expired OAuth state', () => {
  const { state, cookieValue } = createOauthState(userId, secret, now)

  assert.equal(verifyOauthState(cookieValue, `${state}x`, secret, now + 1), null)
  assert.equal(
    verifyOauthState(`${cookieValue}x`, state, secret, now + 1),
    null
  )
  assert.equal(verifyOauthState(cookieValue, state, secret, now + 10 * 60_000), null)
})

test('does not accept state signed for another provider', () => {
  const { state, cookieValue } = createOauthState(userId, secret, now, 'discord')

  assert.equal(verifyOauthState(cookieValue, state, secret, now + 1, 'slack'), null)
})
