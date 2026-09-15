import { isIP } from 'node:net'

export const isPrivateAddress = (address: string) => {
  const normalized = address.toLowerCase()
  if (normalized === '::1' || normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  if (isIP(normalized) !== 4) return false
  const parts = normalized.split('.').map(Number)
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0
  )
}

export const validatePublicHttpsUrl = (value: string) => {
  const url = new URL(value)
  if (url.protocol !== 'https:') throw new Error('Webhook URL must use HTTPS')
  if (url.username || url.password) throw new Error('Webhook URL cannot contain credentials')
  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || isPrivateAddress(hostname)) {
    throw new Error('Webhook URL must use a public host')
  }
  return url
}
