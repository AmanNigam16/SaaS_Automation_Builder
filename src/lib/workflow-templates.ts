import type { EditorCanvasCardType, EditorCanvasTypes, EditorNodeType } from '@/lib/types'
import type { WorkflowNodeConfig } from '@/lib/workflow-semantics'

type TemplateNode = { id: string; type: EditorCanvasTypes; metadata?: WorkflowNodeConfig }
type TemplateEdge = { source: string; target: string; sourceHandle?: 'true' | 'false' }

const descriptions: Record<EditorCanvasTypes, string> = {
  Email: 'Send or draft an email with Gmail.',
  Condition: 'Route or filter using typed conditions.',
  AI: 'Generate structured results with Gemini.',
  Slack: 'Send a message to a selected Slack channel.',
  'Google Drive': 'Start when a Drive file changes.',
  'Google Drive Action': 'Organize or inspect a Drive file.',
  Notion: 'Create an entry in a selected Notion database.',
  Discord: 'Post a message through the connected Discord webhook.',
  'Custom Webhook': 'Send or receive a signed HTTPS request.',
  'Google Calendar': 'Create or manage a Calendar event.',
  Trigger: 'Start manually or from a provider, schedule, or webhook.',
  Action: 'Configure a provider action.',
  Wait: 'Resume after a durable delay.',
  Formatter: 'Transform a preceding value.',
  Loop: 'Process a bounded list of items.',
}

const nodes = (items: TemplateNode[]) => JSON.stringify(items.map((item, index): EditorNodeType => ({
  id: item.id,
  type: item.type,
  position: { x: 120, y: 80 + index * 170 },
  data: {
    title: item.type,
    description: descriptions[item.type],
    completed: false,
    current: false,
    metadata: item.metadata ?? {},
    type: item.type,
  } satisfies EditorCanvasCardType,
})))

const edges = (items: TemplateEdge[]) => JSON.stringify(items.map((item, index) => ({
  id: `template-edge-${index + 1}`,
  source: item.source,
  target: item.target,
  ...(item.sourceHandle ? { sourceHandle: item.sourceHandle } : {}),
})))

export const WORKFLOW_TEMPLATES = [
  {
    id: 'resume-triage',
    name: 'Résumé triage and team alert',
    description: 'Drive upload → AI extraction → Notion candidate record → Discord alert.',
    setup: 'Select a Drive folder and Notion database, then confirm the Discord message.',
    nodes: nodes([
      { id: 'drive-trigger', type: 'Google Drive', metadata: { triggerChange: 'created_or_updated' } },
      { id: 'extract-resume', type: 'AI', metadata: { aiMode: 'extract', prompt: 'Extract candidate name, skills, experience, and contact details from {{trigger.fileName}}.', structuredOutput: true, model: 'gemini-2.5-flash' } },
      { id: 'candidate-record', type: 'Notion', metadata: { template: '{{steps.extract-resume.text}}' } },
      { id: 'team-alert', type: 'Discord', metadata: { template: 'New candidate processed: {{trigger.fileName}}' } },
    ]),
    edges: edges([
      { source: 'drive-trigger', target: 'extract-resume' },
      { source: 'extract-resume', target: 'candidate-record' },
      { source: 'candidate-record', target: 'team-alert' },
    ]),
  },
  {
    id: 'important-email-summary',
    name: 'Important email summary',
    description: 'Important Gmail message → AI summary → Slack notification.',
    setup: 'Choose the Gmail filter and Slack channel before publishing.',
    nodes: nodes([
      { id: 'gmail-trigger', type: 'Trigger', metadata: { triggerKind: 'gmail', gmailSubject: 'important' } },
      { id: 'summarize-email', type: 'AI', metadata: { aiMode: 'summarize', prompt: 'Summarize the important email and list any action items: {{trigger.subject}}', model: 'gemini-2.5-flash' } },
      { id: 'slack-alert', type: 'Slack', metadata: { template: '{{steps.summarize-email.text}}' } },
    ]),
    edges: edges([
      { source: 'gmail-trigger', target: 'summarize-email' },
      { source: 'summarize-email', target: 'slack-alert' },
    ]),
  },
  {
    id: 'lead-follow-up',
    name: 'Webhook lead follow-up',
    description: 'Signed inbound webhook → Gmail draft → Calendar follow-up.',
    setup: 'Set the recipient, email copy, and event times before publishing.',
    nodes: nodes([
      { id: 'lead-webhook', type: 'Trigger', metadata: { triggerKind: 'webhook', webhookRequireSignature: true } },
      { id: 'lead-email', type: 'Email', metadata: { operation: 'gmail_create_draft', to: '{{trigger.email}}', subject: 'Follow up with new lead', body: 'Lead payload: {{trigger.payload}}' } },
      { id: 'follow-up-event', type: 'Google Calendar', metadata: { operation: 'calendar_create', summary: 'Lead follow-up', start: '{{trigger.followUpStart}}', end: '{{trigger.followUpEnd}}' } },
    ]),
    edges: edges([
      { source: 'lead-webhook', target: 'lead-email' },
      { source: 'lead-email', target: 'follow-up-event' },
    ]),
  },
  {
    id: 'daily-digest',
    name: 'Scheduled daily digest',
    description: 'Daily schedule → AI digest → Slack notification.',
    setup: 'Confirm timezone, prompt, and Slack channel before publishing.',
    nodes: nodes([
      { id: 'daily-trigger', type: 'Trigger', metadata: { triggerKind: 'schedule', scheduleFrequency: 'day', scheduleHour: 9, scheduleMinute: 0, scheduleTimeZone: 'Asia/Kolkata' } },
      { id: 'build-digest', type: 'AI', metadata: { aiMode: 'generate', prompt: 'Create a concise daily operations digest from the trigger payload: {{trigger.data}}', model: 'gemini-2.5-flash' } },
      { id: 'digest-slack', type: 'Slack', metadata: { template: '{{steps.build-digest.text}}' } },
    ]),
    edges: edges([
      { source: 'daily-trigger', target: 'build-digest' },
      { source: 'build-digest', target: 'digest-slack' },
    ]),
  },
  {
    id: 'drive-file-routing',
    name: 'Drive file-type routing',
    description: 'Drive upload → file-type condition → copy PDFs or inspect other files.',
    setup: 'Select source and destination folders before publishing.',
    nodes: nodes([
      { id: 'file-trigger', type: 'Google Drive', metadata: { triggerChange: 'created_or_updated' } },
      { id: 'pdf-condition', type: 'Condition', metadata: { conditionMode: 'branch', combinator: 'and', conditions: [{ field: 'trigger.mimeType', operator: 'contains', value: 'pdf' }] } },
      { id: 'copy-pdf', type: 'Google Drive Action', metadata: { operation: 'drive_copy', fileId: '{{trigger.fileId}}', copyName: '{{trigger.fileName}}' } },
      { id: 'inspect-other', type: 'Google Drive Action', metadata: { operation: 'drive_metadata', fileId: '{{trigger.fileId}}' } },
    ]),
    edges: edges([
      { source: 'file-trigger', target: 'pdf-condition' },
      { source: 'pdf-condition', sourceHandle: 'true', target: 'copy-pdf' },
      { source: 'pdf-condition', sourceHandle: 'false', target: 'inspect-other' },
    ]),
  },
] as const

export const getWorkflowTemplate = (id: string) =>
  WORKFLOW_TEMPLATES.find((template) => template.id === id)
