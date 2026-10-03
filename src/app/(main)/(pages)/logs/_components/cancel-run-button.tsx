'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cancelWorkflowRun } from '../../workflows/_actions/workflow-runs'

export const CancelRunButton = ({ runId }: { runId: string }) => {
  const router = useRouter()
  const [confirmed, setConfirmed] = useState(false)
  const [isPending, startTransition] = useTransition()

  const cancel = () => {
    if (!confirmed) {
      setConfirmed(true)
      toast.message('Click again to confirm cancellation.')
      return
    }

    startTransition(async () => {
      const response = await cancelWorkflowRun(runId)
      toast.message(response.message)
      router.refresh()
    })
  }

  return (
    <Button size="sm" variant="outline" onClick={cancel} disabled={isPending}>
      <Ban className="mr-1.5 h-3.5 w-3.5" />
      {isPending ? 'Cancelling…' : confirmed ? 'Confirm cancel' : 'Cancel'}
    </Button>
  )
}
