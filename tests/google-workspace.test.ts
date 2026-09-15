import assert from 'node:assert/strict'
import test from 'node:test'
import { createRawEmail } from '../src/lib/google-email-message.ts'

const decodeRawEmail = (raw: string) => Buffer.from(raw, 'base64url').toString('utf8')

test('creates a Gmail-compatible text email without exposing body text in headers', () => {
  const message = decodeRawEmail(createRawEmail({
    to: 'recipient@example.com',
    cc: 'copy@example.com',
    subject: 'Workflow finished',
    body: 'Completed safely',
  }))

  assert.match(message, /^To: recipient@example\.com\r\nCc: copy@example\.com\r\n/)
  assert.match(message, /Subject: Workflow finished/)
  assert.match(message, /Content-Transfer-Encoding: base64/)
  assert.equal(Buffer.from(message.split('\r\n\r\n')[1], 'base64').toString('utf8'), 'Completed safely')
})

test('encodes unicode subjects and rejects email header injection', () => {
  const message = decodeRawEmail(createRawEmail({
    to: 'recipient@example.com',
    subject: 'Résumé ready',
    body: 'Done',
  }))
  assert.match(message, /Subject: =\?UTF-8\?B\?[^?]+\?=/)

  assert.throws(
    () => createRawEmail({ to: 'recipient@example.com\r\nBcc: attacker@example.com', subject: 'Hello', body: 'Safe' }),
    /cannot contain line breaks/
  )
})
