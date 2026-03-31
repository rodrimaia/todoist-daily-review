import { Button } from '~/components/ui/button'
import { DatePicker } from './DatePicker'
import { Check, SkipForward, Square } from 'lucide-react'

export function FilterActionBar({
  onSchedule,
  onComplete,
  onSkip,
  onStop,
}: {
  onSchedule: (dueString: string) => void
  onComplete: () => void
  onSkip: () => void
  onStop: () => void
}) {
  return (
    <div className="w-full max-w-md space-y-3">
      <DatePicker onSelect={onSchedule} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onComplete} className="gap-1.5">
          <Check className="h-3.5 w-3.5" />
          Done
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">c</kbd>
        </Button>
        <Button variant="ghost" size="sm" onClick={onSkip} className="gap-1.5 text-muted-foreground">
          <SkipForward className="h-3.5 w-3.5" />
          Skip
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">s</kbd>
        </Button>
        <Button variant="ghost" size="sm" onClick={onStop} className="gap-1.5 text-muted-foreground">
          <Square className="h-3.5 w-3.5" />
          Stop
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">esc</kbd>
        </Button>
      </div>
    </div>
  )
}
