export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || ''

  const headerPayload = headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new NextResponse('Missing svix headers', { status: 400 })
  }

  const payload = await req.text()

  // ⬇️ BUILD-SAFE: do NOT hard-fail if env is missing
  if (!WEBHOOK_SECRET) {
    console.warn('CLERK_WEBHOOK_SECRET is not set, skipping webhook')
    return new NextResponse('Webhook skipped', { status: 200 })
  }

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: any

  try {
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new NextResponse('Invalid webhook', { status: 400 })
  }

  const { id, email_addresses, first_name, image_url } = evt.data
  const email = email_addresses?.[0]?.email_address

  await db.user.upsert({
    where: { clerkId: id },
    update: {
      email,
      name: first_name,
      profileImage: image_url,
    },
    create: {
      clerkId: id,
      email,
      name: first_name || '',
      profileImage: image_url || '',
    },
  })

  return new NextResponse('Webhook handled', { status: 200 })
}
