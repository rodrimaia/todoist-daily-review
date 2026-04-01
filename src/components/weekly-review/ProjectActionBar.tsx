import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Check, Plus, Trash2, SkipForward, Square } from 'lucide-react'
import type { ProjectWithTasks } from '~/lib/weekly-review-machine'

export function ProjectActionBar({
  projectWithTasks,
  onOk,
  onAddTask,
  onDeleteProject,
  onSkip,
  onStop,
}: {
  projectWithTasks: ProjectWithTasks
  onOk: () => void
  onAddTask: (content: string) => void
  onDeleteProject: () => void
  onSkip: () => void
  onStop: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [taskContent, setTaskContent] = useState('')
  const isEmpty = projectWithTasks.tasks.length === 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!taskContent.trim()) return
    onAddTask(taskContent.trim())
    setTaskContent('')
    setAdding(false)
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
    </div>
  )
}
