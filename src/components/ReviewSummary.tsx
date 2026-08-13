import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import {
  FolderOpen,
  Lightbulb,
  Check,
  Trash2,
  SkipForward,
  CalendarDays,
  ArrowRight,
  CalendarRange,
  CalendarOff,
} from 'lucide-react'
import type { InboxStats, FilterStats } from '~/lib/review-machine'
import { getInboxTotal, getFilterTotal } from '~/lib/review-machine'
import { Celebration } from '~/components/Celebration'

function StatRow({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
}) {
  if (count === 0) return null
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="font-medium">{count}</span>
    </div>
  )
}

export function ReviewSummary({
  inboxStats,
  filterStats,
  onDone,
}: {
  inboxStats: InboxStats
  filterStats: FilterStats
  onDone: () => void
}) {
  const inboxTotal = getInboxTotal(inboxStats)
  const filterTotal = getFilterTotal(filterStats)
  const hasReviewedItems = inboxTotal > 0 || filterTotal > 0

  return (
    <>
      {hasReviewedItems && <Celebration />}
      <Card className="w-full max-w-xl animate-in rounded-none border-x-0 bg-transparent fade-in duration-200">
        <CardHeader>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-700 dark:text-orange-300">The closing note</p>
          <CardTitle className="font-serif text-4xl sm:text-5xl">Review complete.</CardTitle>
          <p className="font-serif text-lg italic text-current/55">The desk is clearer than you found it.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {inboxTotal > 0 && (
            <div className="space-y-2">
              <p className="font-serif text-xl">Inbox ({inboxTotal})</p>
              <div className="space-y-1">
                <StatRow icon={FolderOpen} label="Moved to project" count={inboxStats.moved} />
                <StatRow icon={Lightbulb} label="Someday/Maybe" count={inboxStats.someday} />
                <StatRow icon={Check} label="Completed" count={inboxStats.completed} />
                <StatRow icon={Trash2} label="Deleted" count={inboxStats.deleted} />
                <StatRow icon={SkipForward} label="Skipped" count={inboxStats.skipped} />
              </div>
            </div>
          )}

          {inboxTotal > 0 && filterTotal > 0 && <Separator />}

          {filterTotal > 0 && (
            <div className="space-y-2">
              <p className="font-serif text-xl">Next actions ({filterTotal})</p>
              <div className="space-y-1">
                <StatRow icon={CalendarDays} label="Today" count={filterStats.rescheduledToday} />
                <StatRow icon={ArrowRight} label="Tomorrow" count={filterStats.rescheduledTomorrow} />
                <StatRow icon={CalendarRange} label="Saturday" count={filterStats.rescheduledSaturday} />
                <StatRow icon={CalendarRange} label="Monday" count={filterStats.rescheduledMonday} />
                <StatRow icon={CalendarOff} label="Removed date" count={filterStats.removedDate} />
                <StatRow icon={Check} label="Completed" count={filterStats.completed} />
                <StatRow icon={Trash2} label="Deleted" count={filterStats.deleted} />
                <StatRow icon={SkipForward} label="Skipped" count={filterStats.skipped} />
              </div>
            </div>
          )}

          {inboxTotal === 0 && filterTotal === 0 && (
            <p className="text-sm text-muted-foreground">Nothing to review today.</p>
          )}

          <Button onClick={onDone} className="w-full mt-4">
            Done
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
