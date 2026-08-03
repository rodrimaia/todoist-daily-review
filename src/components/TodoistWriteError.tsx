import { useState } from 'react'
import { useMutationState } from '@tanstack/react-query'
import { AlertCircle, X } from 'lucide-react'
import { Button } from '~/components/ui/button'

export function TodoistWriteError() {
  const errors = useMutationState({
    filters: { status: 'error' },
    select: (mutation) => mutation.mutationId,
  })
  const [dismissedErrors, setDismissedErrors] = useState<Set<number>>(() => new Set())
  const visibleErrors = errors.filter((id) => !dismissedErrors.has(id))

  if (visibleErrors.length === 0) return null

  return (
    <div
      role="alert"
      className="fixed left-1/2 top-4 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-lg border border-destructive/40 bg-background p-3 shadow-lg"
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          Could not complete {visibleErrors.length === 1 ? 'a Todoist update' : `${visibleErrors.length} Todoist updates`}
        </p>
        <p className="text-xs text-muted-foreground">Check Todoist before you continue.</p>
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Dismiss error"
        onClick={() => setDismissedErrors((current) => new Set([...current, ...visibleErrors]))}
      >
        <X />
      </Button>
    </div>
  )
}
