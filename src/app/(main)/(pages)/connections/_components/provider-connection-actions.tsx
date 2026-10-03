'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  disconnectManagedConnection,
  testManagedConnection,
  type ManagedProvider,
} from '../_actions/provider-connection'

const hrefs: Record<ManagedProvider, string> = {
  Discord: '/api/auth/discord/connect',
  Notion: '/api/auth/notion/connect',
  Slack: '/api/auth/slack/connect',
}

const ProviderConnectionActions = ({ provider }: { provider: ManagedProvider }) => {
  const [pending, startTransition] = useTransition()

  const test = () =>
    startTransition(async () => {
      const result = await testManagedConnection(provider)
      result.ok ? toast.success(result.message) : toast.error(result.message)
    })

  const disconnect = () => {
    if (!window.confirm(`Disconnect ${provider}? Existing workflows using it will stop until you reconnect.`)) return
    startTransition(async () => {
      const result = await disconnectManagedConnection(provider)
      result.ok ? toast.success(result.message) : toast.error(result.message)
    })
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button variant="outline" size="sm" disabled={pending} onClick={test}>
        Test
      </Button>
      <Button asChild variant="outline" size="sm" disabled={pending}>
        <Link href={hrefs[provider]}>Reconnect</Link>
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={disconnect}>
        Disconnect
      </Button>
    </div>
  )
}

export default ProviderConnectionActions
