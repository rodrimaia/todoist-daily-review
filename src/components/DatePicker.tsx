import { useEffect } from 'react'
import type { Task } from '@doist/todoist-sdk'
import { Button } from '~/components/ui/button'
import { isEligibleReviewShortcut } from '~/lib/review-shortcuts'
import {
  CalendarDays,
  ArrowRight,
  CalendarRange,
  CalendarOff,
  CalendarCheck,
} from 'lucide-react'

export interface DateOption {
  label: string
  value: string
  decision: 'schedule' | 'keep_date' | 'remove_date' | 'no_date'
  icon: typeof CalendarDays
  shortcut: string
}

const DATE_OPTIONS: readonly DateOption[] = [
  { label: 'Today', value: 'today', decision: 'schedule', icon: CalendarDays, shortcut: '1' },
  { label: 'Tomorrow', value: 'tomorrow', decision: 'schedule', icon: ArrowRight, shortcut: '2' },
  { label: 'Saturday', value: 'saturday', decision: 'schedule', icon: CalendarRange, shortcut: '3' },
  { label: 'Monday', value: 'monday', decision: 'schedule', icon: CalendarRange, shortcut: '4' },
  { label: 'No date', value: 'no date', decision: 'remove_date', icon: CalendarOff, shortcut: '0' },
] as const

function calendarDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function nextWeekday(date: string, weekday: number): string {
  const current = new Date(`${date}T00:00:00Z`).getUTCDay()
  return addDays(date, ((weekday - current + 7) % 7) || 7)
}

function formatExistingDueDate(
  due: NonNullable<Task['due']>,
  timeZone: string,
  timeFormat: number,
): string {
  if (due.datetime) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: timeFormat === 1,
    }).formatToParts(new Date(due.datetime))
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((value) => value.type === type)?.value ?? ''
    const hour = `${part('hour')}:${part('minute')}${timeFormat === 1 ? ` ${part('dayPeriod')}` : ''}`
    return `${part('weekday')}, ${part('month')} ${part('day')} at ${hour}`
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${due.date}T00:00:00Z`))
}

export function getInboxDateOptions(
  due: Task['due'],
  timeZone: string,
  timeFormat: number,
  now = new Date(),
): DateOption[] {
  const today = calendarDate(now, timeZone)
  const quickOptions: DateOption[] = [
    { label: 'Today', value: today, decision: 'schedule', icon: CalendarDays, shortcut: '1' },
    { label: 'Tomorrow', value: addDays(today, 1), decision: 'schedule', icon: ArrowRight, shortcut: '2' },
    { label: 'Saturday', value: nextWeekday(today, 6), decision: 'schedule', icon: CalendarRange, shortcut: '3' },
    { label: 'Monday', value: nextWeekday(today, 1), decision: 'schedule', icon: CalendarRange, shortcut: '4' },
  ]
  const existingDate = due?.datetime ? calendarDate(new Date(due.datetime), timeZone) : due?.date
  const seenDates = new Set(existingDate ? [existingDate] : [])
  const options: DateOption[] = []

  if (due) {
    options.push({
      label: `Keep ${formatExistingDueDate(due, timeZone, timeFormat)}`,
      value: 'keep date',
      decision: 'keep_date',
      icon: CalendarCheck,
      shortcut: 'k',
    })
  }

  for (const option of quickOptions) {
    if (seenDates.has(option.value)) continue
    seenDates.add(option.value)
    options.push(option)
  }

  options.push({
    label: due ? 'Remove date' : 'No date',
    value: 'no date',
    decision: due ? 'remove_date' : 'no_date',
    icon: CalendarOff,
    shortcut: '0',
  })
  return options
}

export function DatePicker({
  onSelect,
  options = DATE_OPTIONS,
}: {
  onSelect: (option: DateOption) => void
  options?: readonly DateOption[]
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isEligibleReviewShortcut(event)) return
      const option = options.find(({ shortcut }) => shortcut === event.key.toLowerCase())
      if (option) onSelect(option)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSelect, options])

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant="outline"
          size="sm"
          onClick={() => onSelect(opt)}
          className="gap-1.5"
        >
          <opt.icon className="h-3.5 w-3.5" />
          {opt.label}
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">
            {opt.shortcut}
          </kbd>
        </Button>
      ))}
    </div>
  )
}
