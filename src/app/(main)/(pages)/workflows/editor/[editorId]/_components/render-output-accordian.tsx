import { ConnectionProviderProps } from '@/providers/connections-provider'
import { EditorState } from '@/providers/editor-provider'
import { useFuzzieStore } from '@/store'
import React from 'react'
import ContentBasedOnTitle from './content-based-on-title'

type Props = {
  state: EditorState
  nodeConnection: ConnectionProviderProps
}

const RenderOutputAccordion = ({ state, nodeConnection }: Props) => {
  const {
    googleFile,
    selectedSlackChannels,
    setSelectedSlackChannels,
  } = useFuzzieStore()
  return (
    <ContentBasedOnTitle
      nodeConnection={nodeConnection}
      newState={state}
      file={googleFile}
      selectedSlackChannels={selectedSlackChannels}
      setSelectedSlackChannels={setSelectedSlackChannels}
    />
  )
}

export default RenderOutputAccordion
