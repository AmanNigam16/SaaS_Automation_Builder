import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
} from '../src/lib/credential-encryption.ts'

const originalKey = process.env.CREDENTIAL_ENCRYPTION_KEY

test.afterEach(() => {
  if (originalKey === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY
  else process.env.CREDENTIAL_ENCRYPTION_KEY = originalKey
})

test('encrypts credentials with authenticated encryption', () => {
  process.env.CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
  const encrypted = encryptSecret('provider-secret')
  assert.equal(isEncryptedSecret(encrypted), true)
  assert.notEqual(encrypted, 'provider-secret')
  assert.equal(decryptSecret(encrypted), 'provider-secret')
  assert.notEqual(encryptSecret('provider-secret'), encrypted)
})

test('supports legacy plaintext reads during migration', () => {
  delete process.env.CREDENTIAL_ENCRYPTION_KEY
  assert.equal(decryptSecret('legacy-token'), 'legacy-token')
})

test('rejects tampered ciphertext', () => {
  process.env.CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('hex')
  const encrypted = encryptSecret('provider-secret')
  const [prefix, version, iv, tag, ciphertext] = encrypted.split(':').flatMap((part, index) =>
    index === 2 ? part.split('.') : [part]
  )
  const altered = `${prefix}:${version}:${iv}.${tag}.${ciphertext.slice(0, -2)}AA`
  assert.throws(() => decryptSecret(altered), /could not be decrypted/)
})

test('requires a dedicated 32-byte key for new credentials', () => {
  delete process.env.CREDENTIAL_ENCRYPTION_KEY
  assert.throws(() => encryptSecret('provider-secret'), /not configured/)
  process.env.CREDENTIAL_ENCRYPTION_KEY = 'short'
  assert.throws(() => encryptSecret('provider-secret'), /exactly 32 bytes/)
})
