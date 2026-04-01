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
  Plus,
  Play,
  Eye,
} from 'lucide-react'
import type { InboxStats, FilterStats } from '~/lib/review-machine'
import { getInboxTotal, getFilterTotal } from '~/lib/review-machine'
import type { ProjectStats, SomedayStats } from '~/lib/weekly-review-machine'
import { getProjectStatsTotal, getSomedayStatsTotal } from '~/lib/weekly-review-machine'

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
}: {
  inboxStats: InboxStats
  projectStats: ProjectStats
  somedayStats: SomedayStats
  upcomingStats: FilterStats
  onDone: () => void
}) {
  const inboxTotal = getInboxTotal(inboxStats)
  const projectTotal = getProjectStatsTotal(projectStats)
  const somedayTotal = getSomedayStatsTotal(somedayStats)
  const upcomingTotal = getFilterTotal(upcomingStats)
  const grandTotal = inboxTotal + projectTotal + somedayTotal + upcomingTotal

  return (
    <Card className="w-full max-w-md animate-in fade-in duration-200">
      <CardHeader>
        <CardTitle className="text-xl">Weekly Review Complete</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {inboxTotal > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Inbox ({inboxTotal})</p>
            <div className="space-y-1">
              <StatRow icon={FolderOpen} label="Moved to project" count={inboxStats.moved} />
              <StatRow icon={Lightbulb} label="Someday/Maybe" count={inboxStats.someday} />
              <StatRow icon={CalendarDays} label="Scheduled" count={inboxStats.scheduled} />
              <StatRow icon={Check} label="Completed" count={inboxStats.completed} />
              <StatRow icon={Trash2} label="Deleted" count={inboxStats.deleted} />
              <StatRow icon={SkipForward} label="Skipped" count={inboxStats.skipped} />
            </div>
          </div>
        )}

        {inboxTotal > 0 && projectTotal > 0 && <Separator />}

        {projectTotal > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Projects ({projectTotal})</p>
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
            <p className="text-sm font-medium">Someday/Maybe ({somedayTotal})</p>
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
            <p className="text-sm font-medium">Upcoming ({upcomingTotal})</p>
            <div className="space-y-1">
              <StatRow icon={CalendarDays} label="Today" count={upcomingStats.rescheduledToday} />
              <StatRow icon={ArrowRight} label="Tomorrow" count={upcomingStats.rescheduledTomorrow} />
              <StatRow icon={CalendarRange} label="Saturday" count={upcomingStats.rescheduledSaturday} />
              <StatRow icon={CalendarRange} label="Next Monday" count={upcomingStats.rescheduledNextMonday} />
              <StatRow icon={CalendarOff} label="Removed date" count={upcomingStats.removedDate} />
              <StatRow icon={Check} label="Completed" count={upcomingStats.completed} />
              <StatRow icon={SkipForward} label="Skipped" count={upcomingStats.skipped} />
            </div>
          </div>
        )}

        {grandTotal === 0 && (
          <p className="text-sm text-muted-foreground">Nothing to review this week.</p>
        )}

        <Button onClick={onDone} className="w-full mt-4">
          Done
        </Button>
      </CardContent>
    </Card>
  )
}
