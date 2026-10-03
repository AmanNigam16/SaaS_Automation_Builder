'use client'

import { ChangeEvent, useRef, useTransition } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { onImportWorkflow } from '../_actions/workflow-connections'

export const WorkflowImport = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 1_000_000) {
      toast.error('Choose a workflow export smaller than 1 MB')
      return
    }

    startTransition(async () => {
      try {
        const response = await onImportWorkflow(await file.text())
        toast.message(response.message)
      } catch {
        toast.error('The workflow could not be imported')
      }
    })
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={importFile}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        {isPending ? 'Importing…' : 'Import'}
      </Button>
    </>
  )
}
