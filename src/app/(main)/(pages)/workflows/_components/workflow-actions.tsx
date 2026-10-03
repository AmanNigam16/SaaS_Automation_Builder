'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Copy, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { onDuplicateWorkflow } from '../_actions/workflow-connections'

export const WorkflowActions = ({ workflowId }: { workflowId: string }) => {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(async () => {
          const response = await onDuplicateWorkflow(workflowId)
          toast.message(response.message)
        })}
      >
        <Copy className="mr-1.5 h-3.5 w-3.5" />
        {isPending ? 'Duplicating…' : 'Duplicate'}
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={`/api/workflows/${workflowId}/export`}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export
        </Link>
      </Button>
    </div>
  )
}
