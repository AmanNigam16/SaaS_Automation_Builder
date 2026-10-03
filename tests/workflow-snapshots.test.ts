import assert from 'node:assert/strict'
import test from 'node:test'
import { getPublishedFlowPath, getRunFlowPath } from '../src/lib/workflow-snapshots.ts'

test('published triggers keep using the published snapshot while a draft changes', () => {
  assert.equal(
    getPublishedFlowPath({ flowPath: 'draft-v3', publishedFlowPath: 'published-v2' }),
    'published-v2'
  )
  assert.equal(
    getPublishedFlowPath({ flowPath: 'legacy-plan', publishedFlowPath: null }),
    'legacy-plan'
  )
})

test('run retries keep using the original execution snapshot', () => {
  assert.equal(
    getRunFlowPath({ executionPlan: { version: 1 }, flowPath: 'newer-draft' }),
    '{"version":1}'
  )
  assert.equal(
    getRunFlowPath({ executionPlan: null, flowPath: 'legacy-plan' }),
    'legacy-plan'
  )
})
