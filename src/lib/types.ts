import { ConnectionProviderProps } from '@/providers/connections-provider'
import { z } from 'zod'

export const EditUserProfileSchema = z.object({
  email: z.string().email('Required'),
  name: z.string().min(1, 'Required'),
})

export const WorkflowFormSchema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
})

export type ConnectionTypes = 'Google Drive' | 'Notion' | 'Slack' | 'Discord'

export type Connection = {
  title: ConnectionTypes
  description: string
  image: string
  connectionKey: keyof ConnectionProviderProps
  accessTokenKey?: string
  alwaysTrue?: boolean
  slackSpecial?: boolean
}

export type EditorCanvasTypes =
  | 'Email'
  | 'Condition'
  | 'AI'
  | 'Slack'
  | 'Google Drive'
  | 'Google Drive Action'
  | 'Notion'
  | 'Discord'
  | 'Custom Webhook'
  | 'Google Calendar'
  | 'Trigger'
  | 'Action'
  | 'Wait'
  | 'Formatter'
  | 'Loop'

export type EditorCanvasCardType = {
  title: string
  description: string
  completed: boolean
  current: boolean
  metadata: import('./workflow-semantics').WorkflowNodeConfig
  type: EditorCanvasTypes
}

export type EditorNodeType = {
  id: string
  type: EditorCanvasCardType['type']
  position: {
    x: number
    y: number
  }
  data: EditorCanvasCardType
}

export type EditorNode = EditorNodeType

export type EditorActions =
  | {
      type: 'LOAD_DATA'
      payload: {
        elements: EditorNode[]
        edges: {
          id: string
          source: string
          target: string
          sourceHandle?: string | null
        }[]
      }
    }
  | {
      type: 'UPDATE_NODE'
      payload: {
        elements: EditorNode[]
      }
    }
  | { type: 'REDO' }
  | { type: 'UNDO' }
  | {
      type: 'SELECTED_ELEMENT'
      payload: {
        element: EditorNode
      }
    }

export const nodeMapper: Record<string, string> = {
  Notion: 'notionNode',
  Slack: 'slackNode',
  Discord: 'discordNode',
  'Google Drive': 'googleNode',
}
