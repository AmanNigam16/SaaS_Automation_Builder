export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import React from 'react'
import BillingDashboard from './_components/billing-dashboard'
import { getBillingPlan, isCompletedCheckout } from '@/lib/billing-plans'

type Props = {
  searchParams?: { [key: string]: string | undefined }
}

const Billing = async (props: Props) => {
  const { session_id } = props.searchParams ?? {}
  let checkoutMessage: string | null = null

  if (session_id) {
    const { auth } = await import('@clerk/nextjs')
    const { db } = await import('@/lib/db')
    const { userId } = auth()

    if (!userId || !process.env.STRIPE_SECRET) {
      checkoutMessage = 'We could not verify this checkout.'
    } else {
      try {
        const Stripe = (await import('stripe')).default
        const stripe = new Stripe(process.env.STRIPE_SECRET, {
          typescript: true,
          apiVersion: '2023-10-16',
        })
        const session = await stripe.checkout.sessions.retrieve(session_id, {
          expand: ['line_items.data.price'],
        })
        const price = session.line_items?.data[0]?.price
        const plan = getBillingPlan(typeof price === 'string' ? null : price?.nickname)
        if (
          session.client_reference_id !== userId ||
          session.metadata?.fuzzieUserId !== userId ||
          session.mode !== 'subscription' ||
          !isCompletedCheckout(session.status, session.payment_status) ||
          !plan
        ) {
          checkoutMessage = 'This checkout could not be verified for your account.'
        } else {
          const updated = await db.user.updateMany({
            where: {
              clerkId: userId,
              OR: [{ tier: null }, { tier: { not: plan.tier } }],
            },
            data: { tier: plan.tier, credits: plan.credits },
          })
          checkoutMessage = updated.count
            ? `${plan.tier} is now active.`
            : `${plan.tier} is already active.`
        }
      } catch {
        checkoutMessage = 'We could not verify this checkout. Your current plan was not changed.'
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sticky top-0 z-[10] flex items-center justify-between border-b bg-background/50 p-6 text-4xl backdrop-blur-lg">
        <span>Billing</span>
      </h1>
      <BillingDashboard checkoutMessage={checkoutMessage} />
    </div>
  )
}

export default Billing
