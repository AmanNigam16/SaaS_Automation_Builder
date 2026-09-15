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
