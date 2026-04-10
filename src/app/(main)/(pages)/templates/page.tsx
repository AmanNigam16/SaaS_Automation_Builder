import React from 'react'

const TemplatesPage = () => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sticky top-0 z-[10] flex items-center justify-between border-b bg-background/50 p-6 text-4xl backdrop-blur-lg">
        <span>Templates</span>
      </h1>
      <div className="p-6 text-muted-foreground">
        Browse ready-made automation templates here soon.
      </div>
    </div>
  )
}

export default TemplatesPage
