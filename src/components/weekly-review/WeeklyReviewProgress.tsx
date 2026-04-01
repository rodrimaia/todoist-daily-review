import { Progress } from '~/components/ui/progress'
import type { WeeklyReviewState, WeeklyPhase } from '~/lib/weekly-review-machine'
import { getWeeklyPhaseTotal, getWeeklyPhaseIndex } from '~/lib/weekly-review-machine'

const PHASE_LABELS: Record<WeeklyPhase, string> = {
  inbox: 'Inbox',
  projects: 'Projects',
  someday: 'Someday/Maybe',
  upcoming: 'Upcoming',
  summary: 'Summary',
}

export function WeeklyReviewProgress({ state }: { state: WeeklyReviewState }) {
  const total = getWeeklyPhaseTotal(state)
  if (total === 0) return null

  const index = getWeeklyPhaseIndex(state)
  const current = index + 1
  const percent = (index / total) * 100
  const label = PHASE_LABELS[state.phase]

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
