export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import axios from 'axios'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  console.log('🔴 Changed')

  // ✅ Use request headers (build-safe)
  const channelResourceId = req.headers.get('x-goog-resource-id')

  if (!channelResourceId) {
    return Response.json({ message: 'success' }, { status: 200 })
  }

  // ✅ Import Prisma ONLY at runtime
  const { db } = await import('@/lib/db')

  // ✅ Import heavy actions ONLY at runtime
  const { postContentToWebHook } = await import(
    '@/app/(main)/(pages)/connections/_actions/discord-connection'
  )
  const { onCreateNewPageInDatabase } = await import(
    '@/app/(main)/(pages)/connections/_actions/notion-connection'
  )
  const { postMessageToSlack } = await import(
    '@/app/(main)/(pages)/connections/_actions/slack-connection'
  )

  const user = await db.user.findFirst({
    where: {
      googleResourceId: channelResourceId,
    },
    select: { clerkId: true, credits: true },
  })

  if (!user) {
    return Response.json({ message: 'success' }, { status: 200 })
  }

  if (!(user.credits === 'Unlimited' || parseInt(user.credits!) > 0)) {
    return Response.json({ message: 'no credits' }, { status: 200 })
  }

  const workflows = await db.workflows.findMany({
    where: {
      userId: user.clerkId,
    },
  })

  for (const flow of workflows) {
    const flowPath = JSON.parse(flow.flowPath!)
    let current = 0

    while (current < flowPath.length) {
      if (flowPath[current] === 'Discord') {
        const discordMessage = await db.discordWebhook.findFirst({
          where: { userId: flow.userId },
          select: { url: true },
        })
        if (discordMessage) {
          await postContentToWebHook(flow.discordTemplate!, discordMessage.url)
        }
      }

      if (flowPath[current] === 'Slack') {
        const channels = flow.slackChannels.map((channel) => ({
          label: '',
          value: channel,
        }))
        await postMessageToSlack(
          flow.slackAccessToken!,
          channels,
          flow.slackTemplate!
        )
      }

      if (flowPath[current] === 'Notion') {
        await onCreateNewPageInDatabase(
          flow.notionDbId!,
          flow.notionAccessToken!,
          JSON.parse(flow.notionTemplate!)
        )
      }

      if (flowPath[current] === 'Wait') {
        const res = await axios.put(
          'https://api.cron-job.org/jobs',
          {
            job: {
              url: `${process.env.NGROK_URI}?flow_id=${flow.id}`,
              enabled: 'true',
              schedule: {
                timezone: 'Europe/Istanbul',
                expiresAt: 0,
                hours: [-1],
                mdays: [-1],
                minutes: ['*****'],
                months: [-1],
                wdays: [-1],
              },
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.CRON_JOB_KEY!}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (res) {
          await db.workflows.update({
            where: { id: flow.id },
            data: {
              cronPath: JSON.stringify(flowPath),
            },
          })
        }
        break
      }

      current++
    }

    await db.user.update({
      where: { clerkId: user.clerkId },
      data: {
        credits:
          user.credits === 'Unlimited'
            ? 'Unlimited'
            : `${parseInt(user.credits!) - 1}`,
      },
    })
  }

  return Response.json({ message: 'flow completed' }, { status: 200 })
}
