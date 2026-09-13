'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { retryWorkflowRun } from '../../workflows/_actions/workflow-runs'

export const RetryRunButton = ({ runId }: { runId: string }) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState(false)

  const retry = () => {
    if (!confirmed) {
      setConfirmed(true)
      toast.message('Retry starts at the failed step; earlier successful steps are not repeated.')
      return
    }

    startTransition(async () => {
      const response = await retryWorkflowRun(runId)
      toast.message(response.message)
      router.refresh()
    })
  }

  return (
    <Button size="sm" variant="outline" onClick={retry} disabled={isPending}>
      <RotateCw className="mr-1.5 h-3.5 w-3.5" />
      {isPending ? 'Retrying…' : confirmed ? 'Confirm retry' : 'Retry'}
    </Button>
  )
}
