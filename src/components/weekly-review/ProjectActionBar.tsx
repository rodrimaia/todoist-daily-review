import { useState } from 'react'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Archive, Check, Plus, Trash2, SkipForward, Square } from 'lucide-react'
import type { ProjectArchiveTaskChoice } from '~/lib/project-archive'
import type { ProjectWithTasks } from '~/lib/weekly-review-machine'
import { ProjectArchiveConfirmation } from './ProjectArchiveConfirmation'

export function ProjectActionBar({
  projectWithTasks,
  onOk,
  onAddTask,
  onDeleteProject,
  onArchiveProject = () => {},
  onSkip,
  onStop,
  isArchiving = false,
}: {
  projectWithTasks: ProjectWithTasks
  onOk: () => void
  onAddTask: (content: string) => void
  onDeleteProject: () => void
  onArchiveProject?: (choice: ProjectArchiveTaskChoice) => void | Promise<void>
  onSkip: () => void
  onStop: () => void
  isArchiving?: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [taskContent, setTaskContent] = useState('')
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveChoice, setArchiveChoice] = useState<ProjectArchiveTaskChoice | null>(null)
  const [submittingArchive, setSubmittingArchive] = useState(false)
  const isEmpty = projectWithTasks.tasks.length === 0
  const subprojectCount = projectWithTasks.subprojectCount ?? 0
  const hasSubprojects = subprojectCount > 0
  const archiveIsProcessing = isArchiving || submittingArchive

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!taskContent.trim()) return
    onAddTask(taskContent.trim())
    setTaskContent('')
    setAdding(false)
  }

  function handleArchiveOpenChange(open: boolean) {
    if (archiveIsProcessing) return
    setArchiveOpen(open)
    if (!open) setArchiveChoice(null)
  }

  async function handleArchiveConfirm(choice: ProjectArchiveTaskChoice) {
    if (archiveIsProcessing || hasSubprojects) return
    setSubmittingArchive(true)
    try {
      await onArchiveProject(choice)
      setArchiveOpen(false)
      setArchiveChoice(null)
    } finally {
      setSubmittingArchive(false)
    }
  }

  if (adding) {
    return (
      <div className="w-full max-w-md space-y-2">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={taskContent}
            onChange={(e) => setTaskContent(e.target.value)}
            placeholder="New task..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setAdding(false)
                setTaskContent('')
              }
            }}
          />
          <Button type="submit" size="sm" disabled={!taskContent.trim()}>
            Add
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex flex-wrap gap-2">
        {!isEmpty && (
          <Button variant="outline" size="sm" onClick={onOk} className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            OK
            <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">o</kbd>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Task
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">a</kbd>
        </Button>
        {isEmpty && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteProject}
            className="gap-1.5 text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Project
            <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">d</kbd>
          </Button>
        )}
        <Dialog open={archiveOpen} onOpenChange={handleArchiveOpenChange}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={hasSubprojects}
              className="gap-1.5"
              title={hasSubprojects ? 'Projects with subprojects must be reviewed independently' : undefined}
            >
              <Archive className="h-3.5 w-3.5" />
              Archive Project
            </Button>
          </DialogTrigger>
          <DialogContent showCloseButton={!archiveIsProcessing}>
            <DialogHeader>
              <DialogTitle>Project archive</DialogTitle>
              <DialogDescription>
                Choose what happens to the project&apos;s open tasks before archiving it.
              </DialogDescription>
            </DialogHeader>
            <ProjectArchiveConfirmation
              projectWithTasks={projectWithTasks}
              choice={archiveChoice}
              onChoiceChange={setArchiveChoice}
              onCancel={() => handleArchiveOpenChange(false)}
              onConfirm={handleArchiveConfirm}
              isProcessing={archiveIsProcessing}
            />
          </DialogContent>
        </Dialog>
        <Button variant="ghost" size="sm" onClick={onSkip} className="gap-1.5 text-muted-foreground">
          <SkipForward className="h-3.5 w-3.5" />
          Skip
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">s</kbd>
        </Button>
        <Button variant="ghost" size="sm" onClick={onStop} className="gap-1.5 text-muted-foreground">
          <Square className="h-3.5 w-3.5" />
          Stop
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">esc</kbd>
        </Button>
      </div>
      {hasSubprojects && (
        <p className="text-xs text-amber-700 dark:text-amber-300" role="status">
          Project archive unavailable: {subprojectCount}{' '}
          {subprojectCount === 1 ? 'subproject must' : 'subprojects must'} be reviewed independently.
        </p>
      )}
    </div>
  )
}
