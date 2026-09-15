import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyFormatter,
  evaluateCondition,
  getWaitUntil,
  resolveExpression,
  type WorkflowContext,
} from '../src/lib/workflow-semantics.ts'

const context: WorkflowContext = {
  trigger: {
    fileName: '  Resume.PDF  ',
    mimeType: 'application/pdf',
    score: 8,
    tags: ['resume', 'candidate'],
  },
  steps: {
    formatter: { result: 'Resume.PDF' },
  },
  loop: { item: 'candidate', index: 0, items: ['candidate'] },
}

test('resolves exact typed values and interpolated text', () => {
  assert.deepEqual(resolveExpression('{{trigger.tags}}', context), ['resume', 'candidate'])
  assert.equal(
    resolveExpression('New file: {{steps.formatter.result}}', context),
    'New file: Resume.PDF'
  )
})

test('evaluates AND/OR conditions with typed operators', () => {
  assert.equal(
    evaluateCondition(
      {
        combinator: 'and',
        conditions: [
          { field: 'trigger.mimeType', operator: 'contains', value: 'pdf' },
          { field: 'trigger.score', operator: 'greater_than', value: '5' },
        ],
      },
      context
    ),
    true
  )
  assert.equal(
    evaluateCondition(
      {
        combinator: 'or',
        conditions: [
          { field: 'trigger.missing', operator: 'exists' },
          { field: 'loop.item', operator: 'equals', value: 'candidate' },
        ],
      },
      context
    ),
    true
  )
})

test('formats text, numbers, dates, JSON, and lists', () => {
  assert.equal(applyFormatter({ formatterOperation: 'trim', input: '{{trigger.fileName}}' }, context), 'Resume.PDF')
  assert.equal(applyFormatter({ formatterOperation: 'number', input: '{{trigger.score}}', amount: 2 }, context), 10)
  assert.equal(applyFormatter({ formatterOperation: 'date', input: '2026-09-15T00:00:00Z', dateFormat: 'date' }, context), '2026-09-15')
  assert.equal(applyFormatter({ formatterOperation: 'list_join', input: '{{trigger.tags}}', separator: ' | ' }, context), 'resume | candidate')
  assert.deepEqual(applyFormatter({ formatterOperation: 'json_parse', input: '{"ok":true}' }, context), { ok: true })
  assert.throws(
    () => applyFormatter({ formatterOperation: 'number', input: 'not-a-number' }, context),
    /invalid number/
  )
})

test('calculates bounded duration waits', () => {
  const now = new Date('2026-09-15T00:00:00Z')
  assert.equal(
    getWaitUntil({ waitMode: 'duration', durationSeconds: 90 }, now).toISOString(),
    '2026-09-15T00:01:30.000Z'
  )
  assert.equal(
    getWaitUntil({ waitMode: 'duration', durationSeconds: 999999999 }, now).toISOString(),
    '2026-10-15T00:00:00.000Z'
  )
  assert.equal(
    getWaitUntil({ waitMode: 'until', until: '2026-09-16T12:00:00Z' }, now).toISOString(),
    '2026-09-16T12:00:00.000Z'
  )
})
