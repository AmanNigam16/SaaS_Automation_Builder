export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse, NextRequest } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import Stripe from 'stripe'
import { getBillingPlan } from '@/lib/billing-plans'

const getStripe = () =>
  process.env.STRIPE_SECRET
    ? new Stripe(process.env.STRIPE_SECRET, {
        typescript: true,
        apiVersion: '2023-10-16',
      })
    : null

export async function GET() {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ products: [], available: false })

  try {
    const prices = await stripe.prices.list({ active: true, type: 'recurring', limit: 20 })
    const products = prices.data
      .filter((price) => getBillingPlan(price.nickname))
      .map((price) => ({
        id: price.id,
        nickname: price.nickname!,
        unitAmount: price.unit_amount,
        currency: price.currency,
      }))
    return NextResponse.json({ products, available: true })
  } catch {
    return NextResponse.json({ products: [], available: false })
  }
}

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ message: 'Billing is unavailable' }, { status: 503 })

  const data = (await req.json().catch(() => null)) as { priceId?: unknown } | null
  if (!data || typeof data.priceId !== 'string') {
    return NextResponse.json({ message: 'Choose a valid plan' }, { status: 400 })
  }

  const [price, user] = await Promise.all([
    stripe.prices.retrieve(data.priceId).catch(() => null),
    currentUser(),
  ])
  if (!price || !price.active || price.type !== 'recurring' || !getBillingPlan(price.nickname)) {
    return NextResponse.json({ message: 'Choose a supported active plan' }, { status: 400 })
  }

  const billingUrl = new URL('/billing', req.nextUrl.origin)
  const session = await stripe.checkout.sessions.create({
      line_items: [{ price: data.priceId, quantity: 1 }],
      mode: 'subscription',
      client_reference_id: userId,
      customer_email: user?.emailAddresses[0]?.emailAddress,
      metadata: { fuzzieUserId: userId },
      success_url: `${billingUrl.toString()}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: billingUrl.toString(),
    }).catch(() => null)
  if (!session?.url) {
    return NextResponse.json({ message: 'Checkout is unavailable' }, { status: 503 })
  }
  return NextResponse.json({ url: session.url })
}
