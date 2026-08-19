import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import {
  FolderOpen,
  Lightbulb,
  Check,
  Trash2,
  SkipForward,
  CalendarRange,
  CalendarOff,
  Plus,
  Play,
  Eye,
} from 'lucide-react'
import type { InboxStats } from '~/lib/review-machine'
import { getInboxTotal } from '~/lib/review-machine'
import type { ProjectStats, SomedayStats, UpcomingStats } from '~/lib/weekly-review-machine'
import { getProjectStatsTotal, getSomedayStatsTotal, getUpcomingStatsTotal } from '~/lib/weekly-review-machine'

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

export function WeeklyReviewSummary({
  inboxStats,
  projectStats,
  somedayStats,
  upcomingStats,
  onDone,
  isProcessing = false,
  trackingFailure,
  onFinishWithoutTracking,
}: {
  inboxStats: InboxStats
  projectStats: ProjectStats
  somedayStats: SomedayStats
  upcomingStats: UpcomingStats
  onDone: () => void
  isProcessing?: boolean
  trackingFailure?: string | null
  onFinishWithoutTracking?: () => void
}) {
  const inboxTotal = getInboxTotal(inboxStats)
  const projectTotal = getProjectStatsTotal(projectStats)
  const somedayTotal = getSomedayStatsTotal(somedayStats)
  const upcomingTotal = getUpcomingStatsTotal(upcomingStats)
  const grandTotal = inboxTotal + projectTotal + somedayTotal + upcomingTotal

  return (
    <Card className="content-enter w-full max-w-xl rounded-none border-x-0 bg-transparent">
      <CardHeader>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-700 dark:text-orange-300">Filed for the week</p>
        <CardTitle className="font-serif text-4xl sm:text-5xl">Weekly Review complete.</CardTitle>
        <p className="font-serif text-lg italic text-current/55">You have the wider view again.</p>
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

        {inboxTotal > 0 && projectTotal > 0 && <Separator />}

        {projectTotal > 0 && (
          <div className="space-y-2">
            <p className="font-serif text-xl">Projects ({projectTotal})</p>
            <div className="space-y-1">
              <StatRow icon={Eye} label="Reviewed" count={projectStats.reviewed} />
              <StatRow icon={Plus} label="Tasks added" count={projectStats.tasksAdded} />
              <StatRow icon={Trash2} label="Projects deleted" count={projectStats.projectsDeleted} />
              <StatRow icon={SkipForward} label="Skipped" count={projectStats.skipped} />
            </div>
          </div>
        )}

        {projectTotal > 0 && somedayTotal > 0 && <Separator />}

        {somedayTotal > 0 && (
          <div className="space-y-2">
            <p className="font-serif text-xl">Someday/Maybe ({somedayTotal})</p>
            <div className="space-y-1">
              <StatRow icon={Play} label="Activated" count={somedayStats.activated} />
              <StatRow icon={Check} label="Kept" count={somedayStats.kept} />
              <StatRow icon={Trash2} label="Deleted" count={somedayStats.deleted} />
            </div>
          </div>
        )}

        {somedayTotal > 0 && upcomingTotal > 0 && <Separator />}

        {upcomingTotal > 0 && (
          <div className="space-y-2">
            <p className="font-serif text-xl">Upcoming ({upcomingTotal})</p>
            <div className="space-y-1">
              <StatRow icon={CalendarRange} label="Rescheduled" count={upcomingStats.rescheduled} />
              <StatRow icon={Check} label="Completed" count={upcomingStats.completed} />
              <StatRow icon={CalendarOff} label="Removed date" count={upcomingStats.removedDate} />
            </div>
          </div>
        )}

        {grandTotal === 0 && (
          <p className="text-sm text-muted-foreground">Nothing to review this week.</p>
        )}

        {trackingFailure && (
          <div className="space-y-2 rounded-md border border-destructive/40 p-3 text-sm">
            <p className="text-destructive">{trackingFailure}</p>
            <p className="text-muted-foreground">Your review is complete, but its tracking task was not changed.</p>
          </div>
        )}

        <Button onClick={onDone} disabled={isProcessing} className="w-full mt-4">
          {isProcessing ? 'Completing…' : trackingFailure ? 'Retry' : 'Done'}
        </Button>
        {trackingFailure && onFinishWithoutTracking && (
          <Button onClick={onFinishWithoutTracking} disabled={isProcessing} variant="outline" className="w-full">
            Finish without tracking
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
