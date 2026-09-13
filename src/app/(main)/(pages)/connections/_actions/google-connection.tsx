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
    }
  }

  return getGoogleDriveConnection(userId)
}

export const disconnectGoogleDrive = async () => {
  const { auth } = await import('@clerk/nextjs')
  const { revalidatePath } = await import('next/cache')
  const { db } = await import('@/lib/db')
  const { createGoogleOauthClient } = await import('@/lib/google-drive')

  const { userId } = auth()
  if (!userId) return

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

  if (!dbUser) return

  const credential = dbUser.LocalGoogleCredential

  if (credential) {
    const oauth2Client = createGoogleOauthClient()
    oauth2Client.setCredentials({
      access_token: credential.accessToken,
      refresh_token: credential.refreshToken,
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
        credential.refreshToken ?? credential.accessToken
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

  revalidatePath('/connections')
}
