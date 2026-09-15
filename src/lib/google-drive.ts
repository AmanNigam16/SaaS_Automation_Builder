import { google } from 'googleapis'

const DEFAULT_GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar',
]

const getConfiguredScopes = () => {
  const configuredScopes = process.env.NEXT_PUBLIC_GOOGLE_SCOPES
    ?.split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean)

  return configuredScopes?.length
    ? Array.from(new Set([...DEFAULT_GOOGLE_SCOPES, ...configuredScopes]))
    : DEFAULT_GOOGLE_SCOPES
}

export const getGoogleDriveScopes = () => getConfiguredScopes()

export const createGoogleOauthClient = (redirectUri?: string) =>
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  )

const TOKEN_REFRESH_SKEW_MS = 60_000

const getGoogleDriveCredential = async (clerkUserId: string) => {
  const { db } = await import('@/lib/db')

  const dbUser = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { LocalGoogleCredential: true },
  })

  if (!dbUser?.LocalGoogleCredential) return null

  return dbUser.LocalGoogleCredential
}

export const getGoogleDriveConnection = async (
  clerkUserId: string
): Promise<{
  connected: boolean
  requiresReconnect: boolean
  accountEmail: string | null
  accountName: string | null
}> => {
  const credential = await getGoogleDriveCredential(clerkUserId)

  if (!credential) {
    return {
      connected: false,
      requiresReconnect: false,
      accountEmail: null,
      accountName: null,
    }
  }

  const accessTokenIsCurrent = Boolean(
    credential.expiryDate &&
      credential.expiryDate.getTime() > Date.now() + TOKEN_REFRESH_SKEW_MS
  )
  const canRefresh = Boolean(credential.refreshToken)

  return {
    connected: accessTokenIsCurrent || canRefresh,
    requiresReconnect: !accessTokenIsCurrent && !canRefresh,
    accountEmail: credential.accountEmail,
    accountName: credential.accountName,
  }
}

export const getGoogleDriveClient = async (clerkUserId: string) => {
  const credential = await getGoogleDriveCredential(clerkUserId)
  if (!credential) return null

  const oauth2Client = createGoogleOauthClient()
  oauth2Client.setCredentials({
    access_token: credential.accessToken,
    refresh_token: credential.refreshToken,
    expiry_date: credential.expiryDate?.getTime(),
    scope: credential.grantedScopes.join(' '),
  })

  const shouldRefresh =
    !credential.expiryDate ||
    credential.expiryDate.getTime() <= Date.now() + TOKEN_REFRESH_SKEW_MS

  if (!shouldRefresh) return oauth2Client
  if (!credential.refreshToken) return null

  const { credentials } = await oauth2Client.refreshAccessToken()
  if (!credentials.access_token) return null

  const { db } = await import('@/lib/db')
  await db.localGoogleCredential.update({
    where: { id: credential.id },
    data: {
      accessToken: credentials.access_token,
      ...(credentials.refresh_token
        ? { refreshToken: credentials.refresh_token }
        : {}),
      expiryDate: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : null,
      ...(credentials.scope
        ? { grantedScopes: credentials.scope.split(' ').filter(Boolean) }
        : {}),
    },
  })

  oauth2Client.setCredentials(credentials)
  return oauth2Client
}

export const getGoogleWorkspaceClient = async (
  clerkUserId: string,
  requiredScopes: string[] = []
) => {
  const credential = await getGoogleDriveCredential(clerkUserId)
  if (!credential) throw new Error('Google connection is missing')

  const missingScope = requiredScopes.find(
    (scope) => !credential.grantedScopes.includes(scope)
  )
  if (missingScope) {
    throw new Error('Reconnect Google to grant the permissions required by this action')
  }

  const client = await getGoogleDriveClient(clerkUserId)
  if (!client) throw new Error('Google connection requires reconnecting')
  return client
}

export const upsertGoogleDriveConnection = async ({
  clerkUserId,
  accessToken,
  refreshToken,
  expiryDate,
  grantedScopes,
  googleAccountId,
  accountEmail,
  accountName,
}: {
  clerkUserId: string
  accessToken: string
  refreshToken?: string | null
  expiryDate?: Date | null
  grantedScopes?: string[]
  googleAccountId?: string | null
  accountEmail?: string | null
  accountName?: string | null
}) => {
  const { db } = await import('@/lib/db')
  const dbUser = await db.user.upsert({
    where: { clerkId: clerkUserId },
    update: {
      ...(googleAccountId ? { localGoogleId: googleAccountId } : {}),
    },
    create: {
      clerkId: clerkUserId,
      email: `${clerkUserId}@placeholder.local`,
      name: 'User',
      profileImage: '',
      localGoogleId: googleAccountId ?? undefined,
    },
    select: { id: true },
  })

  await db.localGoogleCredential.upsert({
    where: { userId: dbUser.id },
    update: {
      accessToken,
      ...(refreshToken ? { refreshToken } : {}),
      expiryDate,
      grantedScopes: grantedScopes ?? [],
      accountEmail,
      accountName,
    },
    create: {
      userId: dbUser.id,
      accessToken,
      refreshToken,
      expiryDate,
      grantedScopes: grantedScopes ?? [],
      accountEmail,
      accountName,
    },
  })
}
