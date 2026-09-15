import { useEditor } from '@/providers/editor-provider'
import React, { CSSProperties } from 'react'
import { Handle, HandleProps } from 'reactflow'

type Props = HandleProps & { style?: CSSProperties }

const CustomHandle = (props: Props) => {
  const { state } = useEditor()

  return (
    <Handle
      {...props}
      isValidConnection={(e) => {
        const sourceNode = state.editor.elements.find(
          (node) => node.id === e.source
        )
        const sourcesFromHandleInState = state.editor.edges.filter(
          (edge) =>
            edge.source === e.source &&
            (sourceNode?.type !== 'Condition' ||
              edge.sourceHandle === e.sourceHandle)
        ).length
        //target
        const targetFromHandleInState = state.editor.edges.filter(
          (edge) => edge.target === e.target
        ).length

        if (targetFromHandleInState === 1) return false
        if (sourceNode?.type === 'Condition') return sourcesFromHandleInState < 1
        if (sourcesFromHandleInState < 1) return true
        return false
      }}
      className="!-bottom-2 !h-4 !w-4 dark:bg-neutral-800"
    />
  )
}

export default CustomHandle
