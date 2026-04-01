import { Button } from '~/components/ui/button'
import { Play, Check, Trash2, Square } from 'lucide-react'

export function SomedayActionBar({
  onActivate,
  onKeep,
  onDelete,
  onStop,
}: {
  onActivate: () => void
  onKeep: () => void
  onDelete: () => void
  onStop: () => void
}) {
  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onActivate} className="gap-1.5">
          <Play className="h-3.5 w-3.5" />
          Activate
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">a</kbd>
        </Button>
        <Button variant="outline" size="sm" onClick={onKeep} className="gap-1.5">
          <Check className="h-3.5 w-3.5" />
          Keep
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">k</kbd>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="gap-1.5 text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">d</kbd>
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
