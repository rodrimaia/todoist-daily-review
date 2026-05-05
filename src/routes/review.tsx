import { useReducer, useEffect, useCallback, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { PersonalProject, WorkspaceProject, Task } from '@doist/todoist-sdk'
import { getTodoistApi } from '~/lib/todoist'
import { getPreferences, getToken } from '~/lib/storage'
import { queryKeys } from '~/lib/query-keys'
import {
  reviewReducer,
  initialState,
  getCurrentTask,
  type ReviewState,
} from '~/lib/review-machine'
import {
  useMoveTask,
  useScheduleTask,
  useCompleteTask,
  useDeleteTask,
  useCreateProject,
} from '~/lib/mutations'
import { TaskCard } from '~/components/TaskCard'
import { InboxActionBar } from '~/components/InboxActionBar'
import { FilterActionBar } from '~/components/FilterActionBar'
import { ReviewProgress } from '~/components/ReviewProgress'
import { ReviewSummary } from '~/components/ReviewSummary'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/review')({
  ssr: false,
  component: ReviewPage,
})

type Project = PersonalProject | WorkspaceProject

function ReviewPage() {
  const navigate = useNavigate()
  const prefs = getPreferences()
  const [state, dispatch] = useReducer(reviewReducer, initialState)
  const [started, setStarted] = useState(false)

  if (!getToken()) {
    navigate({ to: '/' })
    return null
  }

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const api = getTodoistApi()
      return api.getProjects()
    },
  })

  const { data: inboxData, isLoading: inboxLoading } = useQuery({
    queryKey: queryKeys.inboxTasks,
    queryFn: async () => {
      const api = getTodoistApi()
      return api.getTasksByFilter({ query: '#Inbox' })
    },
  })

  const { data: filterData, isLoading: filterLoading } = useQuery({
    queryKey: queryKeys.filterTasks(prefs.filterQuery),
    queryFn: async () => {
      const api = getTodoistApi()
      return api.getTasksByFilter({ query: prefs.filterQuery })
    },
  })

  const isLoading = projectsLoading || inboxLoading || filterLoading

  const projects = (projectsData?.results ?? []) as Project[]
  const projectMap = new Map<string, Project>(projects.map((p) => [p.id, p]))

  useEffect(() => {
    if (!isLoading && !started && inboxData && filterData !== undefined) {
      const inboxTasks = inboxData.results ?? []
      const filterTasks = filterData.results ?? []
      dispatch({ type: 'START', inboxTasks, filterTasks })
      setStarted(true)
    }
  }, [isLoading, started, inboxData, filterData])

  const moveTask = useMoveTask()
  const scheduleTask = useScheduleTask()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()
  const createProject = useCreateProject()

  const currentTask = getCurrentTask(state)

  const addNextActionLabel = useCallback(
    (task: Task): string[] => {
      const labels = new Set(task.labels)
      labels.add('next_action')
      return Array.from(labels)
    },
    [],
  )

  const handleInboxMoveToProject = useCallback(
    (projectId: string, dueString?: string) => {
      if (!currentTask) return
      const labels = addNextActionLabel(currentTask)
      moveTask.mutate({ taskId: currentTask.id, projectId, labels })
      if (dueString) {
        scheduleTask.mutate({ taskId: currentTask.id, dueString })
      }
      dispatch({ type: 'INBOX_ACTION', action: 'move_to_project' })
    },
    [currentTask, moveTask, scheduleTask, addNextActionLabel],
  )

  const handleInboxMoveToSomeday = useCallback(() => {
    if (!currentTask || !prefs.somedayProjectId) return
    moveTask.mutate({ taskId: currentTask.id, projectId: prefs.somedayProjectId })
    dispatch({ type: 'INBOX_ACTION', action: 'move_to_someday' })
  }, [currentTask, prefs.somedayProjectId, moveTask])

  const handleInboxSchedule = useCallback(
    (dueString: string) => {
      if (!currentTask) return
      const labels = addNextActionLabel(currentTask)
      scheduleTask.mutate({ taskId: currentTask.id, dueString, labels })
      dispatch({ type: 'INBOX_ACTION', action: 'schedule', dueString })
    },
    [currentTask, scheduleTask, addNextActionLabel],
  )

  const handleInboxComplete = useCallback(() => {
    if (!currentTask) return
    completeTask.mutate(currentTask.id)
    dispatch({ type: 'INBOX_ACTION', action: 'complete' })
  }, [currentTask, completeTask])

  const handleInboxDelete = useCallback(() => {
    if (!currentTask) return
    deleteTask.mutate(currentTask.id)
    dispatch({ type: 'INBOX_ACTION', action: 'delete' })
  }, [currentTask, deleteTask])

  const handleInboxSkip = useCallback(() => {
    dispatch({ type: 'INBOX_ACTION', action: 'skip' })
  }, [])

  const handleFilterSchedule = useCallback(
    (dueString: string) => {
      if (!currentTask) return
      if (dueString === 'no date') {
        scheduleTask.mutate({ taskId: currentTask.id, dueString: null })
        dispatch({ type: 'FILTER_ACTION', action: 'remove_date' })
      } else {
        scheduleTask.mutate({ taskId: currentTask.id, dueString })
        dispatch({ type: 'FILTER_ACTION', action: 'schedule', dueString })
      }
    },
    [currentTask, scheduleTask],
  )

  const handleFilterComplete = useCallback(() => {
    if (!currentTask) return
    completeTask.mutate(currentTask.id)
    dispatch({ type: 'FILTER_ACTION', action: 'complete' })
  }, [currentTask, completeTask])

  const handleFilterSkip = useCallback(() => {
    dispatch({ type: 'FILTER_ACTION', action: 'skip' })
  }, [])

  const handleStop = useCallback(() => {
    dispatch({ type: 'STOP' })
  }, [])

  const handleCreateProject = useCallback(
    async (name: string): Promise<Project> => {
      const project = await createProject.mutateAsync(name)
      return project as Project
    },
    [createProject],
  )

  // Keyboard shortcuts
  useEffect(() => {
    if (state.phase === 'summary') return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'c':
          if (state.phase === 'inbox') handleInboxComplete()
          else handleFilterComplete()
          break
        case 'd':
          if (state.phase === 'inbox') handleInboxDelete()
          break
        case 's':
          if (state.phase === 'inbox') handleInboxSkip()
          else handleFilterSkip()
          break
        case 'm':
          // handled by InboxActionBar internally
          break
        case '1':
          if (state.phase === 'filter' && !currentTask?.due?.isRecurring) handleFilterSchedule('today')
          break
        case '2':
          if (state.phase === 'filter' && !currentTask?.due?.isRecurring) handleFilterSchedule('tomorrow')
          break
        case '3':
          if (state.phase === 'filter' && !currentTask?.due?.isRecurring) handleFilterSchedule('saturday')
          break
        case '4':
          if (state.phase === 'filter' && !currentTask?.due?.isRecurring) handleFilterSchedule('monday')
          break
        case '0':
          if (state.phase === 'filter' && !currentTask?.due?.isRecurring) handleFilterSchedule('no date')
          break
        case 'Escape':
          handleStop()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    state.phase,
    handleInboxComplete,
    handleInboxDelete,
    handleInboxSkip,
    handleInboxSchedule,
    handleFilterComplete,
    handleFilterSkip,
    handleFilterSchedule,
    handleStop,
  ])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (state.phase === 'summary') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <ReviewSummary
          inboxStats={state.inboxStats}
          filterStats={state.filterStats}
          onDone={() => navigate({ to: '/' })}
        />
      </div>
    )
  }

  if (!currentTask) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No tasks to review</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      <ReviewProgress state={state} />

      <TaskCard
        task={currentTask}
        projectMap={projectMap}
        animationKey={`${state.phase}-${state.currentIndex}`}
      />

      {state.phase === 'inbox' ? (
        <InboxActionBar
          task={currentTask}
          projects={projects}
          somedayProjectId={prefs.somedayProjectId}
          onMoveToProject={handleInboxMoveToProject}
          onMoveToSomeday={handleInboxMoveToSomeday}
          onComplete={handleInboxComplete}
          onDelete={handleInboxDelete}
          onSkip={handleInboxSkip}
          onStop={handleStop}
          onCreateProject={handleCreateProject}
        />
      ) : (
        <FilterActionBar
          onSchedule={handleFilterSchedule}
          onComplete={handleFilterComplete}
          onSkip={handleFilterSkip}
          onStop={handleStop}
          isRecurring={currentTask?.due?.isRecurring}
        />
      )}
    </div>
  )
}
