import { google } from 'googleapis'
import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import {
  createGoogleOauthClient,
  getGoogleDriveAccessToken,
} from '@/lib/google-drive'

export async function GET() {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ message: 'User not found' })
  }

  const accessToken = await getGoogleDriveAccessToken(userId)
  if (!accessToken) {
    return NextResponse.json(
      { message: 'Connect Google Drive first' },
      { status: 400 }
    )
  }

  const oauth2Client = createGoogleOauthClient()
  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  const drive = google.drive({
    version: 'v3',
    auth: oauth2Client,
  })
  
  try {
    const response = await drive.files.list()

    if (response) {
      return Response.json(
        {
          message: response.data,
        },
        {
          status: 200,
        }
      )
    } else {
      return Response.json(
        {
          message: 'No files found',
        },
        {
          status: 200,
        }
      )
    }
  } catch (error) {
    return Response.json(
      {
        message: 'Something went wrong',
      },
      {
        status: 500,
      }
    )
  }
}
