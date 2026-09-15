export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { currentUser } from '@clerk/nextjs'
import {
  AlertTriangle,
  CircleCheck,
  CircleX,
  Clock3,
  LoaderCircle,
  PauseCircle,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import { RetryRunButton } from './_components/retry-run-button'

const statusDetails = {
  QUEUED: {
    label: 'Queued',
    icon: Clock3,
    className: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
  },
  RUNNING: {
    label: 'Running',
    icon: LoaderCircle,
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-500',
  },
  SUCCEEDED: {
    label: 'Succeeded',
    icon: CircleCheck,
    className: 'border-green-500/30 bg-green-500/10 text-green-500',
  },
  FAILED: {
    label: 'Failed',
    icon: CircleX,
    className: 'border-red-500/30 bg-red-500/10 text-red-500',
  },
  PAUSED: {
    label: 'Paused',
    icon: PauseCircle,
    className: 'border-orange-500/30 bg-orange-500/10 text-orange-500',
  },
  WAITING: {
    label: 'Waiting',
    icon: Clock3,
    className: 'border-orange-500/30 bg-orange-500/10 text-orange-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
  },
} as const

const unconfirmedDetails = {
  label: 'Needs review',
  icon: AlertTriangle,
  className: 'border-orange-500/30 bg-orange-500/10 text-orange-500',
}

const isStaleRunning = (status: string, startedAt: Date) =>
  status === 'RUNNING' && Date.now() - startedAt.getTime() > 15 * 60 * 1000

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)

const formatDuration = (startedAt: Date, finishedAt: Date | null) => {
  if (!finishedAt) return 'In progress'

  const duration = Math.max(0, finishedAt.getTime() - startedAt.getTime())
  if (duration < 1000) return `${duration} ms`
  return `${(duration / 1000).toFixed(1)} s`
}

const LogsPage = async () => {
  const user = await currentUser()
  if (!user) return null

  const runs = await db.workflowRun.findMany({
    where: { workflow: { userId: user.id } },
    include: {
      workflow: { select: { name: true } },
      steps: { orderBy: [{ stepIndex: 'asc' }, { attempt: 'asc' }] },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <div className="relative flex flex-col gap-4">
      <h1 className="sticky top-0 z-[10] flex items-center justify-between border-b bg-background/50 p-6 text-4xl backdrop-blur-lg">
        Logs
      </h1>

      <section className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-medium">Workflow runs</h2>
          <p className="text-sm text-muted-foreground">
            Review the latest trigger results and every action that ran.
          </p>
        </div>

        {runs.length ? (
          runs.map((run) => {
            const unconfirmed = isStaleRunning(run.status, run.startedAt)
            const details = unconfirmed ? unconfirmedDetails : statusDetails[run.status]
            const StatusIcon = details.icon

            return (
              <Card key={run.id}>
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {run.workflow.name}
                      </CardTitle>
                      <CardDescription>
                        {run.triggerType} · {formatDate(run.startedAt)} ·{' '}
                        {formatDuration(run.startedAt, run.finishedAt)}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('gap-1.5', details.className)}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {details.label}
                    </Badge>
                    {(run.status === 'QUEUED' || run.status === 'WAITING' || run.status === 'FAILED' || unconfirmed || run.status === 'PAUSED') && (
                      <RetryRunButton runId={run.id} />
                    )}
                  </div>
                  {run.error && (
                    <p className="text-sm text-red-500">{run.error}</p>
                  )}
                  {run.status === 'WAITING' && run.retryAt && (
                    <p className="text-sm text-muted-foreground">
                      A rate-limited action is scheduled to retry after{' '}
                      {formatDate(run.retryAt)}.
                    </p>
                  )}
                  {unconfirmed && (
                    <p className="text-sm text-muted-foreground">
                      This run may have been interrupted. An external action may
                      already have happened, so it will not replay automatically.
                    </p>
                  )}
                </CardHeader>

                <CardContent>
                  <div className="divide-y rounded-md border">
                    {run.steps.length ? (
                      run.steps.map((step) => {
                        const stepDetails = isStaleRunning(step.status, step.startedAt)
                          ? unconfirmedDetails
                          : statusDetails[step.status]
                        const StepIcon = stepDetails.icon

                        return (
                          <div
                            key={step.id}
                            className="flex flex-wrap items-center justify-between gap-3 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full border text-xs text-muted-foreground">
                                {step.stepIndex + 1}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {step.stepType}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Attempt {step.attempt} ·{' '}
                                  {formatDuration(
                                    step.startedAt,
                                    step.finishedAt
                                  )}
                                </p>
                              </div>
                            </div>
                            <span
                              className={cn(
                                'flex items-center gap-1.5 text-xs',
                                stepDetails.className
                              )}
                            >
                              <StepIcon className="h-3.5 w-3.5" />
                              {stepDetails.label}
                            </span>
                            {step.error && (
                              <p className="w-full pl-10 text-xs text-red-500">
                                {step.error}
                              </p>
                            )}
                            {step.retryable && (
                              <p className="w-full pl-10 text-xs text-muted-foreground">
                                This provider failure may be retried after review.
                              </p>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p className="p-3 text-sm text-muted-foreground">
                        No action steps were recorded.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="mt-28 flex items-center justify-center text-muted-foreground">
            No workflow runs yet
          </div>
        )}
      </section>
    </div>
  )
}

export default LogsPage
