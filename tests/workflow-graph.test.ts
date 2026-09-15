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

test('rejects unsupported nodes and branching from ordinary actions', () => {
  const unsupported = validateLinearWorkflowGraph(
    JSON.stringify([
      { id: 'trigger', type: 'Google Drive' },
      { id: 'ai', type: 'AI' },
    ]),
    JSON.stringify([{ source: 'trigger', target: 'ai' }])
  )
  assert.deepEqual(unsupported, {
    valid: false,
    message: 'AI is not executable yet',
  })

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
