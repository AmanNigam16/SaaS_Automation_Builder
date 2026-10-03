export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import React from 'react'
import dynamicImport from 'next/dynamic'
import WorkflowButton from './_components/workflow-button'
import { WorkflowImport } from './_components/workflow-import'

const Workflows = dynamicImport(() => import('./_components'), {
  ssr: false,
})

type Props = {}

const Page = (_props: Props) => {
  return (
    <div className="flex flex-col relative">
      <h1 className="text-4xl sticky top-0 z-[10] p-6 bg-background/50 backdrop-blur-lg flex items-center border-b justify-between">
        Workflows
        <div className="flex items-center gap-2">
          <WorkflowImport />
          <WorkflowButton />
        </div>
      </h1>
      <Workflows />
    </div>
  )
}

export default Page
