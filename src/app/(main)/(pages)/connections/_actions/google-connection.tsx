'use server'

export const getFileMetaData = async () => {
  const { auth } = await import('@clerk/nextjs')
  const clerk = (await import('@clerk/clerk-sdk-node')).default
  const { google } = await import('googleapis')

  const { userId } = auth()
  if (!userId) {
    return { message: 'User not found' }
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.OAUTH2_REDIRECT_URI
  )

  const clerkResponse = await clerk.users.getUserOauthAccessToken(
    userId,
    'oauth_google'
  )

  const accessToken = clerkResponse[0]?.token
  if (!accessToken) {
    return { message: 'No Google access token found' }
  }

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
