import { Progress } from '~/components/ui/progress'
import type { ReviewState } from '~/lib/review-machine'

export function ReviewProgress({ state }: { state: ReviewState }) {
  const tasks = state.phase === 'inbox' ? state.inboxTasks : state.filterTasks
  const total = tasks.length
  if (total === 0) return null

  const current = state.currentIndex + 1
  const percent = (state.currentIndex / total) * 100
  const label = state.phase === 'inbox' ? 'Inbox' : 'Review'

  return (
    <div className="w-full max-w-md space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span>
          {current} / {total}
        </span>
      </div>
      <Progress value={percent} className="h-1.5 transition-all duration-300" />
    </div>
  )
}
