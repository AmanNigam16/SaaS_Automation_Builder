import { google } from 'googleapis'
import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { getGoogleDriveClient } from '@/lib/google-drive'

export async function GET() {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ message: 'User not found' })
  }

  const oauth2Client = await getGoogleDriveClient(userId)
  if (!oauth2Client) {
    return NextResponse.json(
      { message: 'Connect or reconnect Google Drive first' },
      { status: 400 }
    )
  }

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
