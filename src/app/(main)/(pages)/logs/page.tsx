import React from 'react'

const LogsPage = () => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sticky top-0 z-[10] flex items-center justify-between border-b bg-background/50 p-6 text-4xl backdrop-blur-lg">
        <span>Logs</span>
      </h1>
      <div className="p-6 text-muted-foreground">
        Workflow execution logs will appear here once log streaming is wired up.
      </div>
    </div>
  )
}

export default LogsPage
