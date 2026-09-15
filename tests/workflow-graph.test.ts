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

  assert.deepEqual(result, { valid: true, steps: ['Slack'] })
})

test('rejects unsupported nodes and branches', () => {
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
    message: 'Branching and merged paths are not executable yet',
  })
})
