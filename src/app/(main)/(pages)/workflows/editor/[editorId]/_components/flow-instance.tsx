'use client'

import React, { useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Edge } from 'reactflow'
import type { EditorNodeType } from '@/lib/types'
import {
  onCreateNodesEdges,
  onFlowPublish,
} from '../_actions/workflow-connections'

type Props = {
  children: React.ReactNode
  edges: Edge[]
  nodes: EditorNodeType[]
}

const FlowInstance = ({ children, edges, nodes }: Props) => {
  const pathname = usePathname()
  const canSave = nodes.length > 1 && edges.length > 0

  const onFlowAutomation = useCallback(async () => {
    const flow = await onCreateNodesEdges(
      pathname.split('/').pop()!,
      JSON.stringify(nodes),
      JSON.stringify(edges),
      '[]'
    )
    if (flow) toast.message(flow.message)
  }, [edges, nodes, pathname])

  const onPublishWorkflow = useCallback(async () => {
    const workflowId = pathname.split('/').pop()!
    const saved = await onCreateNodesEdges(
      workflowId,
      JSON.stringify(nodes),
      JSON.stringify(edges),
      '[]'
    )
    if (saved.message !== 'flow saved') {
      toast.error(saved.message)
      return
    }

    const response = await onFlowPublish(workflowId, true)
    if (response) toast.message(response)
  }, [edges, nodes, pathname])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 p-4">
        <Button onClick={onFlowAutomation} disabled={!canSave}>Save</Button>
        <Button disabled={!canSave} onClick={onPublishWorkflow}>Publish</Button>
      </div>
      {children}
    </div>
  )
}

export default FlowInstance
