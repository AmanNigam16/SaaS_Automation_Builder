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
      <h1 className="sticky top-0 z-[10] flex flex-wrap items-center justify-between gap-3 border-b bg-background/50 p-6 text-3xl backdrop-blur-lg sm:text-4xl">
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
