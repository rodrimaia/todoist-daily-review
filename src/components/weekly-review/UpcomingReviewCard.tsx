import { useState, useMemo } from 'react'
import type { Task, PersonalProject, WorkspaceProject } from '@doist/todoist-sdk'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  CalendarDays,
  Check,
  CalendarOff,
  ArrowRight,
  Square,
  CalendarRange,
} from 'lucide-react'
import { startOfDay, parseISO, format, isEqual, isBefore, addDays } from 'date-fns'
import type { UpcomingStats } from '~/lib/weekly-review-machine'

type Project = PersonalProject | WorkspaceProject
type TaskAction = 'rescheduled' | 'completed' | 'removed_date' | null

interface DayGroup {
  label: string
  sortKey: string
  tasks: Task[]
}

function groupByDay(tasks: Task[]): DayGroup[] {
  const today = startOfDay(new Date())
  const groups = new Map<string, { label: string; sortKey: string; tasks: Task[] }>()

  for (const task of tasks) {
    if (!task.due) continue
    const dueDate = startOfDay(parseISO(task.due.date))
    const sortKey = task.due.date

    let label: string
    if (isBefore(dueDate, today)) label = 'Overdue'
    else if (isEqual(dueDate, today)) label = 'Today'
    else if (isEqual(dueDate, addDays(today, 1))) label = 'Tomorrow'
    else label = format(dueDate, 'EEEE, MMM d')

    const key = isBefore(dueDate, today) ? '0000-overdue' : sortKey
    const existing = groups.get(key)
    if (existing) {
      existing.tasks.push(task)
    } else {
      groups.set(key, { label, sortKey: key, tasks: [task] })
    }
  }

  // Tasks with no date
  const noDueTasks = tasks.filter((t) => !t.due)
  if (noDueTasks.length > 0) {
    groups.set('9999-no-date', { label: 'No date', sortKey: '9999-no-date', tasks: noDueTasks })
  }

  return Array.from(groups.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}

function TaskRow({
  task,
  projectMap,
  action,
  onReschedule,
  onComplete,
  onRemoveDate,
}: {
  task: Task
  projectMap: Map<string, Project>
  action: TaskAction
  onReschedule: (taskId: string, dueString: string) => void
  onComplete: (taskId: string) => void
  onRemoveDate: (taskId: string) => void
}) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const project = projectMap.get(task.projectId)
  const isRecurring = task.due?.isRecurring

  if (action) {
    return (
      <div className="flex items-center gap-2 py-1.5 opacity-40">
        <p className="flex-1 text-sm truncate">{task.content}</p>
        <span className="text-xs text-muted-foreground shrink-0">{action.replace('_', ' ')}</span>
      </div>
    )
  }

  if (showDatePicker) {
    return (
      <div className="py-1.5 space-y-1">
        <p className="text-sm">{task.content}</p>
        <div className="flex flex-wrap gap-1">
          {[
            { label: 'Today', value: 'today' },
            { label: 'Tomorrow', value: 'tomorrow' },
            { label: 'Saturday', value: 'saturday' },
            { label: 'Monday', value: 'monday' },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant="outline"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => {
                onReschedule(task.id, opt.value)
                setShowDatePicker(false)
              }}
            >
              {opt.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => setShowDatePicker(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{task.content}</p>
        {project && (
          <p className="text-[11px] text-muted-foreground truncate">{project.name}</p>
        )}
      </div>
      {isRecurring && (
        <span className="text-[10px] text-muted-foreground shrink-0">recurring</span>
      )}
      <div className="flex gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDatePicker(true)}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Reschedule"
        >
          <CalendarRange className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onComplete(task.id)}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Complete"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemoveDate(task.id)}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Remove date"
        >
          <CalendarOff className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function UpcomingReviewCard({
  tasks,
  projectMap,
  onReschedule,
  onComplete,
  onRemoveDate,
  onDone,
  onStop,
}: {
  tasks: Task[]
  projectMap: Map<string, Project>
  onReschedule: (taskId: string, dueString: string) => void
  onComplete: (taskId: string) => void
  onRemoveDate: (taskId: string) => void
  onDone: (stats: UpcomingStats) => void
  onStop: () => void
}) {
  const [actions, setActions] = useState<Map<string, TaskAction>>(new Map())
  const dayGroups = useMemo(() => groupByDay(tasks), [tasks])

  function handleReschedule(taskId: string, dueString: string) {
    onReschedule(taskId, dueString)
    setActions((prev) => new Map(prev).set(taskId, 'rescheduled'))
  }

  function handleComplete(taskId: string) {
    onComplete(taskId)
    setActions((prev) => new Map(prev).set(taskId, 'completed'))
  }

  function handleRemoveDate(taskId: string) {
    onRemoveDate(taskId)
    setActions((prev) => new Map(prev).set(taskId, 'removed_date'))
  }

  function handleDone() {
    let rescheduled = 0
    let completed = 0
    let removedDate = 0
    for (const action of actions.values()) {
      if (action === 'rescheduled') rescheduled++
      else if (action === 'completed') completed++
      else if (action === 'removed_date') removedDate++
    }
    onDone({ rescheduled, completed, removedDate })
  }

  return (
    <Card className="w-full max-w-lg animate-in fade-in duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Upcoming
          </CardTitle>
          <span className="text-sm text-muted-foreground">{tasks.length} tasks</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[28rem] overflow-y-auto space-y-3">
          {dayGroups.map((group) => (
            <div key={group.sortKey}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {group.label}
              </p>
              <div className="divide-y">
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    projectMap={projectMap}
                    action={actions.get(task.id) ?? null}
                    onReschedule={handleReschedule}
                    onComplete={handleComplete}
                    onRemoveDate={handleRemoveDate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleDone} className="gap-1.5">
            <ArrowRight className="h-3.5 w-3.5" />
            Continue
          </Button>
          <Button variant="ghost" size="sm" onClick={onStop} className="gap-1.5 text-muted-foreground">
            <Square className="h-3.5 w-3.5" />
            Stop
            <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">esc</kbd>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
