'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createWorkflowFromTemplate } from './actions'

export const TemplateButton = ({ templateId }: { templateId: string }) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      disabled={isPending}
      onClick={() => startTransition(async () => {
        const result = await createWorkflowFromTemplate(templateId)
        toast.message(result.message)
        if (result.workflowId) router.push(`/workflows/editor/${result.workflowId}`)
      })}
    >
      <WandSparkles className="mr-2 h-4 w-4" />
      {isPending ? 'Creating…' : 'Use template'}
    </Button>
  )
}
