import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { DatePicker } from './DatePicker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Check, SkipForward, Square, Repeat, Trash2 } from 'lucide-react'

export function FilterActionBar({
  onSchedule,
  onComplete,
  onSkip,
  onStop,
  onDelete,
  isRecurring,
  canChangeDueDate,
  canDelete,
  taskContent,
}: {
  onSchedule: (dueString: string) => void
  onComplete: () => void
  onSkip: () => void
  onStop: () => void
  onDelete: () => void
  isRecurring?: boolean
  canChangeDueDate: boolean
  canDelete: boolean
  taskContent: string
}) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  return (
    <div className="w-full max-w-md space-y-3">
      {canChangeDueDate ? (
        <DatePicker onSelect={(option) => onSchedule(option.value)} />
      ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Repeat className="h-3 w-3" />
          Recurring task - complete to advance to next date
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onComplete} className="gap-1.5">
          <Check className="h-3.5 w-3.5" />
          Done
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">c</kbd>
        </Button>
        {canDelete && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeleteOpen(true)}
              className="gap-1.5 text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Delete task</DialogTitle>
                  <DialogDescription>
                    This permanently deletes <span className="font-medium text-foreground">{taskContent}</span> from Todoist. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setConfirmDeleteOpen(false)
                      onDelete()
                    }}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
        {isRecurring && (
          <Button variant="ghost" size="sm" onClick={onSkip} className="gap-1.5 text-muted-foreground">
            <SkipForward className="h-3.5 w-3.5" />
            Skip
            <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">s</kbd>
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onStop} className="gap-1.5 text-muted-foreground">
          <Square className="h-3.5 w-3.5" />
          Stop
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">esc</kbd>
        </Button>
      </div>
    </div>
  )
}
