import { AlertTriangle, Check, Circle, Repeat2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  buildProjectArchivePlan,
  type ProjectArchiveTaskChoice,
} from '~/lib/project-archive'
import type { ProjectWithTasks } from '~/lib/weekly-review-machine'
import { cn } from '~/lib/utils'

function taskCount(count: number): string {
  return `${count} ${count === 1 ? 'task' : 'tasks'}`
}

const ARCHIVE_CHOICES: Array<{
  value: ProjectArchiveTaskChoice
  label: string
  description: (activeCount: number, eligibleCount: number) => string
  destructive?: boolean
}> = [
  {
    value: 'keep_open',
    label: 'Archive project and keep tasks open',
    description: (activeCount) => `${taskCount(activeCount)} will remain open and unchanged.`,
  },
  {
    value: 'complete_tasks',
    label: 'Complete tasks and archive project',
    description: (_activeCount, eligibleCount) => `${taskCount(eligibleCount)} will be completed.`,
  },
  {
    value: 'delete_tasks',
    label: 'Permanently delete tasks and archive project',
    description: (_activeCount, eligibleCount) => `${taskCount(eligibleCount)} will be permanently deleted.`,
    destructive: true,
  },
]

export function ProjectArchiveConfirmation({
  projectWithTasks,
  choice,
  onChoiceChange,
  onCancel,
  onConfirm,
  isProcessing = false,
}: {
  projectWithTasks: ProjectWithTasks
  choice: ProjectArchiveTaskChoice | null
  onChoiceChange: (choice: ProjectArchiveTaskChoice) => void
  onCancel: () => void
  onConfirm: (choice: ProjectArchiveTaskChoice) => void | Promise<void>
  isProcessing?: boolean
}) {
  const { project } = projectWithTasks
  const plan = buildProjectArchivePlan(projectWithTasks.archiveTasks ?? projectWithTasks.tasks)
  const isWorkspaceProject = 'workspaceId' in project

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p>
          <strong>{project.name}</strong> has{' '}
          <strong>{plan.activeTaskCount}</strong> open{' '}
          {plan.activeTaskCount === 1 ? 'task' : 'tasks'}, including subtasks at every depth.
        </p>
        <p className="mt-1 text-muted-foreground">
          {plan.eligibleTaskCount} {plan.eligibleTaskCount === 1 ? 'is' : 'are'} eligible for bulk
          completion or deletion.
        </p>
      </div>

      <div
        className="grid gap-2"
        role="radiogroup"
        aria-label="Project archive task choice"
      >
        {ARCHIVE_CHOICES.map((option) => {
          const selected = choice === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={isProcessing}
              onClick={() => onChoiceChange(option.value)}
              className={cn(
                'flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
                selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                option.destructive && 'text-destructive',
              )}
            >
              {selected
                ? <Check className="mt-0.5 h-4 w-4 shrink-0" />
                : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className={cn(
                  'mt-0.5 block text-xs',
                  option.destructive ? 'text-destructive/80' : 'text-muted-foreground',
                )}>
                  {option.description(plan.activeTaskCount, plan.eligibleTaskCount)}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {plan.recurringTaskCount > 0 && (
        <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <Repeat2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <p>
            <strong>
              {plan.recurringTaskCount} recurring {plan.recurringTaskCount === 1 ? 'task' : 'tasks'}
            </strong>{' '}
            will remain open. To protect recurring schedules,{' '}
            {plan.recurringBranches.length}{' '}
            {plan.recurringBranches.length === 1
              ? 'branch containing a recurring task is'
              : 'branches containing recurring tasks are'} preserved in full
            ({taskCount(plan.preservedTaskCount)} total in those branches).
          </p>
        </div>
      )}

      {isWorkspaceProject && (
        <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <p>
            <strong>Shared workspace project.</strong> Archiving this project may affect collaborators.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Confirmation applies these changes directly to your Todoist account. Task operations are
        attempted first; the project is archived afterward.
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button
          type="button"
          variant={choice === 'delete_tasks' ? 'destructive' : 'default'}
          onClick={() => choice && void onConfirm(choice)}
          disabled={!choice || isProcessing}
        >
          {isProcessing ? 'Applying in Todoist…' : 'Confirm project archive'}
        </Button>
      </div>
    </div>
  )
}
