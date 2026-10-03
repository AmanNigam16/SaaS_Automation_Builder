import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const PREFIX = 'enc:v1:'

const getKey = () => {
  const value = process.env.CREDENTIAL_ENCRYPTION_KEY?.trim()
  if (!value) throw new Error('Credential encryption is not configured')

  const key = /^[a-f0-9]{64}$/i.test(value)
    ? Buffer.from(value, 'hex')
    : Buffer.from(value, 'base64')
  if (key.length !== 32) {
    throw new Error('Credential encryption key must contain exactly 32 bytes')
  }
  return key
}
export const isEncryptedSecret = (value: string | null | undefined) =>
  Boolean(value?.startsWith(PREFIX))

export const encryptSecret = (value: string) => {
  if (!value || isEncryptedSecret(value)) return value
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`
}

export const decryptSecret = (value: string | null | undefined) => {
  if (!value || !isEncryptedSecret(value)) return value ?? null
  const [ivValue, tagValue, ciphertextValue] = value
    .slice(PREFIX.length)
    .split('.')
  if (!ivValue || !tagValue || !ciphertextValue) {
    throw new Error('Stored credential is malformed')
  }

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      getKey(),
      Buffer.from(ivValue, 'base64url')
    )
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    throw new Error('Stored credential could not be decrypted')
  }
}
