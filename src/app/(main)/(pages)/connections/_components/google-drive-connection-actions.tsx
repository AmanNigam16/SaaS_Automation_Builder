'use client'

import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  disconnectGoogleDrive,
  testGoogleDriveConnection,
} from '../_actions/google-connection'

type Props = {
  connectHref: string
}

const GoogleDriveConnectionActions = ({ connectHref }: Props) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const testConnection = () =>
    startTransition(async () => {
      const result = await testGoogleDriveConnection()
      result.ok ? toast.success(result.message) : toast.error(result.message)
      router.refresh()
    })

  const disconnect = () => {
    if (!window.confirm('Disconnect Google Drive? Existing workflows using it will stop until you reconnect.')) return
    startTransition(async () => {
      const result = await disconnectGoogleDrive()
      result?.ok ? toast.success(result.message) : toast.error(result?.message)
      router.refresh()
    })
  }

  const refreshGoogleDriveListener = async () => {
    try {
      const response = await axios.post('/api/drive-activity?renew=true')
      toast.success(response.data?.message ?? 'Google Drive listener refreshed')
      router.refresh()
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          'Failed to refresh the Google Drive listener'
      )
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        type="button"
        variant="outline"
        disabled={pending}
        onClick={testConnection}
      >
        Test
      </Button>
      <Button
        size="sm"
        type="button"
        variant="outline"
        disabled={pending}
        onClick={refreshGoogleDriveListener}
      >
        Refresh listener
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={connectHref}>Reconnect</Link>
      </Button>
      <Button size="sm" type="button" variant="ghost" disabled={pending} onClick={disconnect}>
        Disconnect
      </Button>
    </div>
  )
}

export default GoogleDriveConnectionActions
