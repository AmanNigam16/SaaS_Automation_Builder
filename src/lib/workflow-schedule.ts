import type { WorkflowNodeConfig } from './workflow-semantics.ts'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const localParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)
  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}

export const getNextScheduleAt = (
  config: WorkflowNodeConfig,
  after = new Date()
) => {
  const frequency = config.scheduleFrequency ?? 'day'
  const timeZone = config.scheduleTimeZone ?? 'UTC'
  const minute = config.scheduleMinute ?? 0
  const hour = config.scheduleHour ?? 9
  const weekday = weekdays[config.scheduleWeekday ?? 1]
  const candidate = new Date(after)
  candidate.setUTCSeconds(0, 0)
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1)
  const maxMinutes = frequency === 'week' ? 8 * 24 * 60 : 2 * 24 * 60

  for (let checked = 0; checked < maxMinutes; checked++) {
    const parts = localParts(candidate, timeZone)
    const matches =
      frequency === 'minute' ||
      (frequency === 'hour' && Number(parts.minute) === minute) ||
      (frequency === 'day' && Number(parts.hour) === hour && Number(parts.minute) === minute) ||
      (frequency === 'week' && parts.weekday === weekday && Number(parts.hour) === hour && Number(parts.minute) === minute)
    if (matches) return candidate
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1)
  }
  throw new Error('Could not calculate the next schedule time')
}
