import { useReducer, useEffect, useCallback, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { PersonalProject, WorkspaceProject, Task } from '@doist/todoist-sdk'
import { getTodoistApi } from '~/lib/todoist'
import { getPreferences } from '~/lib/storage'
import { queryKeys } from '~/lib/query-keys'
import { canChangeTaskDueDate, canSkipTask } from '~/lib/task-decisions'
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
import { TodoistReadError } from '~/components/TodoistReadError'
import { useTodoistUser } from '~/lib/use-todoist-user'

type Project = PersonalProject | WorkspaceProject

export function ReviewPage() {
  const navigate = useNavigate()
  const prefs = getPreferences()
  const [state, dispatch] = useReducer(reviewReducer, initialState)
  const [started, setStarted] = useState(false)

  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
    isFetching: userFetching,
    refetch: refetchUser,
  } = useTodoistUser()

  const {
    data: projectsData,
    isLoading: projectsLoading,
    isError: projectsError,
    isFetching: projectsFetching,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const api = getTodoistApi()
      return api.getProjects()
    },
  })

  const {
    data: inboxData,
    isLoading: inboxLoading,
    isError: inboxError,
    isFetching: inboxFetching,
    refetch: refetchInbox,
  } = useQuery({
    queryKey: queryKeys.inboxTasks,
    queryFn: async () => {
      const api = getTodoistApi()
      return api.getTasksByFilter({ query: '#Inbox' })
    },
  })

  const {
    data: filterData,
    isLoading: filterLoading,
    isError: filterError,
    isFetching: filterFetching,
    refetch: refetchFilter,
  } = useQuery({
    queryKey: queryKeys.filterTasks(prefs.filterQuery),
    queryFn: async () => {
      const api = getTodoistApi()
      return api.getTasksByFilter({ query: prefs.filterQuery })
    },
  })

  const isLoading = userLoading || projectsLoading || inboxLoading || filterLoading
  const isReadError = userError || projectsError || inboxError || filterError

  const projects = (projectsData?.results ?? []) as Project[]
  const projectMap = new Map<string, Project>(projects.map((p) => [p.id, p]))

  useEffect(() => {
    if (!isLoading && !isReadError && !started && inboxData && filterData !== undefined) {
      const inboxTasks = inboxData.results ?? []
      const filterTasks = filterData.results ?? []
      dispatch({ type: 'START', inboxTasks, filterTasks })
      setStarted(true)
    }
  }, [isLoading, isReadError, started, inboxData, filterData])

  const moveTask = useMoveTask()
  const scheduleTask = useScheduleTask()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()
  const createProject = useCreateProject()

  const currentTask = getCurrentTask(state)
  const canSkip = currentTask ? canSkipTask(currentTask) : false
  const canChangeDueDate = currentTask ? canChangeTaskDueDate(currentTask) : false
  const claimedDecisions = useRef(new Set<string>())
  const claimTaskDecision = useCallback((taskId: string) => {
    const key = `${state.phase}:${taskId}`
    if (claimedDecisions.current.has(key)) return false
    claimedDecisions.current.add(key)
    return true
  }, [state.phase])

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
      if (!currentTask || !claimTaskDecision(currentTask.id)) return
      const labels = addNextActionLabel(currentTask)
      moveTask.mutate({ taskId: currentTask.id, projectId, labels })
      if (dueString) {
        scheduleTask.mutate({ taskId: currentTask.id, dueString })
      }
      dispatch({ type: 'INBOX_ACTION', taskId: currentTask.id, action: 'move_to_project' })
    },
    [currentTask, moveTask, scheduleTask, addNextActionLabel, claimTaskDecision],
  )

  const handleInboxMoveToSomeday = useCallback(() => {
    if (!currentTask || !prefs.somedayProjectId || !claimTaskDecision(currentTask.id)) return
    moveTask.mutate({ taskId: currentTask.id, projectId: prefs.somedayProjectId })
    dispatch({ type: 'INBOX_ACTION', taskId: currentTask.id, action: 'move_to_someday' })
  }, [currentTask, prefs.somedayProjectId, moveTask, claimTaskDecision])

  const handleInboxComplete = useCallback(() => {
    if (!currentTask || !claimTaskDecision(currentTask.id)) return
    completeTask.mutate(currentTask.id)
    dispatch({ type: 'INBOX_ACTION', taskId: currentTask.id, action: 'complete' })
  }, [currentTask, completeTask, claimTaskDecision])

  const handleInboxDelete = useCallback(() => {
    if (!currentTask || !claimTaskDecision(currentTask.id)) return
    deleteTask.mutate(currentTask.id)
    dispatch({ type: 'INBOX_ACTION', taskId: currentTask.id, action: 'delete' })
  }, [currentTask, deleteTask, claimTaskDecision])

  const handleInboxSkip = useCallback(() => {
    if (!currentTask || !claimTaskDecision(currentTask.id)) return
    dispatch({ type: 'INBOX_ACTION', taskId: currentTask.id, action: 'skip' })
  }, [currentTask, claimTaskDecision])

  const handleFilterSchedule = useCallback(
    (dueString: string) => {
      if (!currentTask || !canChangeTaskDueDate(currentTask) || !claimTaskDecision(currentTask.id)) return
      if (dueString === 'no date') {
        scheduleTask.mutate({ taskId: currentTask.id, dueString: null })
        dispatch({ type: 'FILTER_ACTION', taskId: currentTask.id, action: 'remove_date' })
      } else {
        scheduleTask.mutate({ taskId: currentTask.id, dueString })
        dispatch({ type: 'FILTER_ACTION', taskId: currentTask.id, action: 'schedule', dueString })
      }
    },
    [currentTask, scheduleTask, claimTaskDecision],
  )

  const handleFilterComplete = useCallback(() => {
    if (!currentTask || !claimTaskDecision(currentTask.id)) return
    completeTask.mutate(currentTask.id)
    dispatch({ type: 'FILTER_ACTION', taskId: currentTask.id, action: 'complete' })
  }, [currentTask, completeTask, claimTaskDecision])

  const handleFilterSkip = useCallback(() => {
    if (!currentTask || !claimTaskDecision(currentTask.id)) return
    dispatch({ type: 'FILTER_ACTION', taskId: currentTask.id, action: 'skip' })
  }, [currentTask, claimTaskDecision])

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
          if (!canSkip) break
          if (state.phase === 'inbox') handleInboxSkip()
          else handleFilterSkip()
          break
        case 'm':
          // handled by InboxActionBar internally
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
    canSkip,
    handleInboxComplete,
    handleInboxDelete,
    handleInboxSkip,
    handleFilterComplete,
    handleFilterSkip,
    handleFilterSchedule,
    handleStop,
  ])

  if (isReadError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <TodoistReadError
          onRetry={() => void Promise.all([refetchUser(), refetchProjects(), refetchInbox(), refetchFilter()])}
          isRetrying={userFetching || projectsFetching || inboxFetching || filterFetching}
        />
      </div>
    )
  }

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
          key={currentTask.id}
          projects={projects}
          task={currentTask}
          todoistTimezone={user?.tzInfo.timezone ?? 'UTC'}
          timeFormat={user?.timeFormat ?? 0}
          somedayProjectId={prefs.somedayProjectId}
          onMoveToProject={handleInboxMoveToProject}
          onMoveToSomeday={handleInboxMoveToSomeday}
          onComplete={handleInboxComplete}
          onDelete={handleInboxDelete}
          onSkip={handleInboxSkip}
          onStop={handleStop}
          onCreateProject={handleCreateProject}
          canSkip={canSkip}
        />
      ) : (
        <FilterActionBar
          onSchedule={handleFilterSchedule}
          onComplete={handleFilterComplete}
          onSkip={handleFilterSkip}
          onStop={handleStop}
          isRecurring={canSkip}
          canChangeDueDate={canChangeDueDate}
        />
      )}
    </div>
  )
}
