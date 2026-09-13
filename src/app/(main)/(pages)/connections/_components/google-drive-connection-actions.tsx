'use client'

import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { disconnectGoogleDrive } from '../_actions/google-connection'

type Props = {
  connectHref: string
}

const GoogleDriveConnectionActions = ({ connectHref }: Props) => {
  const router = useRouter()

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
        onClick={refreshGoogleDriveListener}
      >
        Refresh listener
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={connectHref}>Reconnect</Link>
      </Button>
      <form action={disconnectGoogleDrive}>
        <Button size="sm" type="submit" variant="ghost">
          Disconnect
        </Button>
      </form>
    </div>
  )
}

export default GoogleDriveConnectionActions
