import assert from 'node:assert/strict'
import test from 'node:test'
import { validateLinearWorkflowGraph } from '../src/lib/workflow-graph.ts'

const linearNodes = JSON.stringify([
  { id: 'trigger', type: 'Google Drive' },
  { id: 'slack', type: 'Slack' },
])

test('accepts a connected linear supported workflow', () => {
  const result = validateLinearWorkflowGraph(
    linearNodes,
    JSON.stringify([{ source: 'trigger', target: 'slack' }])
  )

  assert.equal(result.valid, true)
  if (result.valid) {
    assert.deepEqual(result.steps, ['Slack'])
    assert.equal(result.plan.triggerId, 'trigger')
  }
})

test('rejects incomplete actions and branching from ordinary actions', () => {
  const unsupported = validateLinearWorkflowGraph(
    JSON.stringify([
      { id: 'trigger', type: 'Google Drive' },
      { id: 'ai', type: 'AI' },
    ]),
    JSON.stringify([{ source: 'trigger', target: 'ai' }])
  )
  assert.deepEqual(unsupported, { valid: false, message: 'Add an AI prompt' })

  const branching = validateLinearWorkflowGraph(
    JSON.stringify([
      { id: 'trigger', type: 'Google Drive' },
      { id: 'slack', type: 'Slack' },
      { id: 'notion', type: 'Notion' },
    ]),
    JSON.stringify([
      { source: 'trigger', target: 'slack' },
      { source: 'trigger', target: 'notion' },
    ])
  )
  assert.deepEqual(branching, {
    valid: false,
    message: 'Only Condition nodes can create branches',
  })
})

test('compiles explicit true and false condition paths', () => {
  const result = validateLinearWorkflowGraph(
    JSON.stringify([
      { id: 'trigger', type: 'Google Drive', data: { metadata: {} } },
      {
        id: 'condition',
        type: 'Condition',
        data: {
          metadata: {
            conditionMode: 'branch',
            combinator: 'and',
            conditions: [{ field: 'trigger.mimeType', operator: 'contains', value: 'pdf' }],
          },
        },
      },
      { id: 'slack', type: 'Slack', data: { metadata: {} } },
      { id: 'notion', type: 'Notion', data: { metadata: {} } },
    ]),
    JSON.stringify([
      { id: 'a', source: 'trigger', target: 'condition' },
      { id: 'b', source: 'condition', sourceHandle: 'true', target: 'slack' },
      { id: 'c', source: 'condition', sourceHandle: 'false', target: 'notion' },
    ])
  )

  assert.equal(result.valid, true)
  if (result.valid) {
    assert.deepEqual(result.plan.edges.map((edge) => edge.branch), [undefined, 'true', 'false'])
  }
})

test('accepts configured Gmail and Calendar actions', () => {
  const result = validateLinearWorkflowGraph(
    JSON.stringify([
      { id: 'trigger', type: 'Google Drive', data: { metadata: {} } },
      { id: 'email', type: 'Email', data: { metadata: { operation: 'gmail_send', to: 'person@example.com', subject: 'Changed', body: '{{trigger.fileName}}' } } },
      { id: 'calendar', type: 'Google Calendar', data: { metadata: { operation: 'calendar_create', summary: 'Review', start: '2026-09-15T10:00:00Z', end: '2026-09-15T11:00:00Z' } } },
    ]),
    JSON.stringify([
      { source: 'trigger', target: 'email' },
      { source: 'email', target: 'calendar' },
    ])
  )

  assert.equal(result.valid, true)
  if (result.valid) assert.deepEqual(result.steps, ['Email', 'Google Calendar'])
})

test('rejects incomplete Gmail and Calendar actions', () => {
  const email = validateLinearWorkflowGraph(
    JSON.stringify([
      { id: 'trigger', type: 'Google Drive' },
      { id: 'email', type: 'Email', data: { metadata: { operation: 'gmail_send' } } },
    ]),
    JSON.stringify([{ source: 'trigger', target: 'email' }])
  )
  assert.equal(email.valid, false)
  if (!email.valid) assert.equal(email.message, 'Complete the email recipient, subject, and body')

  const calendar = validateLinearWorkflowGraph(
    JSON.stringify([
      { id: 'trigger', type: 'Google Drive' },
      { id: 'calendar', type: 'Google Calendar', data: { metadata: { operation: 'calendar_update' } } },
    ]),
    JSON.stringify([{ source: 'trigger', target: 'calendar' }])
  )
  assert.equal(calendar.valid, false)
  if (!calendar.valid) assert.equal(calendar.message, 'Event ID is required for this calendar operation')
})

test('accepts configured AI and outbound webhook actions', () => {
  const result = validateLinearWorkflowGraph(
    JSON.stringify([
      { id: 'trigger', type: 'Google Drive' },
      { id: 'ai', type: 'AI', data: { metadata: { aiMode: 'summarize', prompt: '{{trigger.fileName}}' } } },
      { id: 'hook', type: 'Custom Webhook', data: { metadata: { webhookMethod: 'POST', webhookUrl: 'https://example.com/hook', webhookHeaders: '{}', webhookQuery: '{}' } } },
    ]),
    JSON.stringify([
      { source: 'trigger', target: 'ai' },
      { source: 'ai', target: 'hook' },
    ])
  )
  assert.equal(result.valid, true)
  if (result.valid) assert.deepEqual(result.steps, ['AI', 'Custom Webhook'])
})

test('rejects unsafe or incomplete AI and webhook actions', () => {
  const ai = validateLinearWorkflowGraph(
    JSON.stringify([{ id: 'trigger', type: 'Google Drive' }, { id: 'ai', type: 'AI', data: { metadata: {} } }]),
    JSON.stringify([{ source: 'trigger', target: 'ai' }])
  )
  assert.equal(ai.valid, false)
  if (!ai.valid) assert.equal(ai.message, 'Add an AI prompt')

  const webhook = validateLinearWorkflowGraph(
    JSON.stringify([{ id: 'trigger', type: 'Google Drive' }, { id: 'hook', type: 'Custom Webhook', data: { metadata: { webhookUrl: 'http://localhost/hook' } } }]),
    JSON.stringify([{ source: 'trigger', target: 'hook' }])
  )
  assert.equal(webhook.valid, false)
  if (!webhook.valid) assert.equal(webhook.message, 'Webhook URL must use HTTPS')
})

test('accepts configured Google Drive actions without confusing them with the trigger', () => {
  const result = validateLinearWorkflowGraph(
    JSON.stringify([
      { id: 'trigger', type: 'Google Drive', data: { metadata: { triggerFolderId: 'folder-1' } } },
      { id: 'drive-action', type: 'Google Drive Action', data: { metadata: { operation: 'drive_copy', fileId: '{{trigger.fileId}}' } } },
    ]),
    JSON.stringify([{ source: 'trigger', target: 'drive-action' }])
  )
  assert.equal(result.valid, true)
  if (result.valid) assert.deepEqual(result.steps, ['Google Drive Action'])
})
