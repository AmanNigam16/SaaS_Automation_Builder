'use server'

export const getFileMetaData = async () => {
  const { auth } = await import('@clerk/nextjs')
  const { google } = await import('googleapis')
  const { getGoogleDriveClient } = await import('@/lib/google-drive')

  const { userId } = auth()
  if (!userId) {
    return { message: 'User not found' }
  }

  const oauth2Client = await getGoogleDriveClient(userId)
  if (!oauth2Client) return { message: 'Reconnect Google Drive first' }

  const drive = google.drive({
    version: 'v3',
    auth: oauth2Client,
  })

  const response = await drive.files.list()
  return response.data
}

export const getGoogleDriveConnectionDetails = async () => {
  const { auth } = await import('@clerk/nextjs')
  const { getGoogleDriveConnection } = await import('@/lib/google-drive')
  const { userId } = auth()

  if (!userId) {
    return {
      connected: false,
      requiresReconnect: false,
      accountEmail: null,
      accountName: null,
      grantedScopes: [],
    }
  }

  return getGoogleDriveConnection(userId)
}

export const testGoogleDriveConnection = async () => {
  const { auth } = await import('@clerk/nextjs')
  const { google } = await import('googleapis')
  const { getGoogleDriveClient } = await import('@/lib/google-drive')
  const { auditConnectionEvent } = await import('@/lib/provider-connections')
  const { userId } = auth()
  if (!userId) return { ok: false, message: 'Unauthorized' }

  try {
    const oauth2Client = await getGoogleDriveClient(userId)
    if (!oauth2Client) throw new Error('Google Drive requires reconnecting')
    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    const response = await drive.about.get({
      fields: 'user(displayName,emailAddress)',
    })
    await auditConnectionEvent(
      userId,
      'Google Drive',
      'TESTED',
      response.data.user?.emailAddress ?? response.data.user?.displayName ?? null
    )
    return { ok: true, message: 'Google Drive connection is healthy' }
  } catch {
    await auditConnectionEvent(
      userId,
      'Google Drive',
      'TESTED',
      null,
      'FAILED'
    )
    return { ok: false, message: 'Google Drive requires reconnecting' }
  }
}

export const disconnectGoogleDrive = async () => {
  const { auth } = await import('@clerk/nextjs')
  const { revalidatePath } = await import('next/cache')
  const { db } = await import('@/lib/db')
  const { createGoogleOauthClient } = await import('@/lib/google-drive')
  const { decryptSecret } = await import('@/lib/credential-encryption')
  const { auditConnectionEvent } = await import('@/lib/provider-connections')

  const { userId } = auth()
  if (!userId) return { ok: false, message: 'Unauthorized' }

  const dbUser = await db.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      googleResourceId: true,
      LocalGoogleCredential: {
        select: {
          accessToken: true,
          refreshToken: true,
          channelId: true,
          subscribed: true,
        },
      },
    },
  })

  if (!dbUser) return { ok: true, message: 'Google Drive is disconnected' }

  const credential = dbUser.LocalGoogleCredential

  if (credential) {
    const accessToken = decryptSecret(credential.accessToken)
    const refreshToken = decryptSecret(credential.refreshToken)
    const oauth2Client = createGoogleOauthClient()
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (
      credential.subscribed &&
      credential.channelId &&
      dbUser.googleResourceId
    ) {
      try {
        const { google } = await import('googleapis')
        const drive = google.drive({ version: 'v3', auth: oauth2Client })
        await drive.channels.stop({
          requestBody: {
            id: credential.channelId,
            resourceId: dbUser.googleResourceId,
          },
        })
      } catch (error) {
        console.error('Failed to stop Google Drive notification channel', error)
      }
    }

    try {
      await oauth2Client.revokeToken(
        refreshToken ?? accessToken!
      )
    } catch (error) {
      console.error('Failed to revoke Google access token', error)
    }
  }

  await db.$transaction([
    db.localGoogleCredential.deleteMany({ where: { userId: dbUser.id } }),
    db.user.update({
      where: { id: dbUser.id },
      data: {
        googleResourceId: null,
        localGoogleId: null,
      },
    }),
  ])
  await auditConnectionEvent(userId, 'Google Drive', 'DISCONNECTED', null)

  revalidatePath('/connections')
  return { ok: true, message: 'Google Drive disconnected' }
}
