import type { Task, PersonalProject, WorkspaceProject } from '@doist/todoist-sdk'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Calendar, FolderOpen, Tag } from 'lucide-react'
import type { ProjectWithTasks } from '~/lib/weekly-review-machine'

type Project = PersonalProject | WorkspaceProject

function TaskRow({ task }: { task: Task }) {
  const hasNextAction = task.labels.includes('next_action')
  return (
    <div className="flex items-start gap-2 py-1.5 text-sm">
      <div className="flex-1 min-w-0">
        <p className="truncate">{task.content}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {hasNextAction && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            <Tag className="h-2.5 w-2.5 mr-0.5" />
            next
          </Badge>
        )}
        {task.due && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
            <Calendar className="h-2.5 w-2.5 mr-0.5" />
            {task.due.string}
          </Badge>
        )}
      </div>
    </div>
  )
}

export function ProjectReviewCard({
  projectWithTasks,
  animationKey,
}: {
  projectWithTasks: ProjectWithTasks
  animationKey: string | number
}) {
  const { project, tasks, hasNextAction } = projectWithTasks
  const isEmpty = tasks.length === 0

  return (
    <Card
      key={animationKey}
      className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-150"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            {project.name}
          </CardTitle>
          {!isEmpty && (
            <Badge variant={hasNextAction ? 'secondary' : 'destructive'} className="text-xs">
              {hasNextAction ? 'Has next action' : 'No next action'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">This project has no tasks.</p>
        ) : (
          <div className="divide-y">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
