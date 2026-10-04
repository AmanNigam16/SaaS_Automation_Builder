import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardTitle } from '@/components/ui/card'

type Props = {
  credits: string
  tier: string
}

const CreditTracker = ({ credits, tier }: Props) => {
  const numericCredits = Number.parseInt(credits, 10)
  const safeCredits = Number.isFinite(numericCredits) ? numericCredits : 0
  return (
    <div className="p-6">
      <Card className="p-6">
        <CardContent className="flex flex-col gap-6">
          <CardTitle className="font-light">Credit Tracker</CardTitle>
          <Progress
            value={
              tier == 'Free'
                ? safeCredits * 10
                : tier == 'Unlimited'
                ? 100
                : safeCredits
            }
            className="w-full"
          />
          <div className="flex justify-end">
            <p>
              {tier === 'Unlimited'
                ? 'Unlimited'
                : `${safeCredits}/${tier == 'Free' ? 10 : tier == 'Pro' ? 100 : 0}`}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CreditTracker
