import type { Task, PersonalProject, WorkspaceProject } from '@doist/todoist-sdk'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'
import { Calendar, FolderOpen } from 'lucide-react'
import { isAfter, isBefore, startOfDay, parseISO } from 'date-fns'

type Project = PersonalProject | WorkspaceProject

function getDueDateColor(due: Task['due']): string {
  if (!due) return 'text-muted-foreground'
  const today = startOfDay(new Date())
  const dueDate = startOfDay(parseISO(due.date))
  if (isBefore(dueDate, today)) return 'text-red-500'
  if (!isAfter(dueDate, today)) return 'text-blue-500'
  return 'text-muted-foreground'
}

function formatDueDate(due: Task['due']): string | null {
  if (!due) return null
  return due.string
}

export function TaskCard({
  task,
  projectMap,
  animationKey,
}: {
  task: Task
  projectMap: Map<string, Project>
  animationKey: string | number
}) {
  const project = projectMap.get(task.projectId)
  const dueLabel = formatDueDate(task.due)
  const dueColor = getDueDateColor(task.due)

  return (
    <Card
      key={animationKey}
      className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-150"
    >
      <CardContent className="p-6 space-y-3">
        <p className="text-lg font-medium leading-snug">{task.content}</p>
        {task.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {project && (
            <Badge variant="secondary" className="gap-1 font-normal">
              <FolderOpen className="h-3 w-3" />
              {project.name}
            </Badge>
          )}
          {dueLabel && (
            <Badge variant="outline" className={`gap-1 font-normal ${dueColor}`}>
              <Calendar className="h-3 w-3" />
              {dueLabel}
            </Badge>
          )}
          {task.labels.length > 0 && (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {task.labels.join(', ')}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
