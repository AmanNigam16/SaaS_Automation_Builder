export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { CONNECTIONS } from '@/lib/constant'
import React from 'react'
import ConnectionCard from './_components/connection-card'
import { currentUser } from '@clerk/nextjs'
import { getGoogleDriveConnectionDetails } from './_actions/google-connection'
import { getUserData } from './_actions/get-user'

const Connections = async () => {

  const user = await currentUser()
  if (!user) return null

  const onUserConnections = async () => {
    const connections: any = {}
    const [googleConnection, user_info] = await Promise.all([
      getGoogleDriveConnectionDetails(),
      getUserData(user.id),
    ])

    //get user info with all connections
    user_info?.connections.map((connection) => {
      connections[connection.type] = true
      return (connections[connection.type] = true)
    })

    return {
      connections: {
        ...connections,
        'Google Drive': googleConnection.connected,
      },
      googleConnection,
    }
  }

  const { connections, googleConnection } = await onUserConnections()

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
                  : undefined
              }
              requiresReconnect={
                connection.title === 'Google Drive' &&
                googleConnection.requiresReconnect
              }
            />
          ))}
        </section>
      </div>
    </div>
  )
}

export default Connections
