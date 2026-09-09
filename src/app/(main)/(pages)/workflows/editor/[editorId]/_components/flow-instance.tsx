'use client'
import { Button } from '@/components/ui/button'
import { useNodeConnections } from '@/providers/connections-provider'
import { usePathname } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'
import {
  onCreateNodesEdges,
  onFlowPublish,
} from '../_actions/workflow-connections'
import { toast } from 'sonner'

type Props = {
  children: React.ReactNode
  edges: any[]
  nodes: any[]
}

const FlowInstance = ({ children, edges, nodes }: Props) => {
  const pathname = usePathname()
  const [isFlow, setIsFlow] = useState([])
  const { nodeConnection } = useNodeConnections()

  const onFlowAutomation = useCallback(async () => {
    const flow = await onCreateNodesEdges(
      pathname.split('/').pop()!,
      JSON.stringify(nodes),
      JSON.stringify(edges),
      JSON.stringify(isFlow)
    )

    if (flow) toast.message(flow.message)
  }, [nodeConnection])

  const onPublishWorkflow = useCallback(async () => {
    const workflowId = pathname.split('/').pop()!
    const saved = await onCreateNodesEdges(
      workflowId,
      JSON.stringify(nodes),
      JSON.stringify(edges),
      JSON.stringify(isFlow)
    )
    if (saved.message !== 'flow saved') {
      toast.error(saved.message)
      return
    }

    const response = await onFlowPublish(workflowId, true)
    if (response) toast.message(response)
  }, [edges, isFlow, nodes, pathname])

  const onAutomateFlow = async () => {
    const flows: any = []
    const connectedEdges = edges.map((edge) => edge.target)
    connectedEdges.map((target) => {
      nodes.map((node) => {
        if (node.id === target) {
          flows.push(node.type)
        }
      })
    })

    setIsFlow(flows)
  }

  useEffect(() => {
    onAutomateFlow()
  }, [edges])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 p-4">
        <Button
          onClick={onFlowAutomation}
          disabled={isFlow.length < 1}
        >
          Save
        </Button>
        <Button
          disabled={isFlow.length < 1}
          onClick={onPublishWorkflow}
        >
          Publish
        </Button>
      </div>
      {children}
    </div>
  )
}

export default FlowInstance
