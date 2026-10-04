import assert from 'node:assert/strict'
import test from 'node:test'
import { validateLinearWorkflowGraph } from '../src/lib/workflow-graph.ts'
import { WORKFLOW_TEMPLATES } from '../src/lib/workflow-templates.ts'

test('guided templates contain publishable graphs made from executable nodes', () => {
  assert.equal(WORKFLOW_TEMPLATES.length, 5)
  for (const template of WORKFLOW_TEMPLATES) {
    const result = validateLinearWorkflowGraph(template.nodes, template.edges)
    assert.equal(result.valid, true, `${template.id}: ${result.valid ? '' : result.message}`)
  }
})
