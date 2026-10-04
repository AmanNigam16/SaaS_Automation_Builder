import React from 'react'
import Link from 'next/link'
import { WandSparkles } from 'lucide-react'
import Workflow from './workflow'
import { onGetWorkflows } from '../_actions/workflow-connections'
import MoreCredits from './more-creadits'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {}

const Workflows = async (props: Props) => {
  const workflows = await onGetWorkflows()
  return (
    <div className="relative flex flex-col gap-4">
      <section className="flex flex-col m-2">
        <MoreCredits />
        {workflows?.length ? (
          workflows.map((flow) => (
            <Workflow
              key={flow.id}
              {...flow}
            />
          ))
        ) : (
          <Card className="mx-auto mt-20 w-full max-w-xl border-dashed">
            <CardHeader className="text-center">
              <CardTitle>No workflows yet</CardTitle>
              <CardDescription>
                Start from a guided draft, review each step, then publish when the required connections are ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild variant="outline">
                <Link href="/templates">
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Browse templates
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}

export default Workflows
