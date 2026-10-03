export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs'
import { ArrowLeft, Clock3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/lib/db'
import { CancelRunButton } from '../_components/cancel-run-button'
import { RetryRunButton } from '../_components/retry-run-button'

const formatDate = (date: Date | null) =>
  date
    ? new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(date)
    : '—'

const formatDuration = (startedAt: Date, finishedAt: Date | null) => {
  if (!finishedAt) return 'In progress'
  const duration = Math.max(0, finishedAt.getTime() - startedAt.getTime())
  return duration < 1000 ? `${duration} ms` : `${(duration / 1000).toFixed(1)} s`
}

const JsonBlock = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) {
    return <p className="text-sm text-muted-foreground">No data recorded</p>
  }

  return (
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-3 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

const RunDetailsPage = async ({ params }: { params: { runId: string } }) => {
  const { userId } = auth()
  if (!userId) return null

  const run = await db.workflowRun.findFirst({
    where: { id: params.runId, workflow: { userId } },
    include: {
      workflow: { select: { name: true } },
      steps: { orderBy: [{ stepIndex: 'asc' }, { attempt: 'asc' }] },
    },
  })
  if (!run) notFound()

  const canRetry = ['QUEUED', 'WAITING', 'FAILED', 'PAUSED'].includes(run.status)
  const canCancel = ['QUEUED', 'WAITING', 'PAUSED'].includes(run.status)

  return (
    <div className="relative flex flex-col gap-4">
      <header className="sticky top-0 z-[10] flex flex-wrap items-center justify-between gap-3 border-b bg-background/50 p-6 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link href="/logs" aria-label="Back to logs"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{run.workflow.name}</h1>
            <p className="text-sm text-muted-foreground">Run {run.id}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{run.status}</Badge>
          {canRetry && <RetryRunButton runId={run.id} resume={run.status === 'WAITING'} />}
          {canCancel && <CancelRunButton runId={run.id} />}
        </div>
      </header>

      <main className="grid gap-4 p-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Run summary</CardTitle></CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-muted-foreground">Trigger</p><p className="font-medium">{run.triggerType}</p></div>
            <div><p className="text-muted-foreground">Started</p><p className="font-medium">{formatDate(run.startedAt)}</p></div>
            <div><p className="text-muted-foreground">Finished</p><p className="font-medium">{formatDate(run.finishedAt)}</p></div>
            <div><p className="text-muted-foreground">Duration</p><p className="font-medium">{formatDuration(run.startedAt, run.finishedAt)}</p></div>
            {run.error && <p className="md:col-span-2 lg:col-span-4 text-red-500">{run.error}</p>}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-lg">Trigger input</CardTitle></CardHeader><CardContent><JsonBlock value={run.input} /></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-lg">Run output</CardTitle></CardHeader><CardContent><JsonBlock value={run.output} /></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Step timeline</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {run.steps.length ? run.steps.map((step) => (
              <article key={step.id} className="rounded-lg border p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border text-sm">{step.stepIndex + 1}</div>
                    <div>
                      <h2 className="font-medium">{step.stepType}</h2>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" /> Attempt {step.attempt} · {formatDuration(step.startedAt, step.finishedAt)}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{step.status}</Badge>
                </div>
                {step.error && <p className="mb-3 text-sm text-red-500">{step.error}</p>}
                <div className="grid gap-3 lg:grid-cols-2">
                  <div><p className="mb-1 text-xs font-medium text-muted-foreground">Input</p><JsonBlock value={step.input} /></div>
                  <div><p className="mb-1 text-xs font-medium text-muted-foreground">Output</p><JsonBlock value={step.output} /></div>
                </div>
              </article>
            )) : <p className="text-sm text-muted-foreground">No action steps were recorded.</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default RunDetailsPage
