export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import Link from 'next/link'
import { auth } from '@clerk/nextjs'
import { Activity, AlertTriangle, CheckCircle2, Clock3, Workflow } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/db'

const DashboardPage = async () => {
  const { userId } = auth()
  if (!userId) return null

  const [workflowCount, runCounts, successfulActions, recentFailures, unhealthyConnections] =
    await Promise.all([
      db.workflows.count({ where: { userId } }),
      db.workflowRun.groupBy({
        by: ['status'],
        where: { workflow: { userId } },
        _count: { _all: true },
      }),
      db.workflowStepRun.count({
        where: {
          status: 'SUCCEEDED',
          creditCharged: true,
          workflowRun: { workflow: { userId } },
        },
      }),
      db.workflowRun.findMany({
        where: { workflow: { userId }, status: 'FAILED' },
        select: { id: true, error: true, startedAt: true, workflow: { select: { name: true } } },
        orderBy: { startedAt: 'desc' },
        take: 5,
      }),
      db.connections.findMany({
        where: { userId, status: { not: 'CONNECTED' } },
        select: { type: true, status: true, lastErrorCode: true },
      }),
    ])

  const countFor = (status: string) =>
    runCounts.find((entry) => entry.status === status)?._count._all ?? 0
  const totalRuns = runCounts.reduce((total, entry) => total + entry._count._all, 0)
  const estimatedMinutesSaved = successfulActions * 2

  return (
    <div className="flex flex-col gap-4 relative">
      <h1 className="text-4xl sticky top-0 z-[10] p-6 bg-background/50 backdrop-blur-lg flex items-center border-b">
        Dashboard
      </h1>
      <main className="grid gap-4 p-6">
        {unhealthyConnections.length > 0 && (
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div><p className="font-medium">Connection attention required</p><p className="text-sm text-muted-foreground">{unhealthyConnections.map((connection) => connection.type).join(', ')} should be reconnected.</p></div>
              </div>
              <Button asChild size="sm" variant="outline"><Link href="/connections">Review connections</Link></Button>
            </CardContent>
          </Card>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Workflows', value: workflowCount, icon: Workflow },
            { label: 'Total runs', value: totalRuns, icon: Activity },
            { label: 'Successful runs', value: countFor('SUCCEEDED'), icon: CheckCircle2 },
            { label: 'Task usage', value: successfulActions, icon: CheckCircle2 },
            { label: 'Estimated time saved', value: `${estimatedMinutesSaved} min`, icon: Clock3 },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{label}</CardTitle><Icon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-2xl font-semibold">{value}</p>{label === 'Estimated time saved' && <p className="text-xs text-muted-foreground">Estimate: 2 minutes per completed action</p>}</CardContent></Card>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-lg">Run health</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-muted-foreground">Failed</p><p className="text-xl font-semibold text-red-500">{countFor('FAILED')}</p></div><div><p className="text-muted-foreground">Waiting</p><p className="text-xl font-semibold text-orange-500">{countFor('WAITING')}</p></div><div><p className="text-muted-foreground">Running</p><p className="text-xl font-semibold text-blue-500">{countFor('RUNNING')}</p></div><div><p className="text-muted-foreground">Cancelled</p><p className="text-xl font-semibold">{countFor('CANCELLED')}</p></div></CardContent></Card>
          <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-lg">Recent failures</CardTitle><Button asChild size="sm" variant="ghost"><Link href="/logs?status=FAILED">View logs</Link></Button></CardHeader><CardContent className="space-y-3">{recentFailures.length ? recentFailures.map((run) => <Link key={run.id} href={`/logs/${run.id}`} className="block rounded-md border p-3 transition-colors hover:bg-muted/50"><p className="text-sm font-medium">{run.workflow.name}</p><p className="truncate text-xs text-muted-foreground">{run.error ?? 'Workflow failed'}</p></Link>) : <p className="text-sm text-muted-foreground">No failed runs.</p>}</CardContent></Card>
        </div>
      </main>
    </div>
  )
}

export default DashboardPage
