import { useState } from 'react'
import type { Task, PersonalProject, WorkspaceProject } from '@doist/todoist-api-typescript'
import { Button } from '~/components/ui/button'
import { DatePicker } from './DatePicker'
import { ProjectPicker } from './ProjectPicker'
import {
  FolderOpen,
  Lightbulb,
  Check,
  Trash2,
  SkipForward,
  Square,
} from 'lucide-react'

type Project = PersonalProject | WorkspaceProject

type Step = 'actions' | 'pick-project' | 'pick-date'

export function InboxActionBar({
  task,
  projects,
  somedayProjectId,
  onMoveToProject: onMove,
  onMoveToSomeday: onSomeday,
  onSchedule,
  onComplete,
  onDelete,
  onSkip,
  onStop,
  onCreateProject,
}: {
  task: Task
  projects: Project[]
  somedayProjectId: string | null
  onMoveToProject: (projectId: string, dueString?: string) => void
  onMoveToSomeday: () => void
  onSchedule: (dueString: string) => void
  onComplete: () => void
  onDelete: () => void
  onSkip: () => void
  onStop: () => void
  onCreateProject: (name: string) => Promise<Project>
}) {
  const [step, setStep] = useState<Step>('actions')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  function handleProjectSelect(project: Project) {
    setSelectedProjectId(project.id)
    setStep('pick-date')
  }

  async function handleCreateNew(name: string) {
    const project = await onCreateProject(name)
    setSelectedProjectId(project.id)
    setStep('pick-date')
  }

  function handleDateAfterMove(dueString: string) {
    if (selectedProjectId) {
      onMove(selectedProjectId, dueString === 'no date' ? undefined : dueString)
    }
    resetStep()
  }

  function resetStep() {
    setStep('actions')
    setSelectedProjectId(null)
  }

  if (step === 'pick-project') {
    return (
      <div className="w-full max-w-md space-y-2">
        <ProjectPicker
          projects={projects}
          onSelect={handleProjectSelect}
          onCreateNew={handleCreateNew}
          onCancel={resetStep}
        />
      </div>
    )
  }

  if (step === 'pick-date') {
    return (
      <div className="w-full max-w-md space-y-2">
        <p className="text-sm text-muted-foreground">Schedule:</p>
        <DatePicker onSelect={handleDateAfterMove} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep('pick-project')}
          className="gap-1.5"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Move
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">m</kbd>
        </Button>
        {somedayProjectId && (
          <Button variant="outline" size="sm" onClick={onSomeday} className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Someday
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onComplete} className="gap-1.5">
          <Check className="h-3.5 w-3.5" />
          Done
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">c</kbd>
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
          Delete
          <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 rounded">d</kbd>
        </Button>
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
      <div>
        <p className="text-sm text-muted-foreground mb-2">Quick schedule:</p>
        <DatePicker onSelect={onSchedule} />
      </div>
    </div>
  )
}
