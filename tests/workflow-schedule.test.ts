import assert from 'node:assert/strict'
import test from 'node:test'
import { getNextScheduleAt } from '../src/lib/workflow-schedule.ts'

test('calculates minute and hourly schedules after the supplied instant', () => {
  const now = new Date('2026-09-20T10:10:45Z')
  assert.equal(getNextScheduleAt({ scheduleFrequency: 'minute' }, now).toISOString(), '2026-09-20T10:11:00.000Z')
  assert.equal(getNextScheduleAt({ scheduleFrequency: 'hour', scheduleMinute: 30 }, now).toISOString(), '2026-09-20T10:30:00.000Z')
})

test('calculates daily and weekly schedules in the configured timezone', () => {
  const now = new Date('2026-09-20T02:00:00Z')
  assert.equal(getNextScheduleAt({ scheduleFrequency: 'day', scheduleHour: 9, scheduleMinute: 0, scheduleTimeZone: 'Asia/Kolkata' }, now).toISOString(), '2026-09-20T03:30:00.000Z')
  assert.equal(getNextScheduleAt({ scheduleFrequency: 'week', scheduleWeekday: 1, scheduleHour: 9, scheduleMinute: 0, scheduleTimeZone: 'Asia/Kolkata' }, now).toISOString(), '2026-09-21T03:30:00.000Z')
})
