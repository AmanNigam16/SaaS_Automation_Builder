import axios from 'axios'
import { Client } from '@notionhq/client'
import type { Option } from '@/components/ui/multiple-selector'
import {
  getDiscordWebhookSecret,
  getNotionAccessToken,
  getSlackAccessToken,
} from '@/lib/provider-connections'

export const listSlackChannelsForUser = async (userId: string): Promise<Option[]> => {
  const token = await getSlackAccessToken(userId)
  if (!token) return []
  const url = `https://slack.com/api/conversations.list?${new URLSearchParams({ types: 'public_channel,private_channel', limit: '200' })}`
  const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, timeout: 10_000 })
  if (!data.ok) throw new Error('Slack could not list channels. Check the app permissions and reconnect.')
  return (data.channels ?? [])
    .filter((channel: { is_member?: boolean }) => channel.is_member)
    .map((channel: { name: string; id: string }) => ({ label: channel.name, value: channel.id }))
}

export const sendSlackMessageForUser = async (userId: string, channels: Option[], content: string) => {
  if (!content) return { message: 'Content is empty' }
  if (!channels?.length) return { message: 'Channel not selected' }
  const token = await getSlackAccessToken(userId)
  if (!token) return { message: 'Slack is not connected' }
  await Promise.all(channels.map(async (channel) => {
    const { data } = await axios.post('https://slack.com/api/chat.postMessage', { channel: channel.value, text: content }, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json;charset=utf-8' },
      timeout: 10_000,
    })
    if (!data.ok) throw new Error('Slack rejected the message')
  }))
  return { message: 'Success' }
}

export const createNotionPageForUser = async (userId: string, databaseId: string, content: string) => {
  const token = await getNotionAccessToken(userId)
  if (!token) throw new Error('Notion is not connected')
  const notion = new Client({ auth: token, timeoutMs: 10_000 })
  return notion.pages.create({
    parent: { type: 'database_id', database_id: databaseId },
    properties: { name: { title: [{ text: { content } }] } },
  })
}

export const sendDiscordMessageForUser = async (userId: string, content: string) => {
  if (!content) return { message: 'String empty' }
  const url = await getDiscordWebhookSecret(userId)
  if (!url) return { message: 'Discord is not connected' }
  await axios.post(url, { content }, { timeout: 10_000 })
  return { message: 'success' }
}
