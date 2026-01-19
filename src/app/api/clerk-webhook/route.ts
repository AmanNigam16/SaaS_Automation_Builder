export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Webhook } from 'svix'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  // ✅ Build-safe guard
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ ok: true })
  }

  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new NextResponse('Missing svix headers', { status: 400 })
  }

  const payload = await req.text()
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: any
  try {
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
  } catch {
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
