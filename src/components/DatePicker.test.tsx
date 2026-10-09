import { describe, expect, test } from 'bun:test'
import type { Task } from '@doist/todoist-sdk'
import { renderToStaticMarkup } from 'react-dom/server'
import { DatePicker, getInboxDateOptions } from './DatePicker'

const now = new Date('2026-10-09T15:00:00Z')

describe('Inbox date options for tasks with a time', () => {
  test('keeps a floating due date and time without crashing or duplicating Today', () => {
    const due = {
      date: '2026-10-09T17:00:00',
      timezone: null,
      string: '9 out. 17:00',
      lang: 'pt',
      isRecurring: false,
    } as NonNullable<Task['due']>
    const options = getInboxDateOptions(due, 'America/Sao_Paulo', 0, now)

    expect(options[0]?.label).toBe('Keep Fri, Oct 9 at 17:00')
    expect(options[0]?.decision).toBe('keep_date')
    expect(options.some((option) => option.label === 'Today')).toBe(false)
    expect(options.at(-1)?.decision).toBe('remove_date')
    expect(renderToStaticMarkup(<DatePicker options={options} onSelect={() => {}} />))
      .toContain('Keep Fri, Oct 9 at 17:00')
  })

  test.each([
    { date: '2026-10-09', label: 'Keep Fri, Oct 9' },
    { date: '2026-10-09T15:30:00.000000', label: 'Keep Fri, Oct 9 at 15:30' },
    { date: '2026-10-10T01:30:00.000000Z', label: 'Keep Fri, Oct 9 at 22:30' },
    { date: '2026-10-10T01:30:00+00:00', label: 'Keep Fri, Oct 9 at 22:30' },
    { date: '2026-10-09', datetime: '2026-10-10T01:30:00Z', label: 'Keep Fri, Oct 9 at 22:30' },
  ])('formats $date using the account calendar day', ({ date, label, ...extra }) => {
    const due = { date, ...extra, string: 'today', isRecurring: false }
    const original = { ...due }
    const options = getInboxDateOptions(due, 'America/Sao_Paulo', 0, now)
    expect(options[0]?.label).toBe(label)
    expect(options[0]?.value).toBe('keep date')
    expect(options.some((option) => option.label === 'Today')).toBe(false)
    expect(options.find((option) => option.label === 'Tomorrow')?.value).toBe('2026-10-10')
    expect(due).toEqual(original)
  })

  test('formats floating times in 12-hour format without converting the wall clock', () => {
    const options = getInboxDateOptions(
      { date: '2026-10-09T00:30:00', string: 'today at 00:30', isRecurring: false },
      'Pacific/Auckland', 1, new Date('2026-10-08T15:00:00Z'),
    )
    expect(options[0]?.label).toBe('Keep Fri, Oct 9 at 12:30 AM')
    expect(options.some((option) => option.label === 'Today')).toBe(false)
  })

  test('preserves Keep date even if due data cannot be parsed', () => {
    const options = getInboxDateOptions(
      { date: 'invalid', string: 'original schedule', isRecurring: false },
      'America/Sao_Paulo', 0, now,
    )
    expect(options[0]?.label).toBe('Keep original schedule')
    expect(options[0]?.decision).toBe('keep_date')
    expect(options.some((option) => option.label === 'Today')).toBe(true)
  })

  test('offers No date for an undated task', () => {
    const options = getInboxDateOptions(null, 'America/Sao_Paulo', 0, now)
    expect(options[0]?.value).toBe('2026-10-09')
    expect(options.at(-1)?.decision).toBe('no_date')
    expect(options.some((option) => option.decision === 'keep_date')).toBe(false)
  })
})
