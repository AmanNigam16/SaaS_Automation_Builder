'use server'

export const onNotionConnect = async (
  access_token: string,
  workspace_id: string,
  workspace_icon: string,
  workspace_name: string,
  database_id: string,
  id: string
) => {
  if (!access_token) return

  const { db } = await import('@/lib/db')

  const notion_connected = await db.notion.findFirst({
    where: { accessToken: access_token },
    include: {
      connections: { select: { type: true } },
    },
  })

  if (!notion_connected) {
    await db.notion.create({
      data: {
        userId: id,
        workspaceIcon: workspace_icon,
        accessToken: access_token,
        workspaceId: workspace_id,
        workspaceName: workspace_name,
        databaseId: database_id,
        connections: {
          create: {
            userId: id,
            type: 'Notion',
          },
        },
      },
    })
  }
}

export const getNotionConnection = async () => {
  const { currentUser } = await import('@clerk/nextjs')
  const { db } = await import('@/lib/db')

  const user = await currentUser()
  if (!user) return null

  return db.notion.findFirst({
    where: {
      userId: user.id,
    },
  })
}

export const getNotionDatabase = async (
  databaseId: string,
  accessToken: string
) => {
  const { Client } = await import('@notionhq/client')

  const notion = new Client({
    auth: accessToken,
  })

  return notion.databases.retrieve({
    database_id: databaseId,
  })
}

export const onCreateNewPageInDatabase = async (
  databaseId: string,
  accessToken: string,
  content: string
) => {
  const { Client } = await import('@notionhq/client')

  const notion = new Client({
    auth: accessToken,
  })

  return notion.pages.create({
    parent: {
      type: 'database_id',
      database_id: databaseId,
    },
    properties: {
      name: {
        title: [
          {
            text: {
              content,
            },
          },
        ],
      },
    },
  })
}
