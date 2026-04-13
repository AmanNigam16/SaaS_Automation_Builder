import { google } from 'googleapis'

const DEFAULT_GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.activity.readonly',
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

export const getGoogleDriveAccessToken = async (clerkUserId: string) => {
  const { db } = await import('@/lib/db')
  const { clerkClient } = await import('@clerk/nextjs')

  const dbUser = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  })

  if (dbUser) {
    const localCredential = await db.localGoogleCredential.findUnique({
      where: { userId: dbUser.id },
      select: { accessToken: true },
    })

    if (localCredential?.accessToken) {
      return localCredential.accessToken
    }
  }

  try {
    const clerkResponse = await clerkClient.users.getUserOauthAccessToken(
      clerkUserId,
      'oauth_google'
    )

    return clerkResponse?.[0]?.token ?? null
  } catch {
    return null
  }
}

export const hasGoogleDriveConnection = async (clerkUserId: string) => {
  const token = await getGoogleDriveAccessToken(clerkUserId)
  return Boolean(token)
}

export const upsertGoogleDriveConnection = async ({
  clerkUserId,
  accessToken,
  googleAccountId,
}: {
  clerkUserId: string
  accessToken: string
  googleAccountId?: string | null
}) => {
  const { db } = await import('@/lib/db')
  const { currentUser } = await import('@clerk/nextjs')

  const authUser = await currentUser()
  const email = authUser?.emailAddresses?.[0]?.emailAddress

  const dbUser = await db.user.upsert({
    where: { clerkId: clerkUserId },
    update: {
      ...(googleAccountId ? { localGoogleId: googleAccountId } : {}),
      ...(email ? { email } : {}),
      ...(authUser?.firstName ? { name: authUser.firstName } : {}),
      ...(authUser?.imageUrl ? { profileImage: authUser.imageUrl } : {}),
    },
    create: {
      clerkId: clerkUserId,
      email: email ?? `${clerkUserId}@placeholder.local`,
      name: authUser?.firstName ?? 'User',
      profileImage: authUser?.imageUrl ?? '',
      localGoogleId: googleAccountId ?? undefined,
    },
    select: { id: true },
  })

  await db.localGoogleCredential.upsert({
    where: { userId: dbUser.id },
    update: {
      accessToken,
    },
    create: {
      userId: dbUser.id,
      accessToken,
    },
  })
}
