export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createOrRenewDriveListener } from '@/lib/google-drive-listener'

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const local = ['localhost', '127.0.0.1'].includes(req.nextUrl.hostname)
  const webhookOrigin = local ? process.env.NGROK_URI || req.nextUrl.origin : req.nextUrl.origin
  try {
    const result = await createOrRenewDriveListener({
      clerkUserId: userId,
      webhookOrigin,
      force: req.nextUrl.searchParams.get('renew') === 'true',
      bypassSecret: process.env.VERCEL_ENV === 'preview' ? process.env.VERCEL_AUTOMATION_BYPASS_SECRET : undefined,
    })
    return NextResponse.json({ message: result.status === 'existing' ? 'Already listening to changes' : 'Listening to changes' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create the Drive listener'
    const status = message === 'User not found' ? 404 : message.includes('Connect') ? 400 : 502
    return NextResponse.json({ message }, { status })
  }
}
