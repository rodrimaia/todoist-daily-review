import { useState, useEffect, useRef } from 'react'
import type { PersonalProject, WorkspaceProject } from '@doist/todoist-sdk'
import { Button } from '~/components/ui/button'
import { DatePicker } from './DatePicker'
import { ProjectPicker } from './ProjectPicker'
import { Input } from '~/components/ui/input'
import {
  Lightbulb,
  Check,
  Trash2,
  SkipForward,
  Square,
  ArrowLeft,
} from 'lucide-react'

type Project = PersonalProject | WorkspaceProject

type Step = 'pick-project' | 'pick-date' | 'new-project'

export function InboxActionBar({
  projects,
  somedayProjectId,
  onMoveToProject: onMove,
  onMoveToSomeday: onSomeday,
  onComplete,
  onDelete,
  onSkip,
  onStop,
  onCreateProject,
}: {
  projects: Project[]
  somedayProjectId: string | null
  onMoveToProject: (projectId: string, dueString?: string) => void
  onMoveToSomeday: () => void
  onComplete: () => void
  onDelete: () => void
  onSkip: () => void
  onStop: () => void
  onCreateProject: (name: string) => Promise<Project>
}) {
  const [step, setStep] = useState<Step>('pick-project')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleProjectSelect(project: Project) {
    setSelectedProjectId(project.id)
    setStep('pick-date')
  }

  async function handleCreateNew(name: string) {
    const project = await onCreateProject(name)
    setSelectedProjectId(project.id)
    setStep('pick-date')
  }

  function handleNewProject() {
    setStep('new-project')
    setProjectName('')
  }

  useEffect(() => {
    if (step === 'new-project' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [step])

  async function handleConfirmNewProject() {
    const name = projectName.trim()
    if (!name) return
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
    setStep('pick-project')
    setSelectedProjectId(null)
    setProjectName('')
  }

  if (step === 'pick-date') {
    return (
      <div className="w-full max-w-md space-y-2">
        <p className="text-sm text-muted-foreground">Schedule:</p>
        <DatePicker onSelect={handleDateAfterMove} />
      </div>
    )
  }

  if (step === 'new-project') {
    return (
      <div className="w-full max-w-md space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={resetStep} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-medium">New Project</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleConfirmNewProject()
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name..."
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === 'Escape') resetStep()
            }}
          />
          <Button type="submit" size="sm" disabled={!projectName.trim()} className="h-9">
            Create
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-3">
      <ProjectPicker
        projects={projects}
        onSelect={handleProjectSelect}
        onCreateNew={handleCreateNew}
        onNewProject={handleNewProject}
        onCancel={() => {}}
      />
      <div className="flex flex-wrap gap-2">
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
    </div>
  )
}
