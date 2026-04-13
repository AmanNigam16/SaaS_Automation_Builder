'use server'

export const getFileMetaData = async () => {
  const { auth } = await import('@clerk/nextjs')
  const { google } = await import('googleapis')
  const {
    createGoogleOauthClient,
    getGoogleDriveAccessToken,
    hasGoogleDriveConnection,
  } = await import('@/lib/google-drive')

  const { userId } = auth()
  if (!userId) {
    return { message: 'User not found' }
  }

  const accessToken = await getGoogleDriveAccessToken(userId)
  if (!accessToken) {
    return { message: 'No Google access token found' }
  }

  const oauth2Client = createGoogleOauthClient()
  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  const drive = google.drive({
    version: 'v3',
    auth: oauth2Client,
  })

  const response = await drive.files.list()
  return response.data
}

export const isGoogleDriveConnected = async () => {
  const { auth } = await import('@clerk/nextjs')
  const { hasGoogleDriveConnection } = await import('@/lib/google-drive')
  const { userId } = auth()

  if (!userId) return false

  return hasGoogleDriveConnection(userId)
}
