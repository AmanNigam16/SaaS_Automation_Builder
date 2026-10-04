export const BILLING_PLANS = {
  Free: { credits: '10' },
  Pro: { credits: '100' },
  Unlimited: { credits: 'Unlimited' },
} as const

export type BillingTier = keyof typeof BILLING_PLANS

export const getBillingPlan = (nickname: string | null | undefined) =>
  nickname && nickname in BILLING_PLANS
    ? { tier: nickname as BillingTier, ...BILLING_PLANS[nickname as BillingTier] }
    : null

export const isCompletedCheckout = (
  status: string | null,
  paymentStatus: string
) => status === 'complete' && ['paid', 'no_payment_required'].includes(paymentStatus)
