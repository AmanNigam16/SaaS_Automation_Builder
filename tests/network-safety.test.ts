import assert from 'node:assert/strict'
import test from 'node:test'
import { isPrivateAddress, validatePublicHttpsUrl } from '../src/lib/network-safety.ts'

test('blocks local and private webhook destinations', () => {
  for (const value of [
    'http://example.com/hook',
    'https://localhost/hook',
    'https://127.0.0.1/hook',
    'https://10.0.0.1/hook',
    'https://192.168.1.2/hook',
    'https://user:password@example.com/hook',
  ]) {
    assert.throws(() => validatePublicHttpsUrl(value))
  }
  assert.equal(isPrivateAddress('172.20.1.4'), true)
  assert.equal(isPrivateAddress('8.8.8.8'), false)
})

test('accepts a credential-free public HTTPS webhook URL', () => {
  assert.equal(validatePublicHttpsUrl('https://example.com/hook').hostname, 'example.com')
})
