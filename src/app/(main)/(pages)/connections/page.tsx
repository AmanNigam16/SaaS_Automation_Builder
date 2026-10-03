export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { CONNECTIONS } from '@/lib/constant'
import React from 'react'
import ConnectionCard from './_components/connection-card'
import { currentUser } from '@clerk/nextjs'
import { getGoogleDriveConnectionDetails } from './_actions/google-connection'
import { getManagedConnectionDetails } from './_actions/provider-connection'

const Connections = async () => {

  const user = await currentUser()
  if (!user) return null

  const onUserConnections = async () => {
    const [googleConnection, managedConnections] = await Promise.all([
      getGoogleDriveConnectionDetails(),
      getManagedConnectionDetails(user.id),
    ])

    return {
      connections: {
        Discord:
          managedConnections.Discord.connected &&
          !managedConnections.Discord.requiresReconnect,
        Notion:
          managedConnections.Notion.connected &&
          !managedConnections.Notion.requiresReconnect,
        Slack:
          managedConnections.Slack.connected &&
          !managedConnections.Slack.requiresReconnect,
        'Google Drive': googleConnection.connected,
      },
      googleConnection,
      managedConnections,
    }
  }

  const { connections, googleConnection, managedConnections } = await onUserConnections()

  return (
    <div className="relative flex flex-col gap-4">
      <h1 className="sticky top-0 z-[10] flex items-center justify-between border-b bg-background/50 p-6 text-4xl backdrop-blur-lg">
        Connections
      </h1>
      <div className="relative flex flex-col gap-4">
        <section className="flex flex-col gap-4 p-6 text-muted-foreground">
          Connect all your apps directly from here. You may need to connect
          these apps regularly to refresh verification
          {CONNECTIONS.map((connection) => (
            <ConnectionCard
              key={connection.title}
              description={connection.description}
              title={connection.title}
              icon={connection.image}
              type={connection.title}
              connected={connections}
              connectionLabel={
                connection.title === 'Google Drive'
                  ? googleConnection.accountEmail ??
                    googleConnection.accountName ??
                    undefined
                  : managedConnections[
                      connection.title as keyof typeof managedConnections
                    ]?.accountLabel ?? undefined
              }
              connectionDetail={
                connection.title === 'Google Drive'
                  ? googleConnection.grantedScopes.length
                    ? `${googleConnection.grantedScopes.length} permissions granted`
                    : undefined
                  : (() => {
                      const detail = managedConnections[
                        connection.title as keyof typeof managedConnections
                      ]
                      if (!detail) return undefined
                      return detail.grantedPermissions.length
                        ? `${detail.detail ?? 'Connected'} · ${detail.grantedPermissions.length} permissions`
                        : detail.detail ?? undefined
                    })()
              }
              requiresReconnect={
                connection.title === 'Google Drive'
                  ? googleConnection.requiresReconnect
                  : managedConnections[
                      connection.title as keyof typeof managedConnections
                    ]?.requiresReconnect ?? false
              }
            />
          ))}
        </section>
      </div>
    </div>
  )
}

export default Connections
