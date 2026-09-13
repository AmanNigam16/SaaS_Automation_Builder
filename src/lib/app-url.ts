type HeaderReader = {
  get(name: string): string | null
}

const FALLBACK_APP_URL = 'http://localhost:3000'

const removeTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const getAppUrl = (origin?: string | null) => {
  if (origin) return removeTrailingSlash(origin)

  if (process.env.NEXT_PUBLIC_URL) {
    return removeTrailingSlash(process.env.NEXT_PUBLIC_URL)
  }

  if (process.env.VERCEL_URL) {
    return `https://${removeTrailingSlash(process.env.VERCEL_URL)}`
  }

  return FALLBACK_APP_URL
}

export const getRequestOrigin = (headers?: HeaderReader | null) => {
  const host = headers?.get('x-forwarded-host') ?? headers?.get('host')
  if (!host) return undefined

  const proto =
    headers?.get('x-forwarded-proto') ??
    (host.includes('localhost') ? 'http' : 'https')

  return `${proto}://${host}`
}

export const getCallbackUrl = (path: string, origin?: string | null) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getAppUrl(origin)}${normalizedPath}`
}
