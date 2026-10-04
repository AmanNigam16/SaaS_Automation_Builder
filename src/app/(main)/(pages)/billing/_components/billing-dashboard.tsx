'use client'

import axios from 'axios'
import { useEffect, useState } from 'react'
import { useBilling } from '@/providers/billing-provider'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { SubscriptionCard } from './subscription-card'
import CreditTracker from './creadits-tracker'

type BillingProduct = {
  id: string
  nickname: string
  unitAmount: number | null
  currency: string
}

const BillingDashboard = ({ checkoutMessage }: { checkoutMessage: string | null }) => {
  const { credits, tier } = useBilling()
  const [stripeProducts, setStripeProducts] = useState<BillingProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data } = await axios.get<{ products: BillingProduct[]; available: boolean }>('/api/payment')
        setStripeProducts(data.products)
        setAvailable(data.available)
      } catch {
        setAvailable(false)
      } finally {
        setLoading(false)
      }
    }
    void loadProducts()
  }, [])

  const onPayment = async (priceId: string) => {
    try {
      const { data } = await axios.post<{ url: string }>('/api/payment', { priceId })
      window.location.assign(data.url)
    } catch {
      toast.error('Checkout is temporarily unavailable')
    }
  }

  return (
    <div className="space-y-4">
      {checkoutMessage && (
        <p className="px-6 pt-4 text-sm text-muted-foreground">{checkoutMessage}</p>
      )}
      {!loading && !available && (
        <Card className="mx-6 mt-6 border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Billing plans are temporarily unavailable. Your current plan and credits are unchanged.
          </CardContent>
        </Card>
      )}
      <div className="flex gap-5 p-6">
        <SubscriptionCard
          onPayment={onPayment}
          tier={tier}
          products={stripeProducts}
          loading={loading}
        />
      </div>
      <CreditTracker tier={tier} credits={credits} />
    </div>
  )
}

export default BillingDashboard
