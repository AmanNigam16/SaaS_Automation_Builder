import { ConnectionTypes } from '@/lib/types'
import React from 'react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import GoogleDriveConnectionActions from './google-drive-connection-actions'

type Props = {
  type: ConnectionTypes
  icon: string
  title: ConnectionTypes
  description: string
  callback?: () => void
  connected: {} & any
  connectionLabel?: string
  requiresReconnect?: boolean
  origin?: string
}

const ConnectionCard = ({
  description,
  type,
  icon,
  title,
  connected,
  connectionLabel,
  requiresReconnect,
  origin,
}: Props) => {
  const connectHref =
    title === 'Google Drive'
      ? '/api/auth/google/connect'
      : title === 'Discord'
      ? '/api/auth/discord/connect'
      : title === 'Notion'
      ? '/api/auth/notion/connect'
      : title === 'Slack'
      ? '/api/auth/slack/connect'
      : '#'

  return (
    <Card className="flex w-full items-center justify-between">
      <CardHeader className="flex flex-col gap-4">
        <div className="flex flex-row gap-2">
          <Image
            src={icon}
            alt={title}
            height={30}
            width={30}
            className="object-contain"
          />
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <div className="flex flex-col items-center gap-2 p-4">
        {connected[type] ? (
          <>
            <div className="border-bg-primary rounded-lg border-2 px-3 py-2 font-bold text-white">
              Connected
            </div>
            {connectionLabel && (
              <p className="max-w-48 truncate text-xs text-muted-foreground">
                {connectionLabel}
              </p>
            )}
            {title === 'Google Drive' && (
              <GoogleDriveConnectionActions connectHref={connectHref} />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {requiresReconnect && (
              <p className="text-xs text-muted-foreground">
                Reconnect required
              </p>
            )}
            <Button asChild>
              <Link href={connectHref}>
                {requiresReconnect ? 'Reconnect' : 'Connect'}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

export default ConnectionCard
