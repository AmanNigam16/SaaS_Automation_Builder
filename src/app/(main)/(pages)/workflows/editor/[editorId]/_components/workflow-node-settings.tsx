'use client'

import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useEditor } from '@/providers/editor-provider'
import { useFuzzieStore } from '@/store'
import {
  applyFormatter,
  evaluateCondition,
  getNodeOutputFields,
  getWaitUntil,
  resolveExpression,
  validateWorkflowNodeConfig,
  type ConditionOperator,
  type WorkflowContext,
  type WorkflowNodeConfig,
  type WorkflowPlanNode,
  type WorkflowValue,
} from '@/lib/workflow-semantics'

const CONFIGURABLE_TYPES = new Set([
  'Condition',
  'Formatter',
  'Wait',
  'Loop',
  'Discord',
  'Slack',
  'Notion',
  'Google Drive',
  'Email',
  'Google Calendar',
])

const conditionOperators: Array<{ value: ConditionOperator; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'exists', label: 'Exists' },
  { value: 'not_exists', label: 'Does not exist' },
  { value: 'is_true', label: 'Is true' },
  { value: 'is_false', label: 'Is false' },
]

const noValueOperators = new Set<ConditionOperator>([
  'exists',
  'not_exists',
  'is_true',
  'is_false',
])

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const FieldPicker = ({
  fields,
  onPick,
}: {
  fields: string[]
  onPick: (field: string) => void
}) => (
  <div className="space-y-2">
    <Label>Data from earlier steps</Label>
    <div className="flex flex-wrap gap-2">
      {fields.map((field) => (
        <Button
          key={field}
          type="button"
          size="sm"
          variant="outline"
          className="h-7 font-mono text-xs"
          onClick={() => onPick(`{{${field}}}`)}
        >
          {field}
        </Button>
      ))}
    </div>
  </div>
)

const WorkflowNodeSettings = () => {
  const { state, dispatch } = useEditor()
  const { googleFile, setGoogleFile } = useFuzzieStore()
  const selected = state.editor.selectedNode
  const config = selected.data.metadata ?? {}

  const availableFields = useMemo(() => {
    if (!selected.id) return []
    const nodeById = new Map(state.editor.elements.map((node) => [node.id, node]))
    const incoming = new Map<string, string[]>()
    for (const edge of state.editor.edges) {
      incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge.source])
    }
    const ancestors = new Set<string>()
    const visit = (id: string) => {
      for (const parent of incoming.get(id) ?? []) {
        if (ancestors.has(parent)) continue
        ancestors.add(parent)
        visit(parent)
      }
    }
    visit(selected.id)

    return Array.from(ancestors).flatMap((id) => {
      const node = nodeById.get(id)
      if (!node) return []
      const planNode: WorkflowPlanNode = {
        id: node.id,
        type: node.type,
        config: node.data.metadata ?? {},
      }
      return getNodeOutputFields(planNode).map((field) =>
        node.type === 'Google Drive'
          ? `trigger.${field}`
          : `steps.${node.id}.${field}`
      )
    })
  }, [selected.id, state.editor.edges, state.editor.elements])

  if (!selected.id || !CONFIGURABLE_TYPES.has(selected.type)) return null

  const update = (next: Partial<WorkflowNodeConfig>) => {
    dispatch({
      type: 'UPDATE_NODE',
      payload: {
        elements: state.editor.elements.map((node) =>
          node.id === selected.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  completed: true,
                  metadata: { ...node.data.metadata, ...next },
                },
              }
            : node
        ),
      },
    })
  }

  const sampleContext: WorkflowContext = {
    trigger: (googleFile ?? {}) as Record<string, WorkflowValue>,
    steps: {},
    loop: { item: 'Sample item', index: 0, items: ['Sample item'] },
  }

  const testNode = () => {
    try {
      if (selected.type === 'Condition') {
        toast.message(evaluateCondition(config, sampleContext) ? 'True path matched' : 'False path matched')
      } else if (selected.type === 'Formatter') {
        toast.message(`Result: ${String(applyFormatter(config, sampleContext))}`)
      } else if (selected.type === 'Wait') {
        toast.message(`Would resume ${getWaitUntil(config).toLocaleString()}`)
      } else if (selected.type === 'Loop') {
        const value = resolveExpression(config.items ?? '', sampleContext)
        toast.message(Array.isArray(value) ? `${Math.min(value.length, config.maxItems ?? 25)} item(s)` : 'Loop input is not a list')
      } else {
        const error = validateWorkflowNodeConfig({ id: selected.id, type: selected.type, config })
        if (error) throw new Error(error)
        toast.message('Template variables are valid and will resolve when the workflow runs')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Configuration is invalid')
    }
  }

  const fetchDriveSample = async () => {
    try {
      const response = await fetch('/api/drive', { cache: 'no-store' })
      const body = await response.json()
      const sample = body?.message?.files?.[0]
      if (!response.ok || !sample) throw new Error('No Drive sample is available')
      setGoogleFile({
        ...sample,
        fileId: sample.id ?? null,
        fileName: sample.name ?? null,
        modifiedTime: sample.modifiedTime ?? null,
        removed: false,
        resourceState: 'sample',
      })
      toast.success('Drive sample loaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not fetch a Drive sample')
    }
  }

  return (
    <div className="space-y-5 px-2 pb-4">
      {(selected.type === 'Discord' || selected.type === 'Slack' || selected.type === 'Notion') && (
        <div className="space-y-2">
          <Label>Dynamic template</Label>
          <Textarea
            value={config.template ?? ''}
            placeholder="Use fields from previous steps"
            onChange={(event) => update({ template: event.target.value })}
          />
          <FieldPicker
            fields={availableFields}
            onPick={(field) => update({ template: `${config.template ?? ''}${field}` })}
          />
        </div>
      )}

      {selected.type === 'Condition' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Behavior</Label>
              <select className={selectClassName} value={config.conditionMode ?? 'branch'} onChange={(event) => update({ conditionMode: event.target.value as 'branch' | 'filter' })}>
                <option value="branch">True / false paths</option>
                <option value="filter">Stop when false</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Match</Label>
              <select className={selectClassName} value={config.combinator ?? 'and'} onChange={(event) => update({ combinator: event.target.value as 'and' | 'or' })}>
                <option value="and">All rules</option>
                <option value="or">Any rule</option>
              </select>
            </div>
          </div>
          {(config.conditions ?? [{ field: '', operator: 'equals' as const, value: '' }]).map((condition, index) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <select
                className={selectClassName}
                value={condition.field}
                onChange={(event) => {
                  const conditions = [...(config.conditions ?? [{ field: '', operator: 'equals' as const, value: '' }])]
                  conditions[index] = { ...condition, field: event.target.value }
                  update({ conditions })
                }}
              >
                <option value="" disabled>Choose a field</option>
                {availableFields.map((field) => <option key={field} value={field}>{field}</option>)}
              </select>
              <select
                className={selectClassName}
                value={condition.operator}
                onChange={(event) => {
                  const conditions = [...(config.conditions ?? [])]
                  conditions[index] = { ...condition, operator: event.target.value as ConditionOperator }
                  update({ conditions })
                }}
              >
                {conditionOperators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
              </select>
              {!noValueOperators.has(condition.operator) && (
                <Input
                  value={condition.value ?? ''}
                  placeholder="Comparison value"
                  onChange={(event) => {
                    const conditions = [...(config.conditions ?? [])]
                    conditions[index] = { ...condition, value: event.target.value }
                    update({ conditions })
                  }}
                />
              )}
              {(config.conditions?.length ?? 0) > 1 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => update({ conditions: config.conditions?.filter((_, ruleIndex) => ruleIndex !== index) })}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remove rule
                </Button>
              )}
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => update({ conditions: [...(config.conditions ?? []), { field: '', operator: 'equals', value: '' }] })}>
            <Plus className="mr-2 h-4 w-4" /> Add rule
          </Button>
        </div>
      )}

      {selected.type === 'Formatter' && (
        <div className="space-y-3">
          <Label>Operation</Label>
          <select className={selectClassName} value={config.formatterOperation ?? ''} onChange={(event) => update({ formatterOperation: event.target.value as WorkflowNodeConfig['formatterOperation'] })}>
            <option value="" disabled>Choose transformation</option>
            <option value="uppercase">Text · uppercase</option>
            <option value="lowercase">Text · lowercase</option>
            <option value="trim">Text · trim</option>
            <option value="number">Number · add</option>
            <option value="date">Date · format</option>
            <option value="json_stringify">JSON · stringify</option>
            <option value="json_parse">JSON · parse</option>
            <option value="list_join">List · join</option>
          </select>
          <Input value={config.input ?? ''} placeholder="Input or {{field}}" onChange={(event) => update({ input: event.target.value })} />
          <FieldPicker fields={availableFields} onPick={(field) => update({ input: field })} />
          {config.formatterOperation === 'number' && <Input type="number" value={config.amount ?? 0} onChange={(event) => update({ amount: Number(event.target.value) })} />}
          {config.formatterOperation === 'list_join' && <Input value={config.separator ?? ', '} onChange={(event) => update({ separator: event.target.value })} placeholder="Separator" />}
          {config.formatterOperation === 'date' && (
            <select className={selectClassName} value={config.dateFormat ?? 'iso'} onChange={(event) => update({ dateFormat: event.target.value as 'iso' | 'date' | 'locale' })}>
              <option value="iso">ISO date/time</option><option value="date">Date only</option><option value="locale">Readable date/time</option>
            </select>
          )}
        </div>
      )}

      {selected.type === 'Wait' && (
        <div className="space-y-3">
          <select className={selectClassName} value={config.waitMode ?? 'duration'} onChange={(event) => update({ waitMode: event.target.value as 'duration' | 'until' })}>
            <option value="duration">Wait for duration</option><option value="until">Wait until time</option>
          </select>
          {config.waitMode === 'until' ? (
            <Input type="datetime-local" value={config.until ?? ''} onChange={(event) => update({ until: event.target.value })} />
          ) : (
            <div className="space-y-2"><Label>Seconds (maximum 30 days)</Label><Input type="number" min={1} max={2592000} value={config.durationSeconds ?? 60} onChange={(event) => update({ durationSeconds: Number(event.target.value) })} /></div>
          )}
        </div>
      )}

      {selected.type === 'Loop' && (
        <div className="space-y-3">
          <Input value={config.items ?? ''} placeholder="{{steps.nodeId.result}}" onChange={(event) => update({ items: event.target.value })} />
          <FieldPicker fields={availableFields} onPick={(field) => update({ items: field })} />
          <div className="space-y-2"><Label>Safety limit (1–100)</Label><Input type="number" min={1} max={100} value={config.maxItems ?? 25} onChange={(event) => update({ maxItems: Number(event.target.value) })} /></div>
        </div>
      )}

      {selected.type === 'Email' && (
        <div className="space-y-3">
          <div className="space-y-2"><Label>Action</Label><select className={selectClassName} value={config.operation ?? 'gmail_send'} onChange={(event) => update({ operation: event.target.value as WorkflowNodeConfig['operation'] })}><option value="gmail_send">Send email</option><option value="gmail_create_draft">Create draft</option></select></div>
          <Input value={config.to ?? ''} placeholder="To (email or {{field}})" onChange={(event) => update({ to: event.target.value })} />
          <Input value={config.cc ?? ''} placeholder="Cc (optional)" onChange={(event) => update({ cc: event.target.value })} />
          <Input value={config.bcc ?? ''} placeholder="Bcc (optional)" onChange={(event) => update({ bcc: event.target.value })} />
          <Input value={config.subject ?? ''} placeholder="Subject" onChange={(event) => update({ subject: event.target.value })} />
          <Textarea value={config.body ?? ''} placeholder="Message body" onChange={(event) => update({ body: event.target.value })} />
          <FieldPicker fields={availableFields} onPick={(field) => update({ body: `${config.body ?? ''}${field}` })} />
        </div>
      )}

      {selected.type === 'Google Calendar' && (
        <div className="space-y-3">
          <div className="space-y-2"><Label>Action</Label><select className={selectClassName} value={config.operation ?? 'calendar_create'} onChange={(event) => update({ operation: event.target.value as WorkflowNodeConfig['operation'] })}><option value="calendar_create">Create event</option><option value="calendar_update">Update event</option><option value="calendar_delete">Delete event</option></select></div>
          <Input value={config.calendarId ?? 'primary'} placeholder="Calendar ID" onChange={(event) => update({ calendarId: event.target.value })} />
          {(config.operation === 'calendar_update' || config.operation === 'calendar_delete') && <Input value={config.eventId ?? ''} placeholder="Event ID or {{field}}" onChange={(event) => update({ eventId: event.target.value })} />}
          {config.operation !== 'calendar_delete' && <>
            <Input value={config.summary ?? ''} placeholder="Event title" onChange={(event) => update({ summary: event.target.value })} />
            <Textarea value={config.description ?? ''} placeholder="Description (optional)" onChange={(event) => update({ description: event.target.value })} />
            <Input value={config.location ?? ''} placeholder="Location (optional)" onChange={(event) => update({ location: event.target.value })} />
            <Input value={config.start ?? ''} placeholder="Start: 2026-09-15T10:00:00+05:30" onChange={(event) => update({ start: event.target.value })} />
            <Input value={config.end ?? ''} placeholder="End: 2026-09-15T11:00:00+05:30" onChange={(event) => update({ end: event.target.value })} />
            <Input value={config.timeZone ?? 'UTC'} placeholder="Timezone, for example Asia/Kolkata" onChange={(event) => update({ timeZone: event.target.value })} />
            <Input value={config.attendees ?? ''} placeholder="Attendee emails, comma-separated" onChange={(event) => update({ attendees: event.target.value })} />
            <div className="space-y-2"><Label>Reminder (minutes)</Label><Input type="number" min={0} max={40320} value={config.reminderMinutes ?? ''} onChange={(event) => update({ reminderMinutes: event.target.value === '' ? undefined : Number(event.target.value) })} /></div>
            <select className={selectClassName} value={config.conflictPolicy ?? 'allow'} onChange={(event) => update({ conflictPolicy: event.target.value as 'allow' | 'stop' })}><option value="allow">Allow calendar conflicts</option><option value="stop">Stop when time is busy</option></select>
            <FieldPicker fields={availableFields} onPick={(field) => update({ description: `${config.description ?? ''}${field}` })} />
          </>}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={fetchDriveSample}>Fetch sample data</Button>
        <Button type="button" variant="secondary" onClick={testNode}>Test configuration</Button>
      </div>
    </div>
  )
}

export default WorkflowNodeSettings
