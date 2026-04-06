import { Button } from '~/components/ui/button'
import {
  CalendarDays,
  ArrowRight,
  CalendarRange,
  CalendarOff,
} from 'lucide-react'

const DATE_OPTIONS = [
  { label: 'Today', value: 'today', icon: CalendarDays, shortcut: '1' },
  { label: 'Tomorrow', value: 'tomorrow', icon: ArrowRight, shortcut: '2' },
  { label: 'Saturday', value: 'saturday', icon: CalendarRange, shortcut: '3' },
  { label: 'Monday', value: 'monday', icon: CalendarRange, shortcut: '4' },
  { label: 'No date', value: 'no date', icon: CalendarOff, shortcut: '0' },
] as const

export function DatePicker({
  onSelect,
}: {
  onSelect: (dueString: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {DATE_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant="outline"
          size="sm"
          onClick={() => onSelect(opt.value)}
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
