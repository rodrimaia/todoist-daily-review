import { useReducer, useEffect, useCallback, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { PersonalProject, WorkspaceProject, Task } from '@doist/todoist-sdk'
import { getTodoistApi } from '~/lib/todoist'
import { getPreferences } from '~/lib/storage'
import { queryKeys } from '~/lib/query-keys'
import { canChangeTaskDueDate, canSkipTask, getReviewTrackingTaskInvalidReason, isEligibleTrackingOccurrence } from '~/lib/task-decisions'
import { getTodoistReadFailureMessage } from '~/lib/review-tracking-task'
import {
  weeklyReviewReducer,
  weeklyInitialState,
  getWeeklyCurrentTask,
  getWeeklyCurrentProject,
  type WeeklyReviewState,
  type ProjectWithTasks,
} from '~/lib/weekly-review-machine'
import {
  useMoveTask,
  useScheduleTask,
  useCompleteTask,
  useDeleteTask,
  useCreateProject,
  useAddTask,
  useDeleteProject,
} from '~/lib/mutations'
import { TaskCard } from '~/components/TaskCard'
import { InboxActionBar } from '~/components/InboxActionBar'
import { UpcomingReviewCard } from '~/components/weekly-review/UpcomingReviewCard'
import { ProjectReviewCard } from '~/components/weekly-review/ProjectReviewCard'
import { ProjectActionBar } from '~/components/weekly-review/ProjectActionBar'
import { SomedayReviewCard } from '~/components/weekly-review/SomedayReviewCard'
import { WeeklyReviewSummary } from '~/components/weekly-review/WeeklyReviewSummary'
import { TodoistReadError } from '~/components/TodoistReadError'
import { useTodoistUser } from '~/lib/use-todoist-user'
import { WeeklyReviewFrame } from '~/components/weekly-review/WeeklyReviewFrame'
import { PaperMessage, PaperPage, WeeklyReviewSkeleton } from '~/components/PaperPage'
import { isEligibleReviewShortcut } from '~/lib/review-shortcuts'

type Project = PersonalProject | WorkspaceProject

export function WeeklyReviewPage() {
  const navigate = useNavigate()
  const prefs = getPreferences()
  const reviewTrackingTaskId = prefs.reviewTrackingTaskId
  const [state, dispatch] = useReducer(weeklyReviewReducer, weeklyInitialState)
  const [started, setStarted] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [trackingFailure, setTrackingFailure] = useState<string | null>(null)

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
    data: upcomingData,
    isLoading: upcomingLoading,
    isError: upcomingError,
    isFetching: upcomingFetching,
    refetch: refetchUpcoming,
  } = useQuery({
    queryKey: queryKeys.upcomingTasks,
    queryFn: async () => {
      const api = getTodoistApi()
      return api.getTasksByFilter({ query: 'overdue | 7 days' })
    },
  })

  const projects = (projectsData?.results ?? []) as Project[]
  const projectMap = new Map<string, Project>(projects.map((p) => [p.id, p]))

  // Find the Inbox project to exclude from project review
  const inboxProject = projects.find(
    (p) => 'inboxProject' in p && (p as any).inboxProject,
  )
  const inboxProjectId = inboxProject?.id
  const somedayProjectId = prefs.somedayProjectId

  // Parse exclude prefixes from settings
  const excludePrefixes = prefs.excludeProjectPrefixes
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const reviewableProjects = projects.filter((p) => {
    if (p.id === inboxProjectId || p.id === somedayProjectId) return false
    if (excludePrefixes.length > 0) {
      const name = p.name.toLowerCase()
      if (excludePrefixes.some((prefix) => name.startsWith(prefix))) return false
    }
    return true
  })

  // Single query to fetch all tasks, paginated
  const {
    data: allTasksData,
    isLoading: allTasksLoading,
    isError: allTasksError,
    isFetching: allTasksFetching,
    refetch: refetchAllTasks,
  } = useQuery({
    queryKey: queryKeys.allTasks,
    queryFn: async () => {
      const api = getTodoistApi()
      const all: Task[] = []
      let cursor: string | undefined
      while (true) {
        const data = await api.getTasks(cursor ? { cursor } : undefined)
        all.push(...(data.results ?? []))
        if (!data.nextCursor) break
        cursor = data.nextCursor
      }
      return all
    },
  })

  const isLoading = userLoading || projectsLoading || inboxLoading || upcomingLoading || allTasksLoading
  const isReadError = userError || projectsError || inboxError || upcomingError || allTasksError

  useEffect(() => {
    if (!isLoading && !isReadError && !started && inboxData && allTasksData) {
      const excludeTaskId = reviewTrackingTaskId

      const inboxTasks = (inboxData.results ?? []).filter(
        (t) => !excludeTaskId || t.id !== excludeTaskId,
      )
      const upcomingTasks = (upcomingData?.results ?? []).filter(
        (t) => !excludeTaskId || t.id !== excludeTaskId,
      )

      // Group all tasks by projectId
      const tasksByProject = new Map<string, Task[]>()
      for (const task of allTasksData) {
        if (excludeTaskId && task.id === excludeTaskId) continue
        const list = tasksByProject.get(task.projectId) ?? []
        list.push(task)
        tasksByProject.set(task.projectId, list)
      }

      // Build project review list from reviewable projects.
      // Exclude the tracking task from each project's task list before
      // calculating hasNextAction.
      const projectsWithTasks: ProjectWithTasks[] = reviewableProjects.map((project) => {
        const tasks = tasksByProject.get(project.id) ?? []
        const hasNextAction = tasks.some((t) => t.labels.includes('next_action'))
        return { project, tasks, hasNextAction }
      })

      // Someday tasks from the someday project
      const somedayTasks = somedayProjectId
        ? (tasksByProject.get(somedayProjectId) ?? []).filter(
            (t) => !excludeTaskId || t.id !== excludeTaskId,
          )
        : []

      dispatch({
        type: 'START',
        inboxTasks,
        projects: projectsWithTasks,
        somedayTasks,
        upcomingTasks,
      })
      setStarted(true)
    }
  }, [isLoading, isReadError, started, inboxData, allTasksData, upcomingData])

  const moveTask = useMoveTask()
  const scheduleTask = useScheduleTask()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()
  const createProject = useCreateProject()
  const addTask = useAddTask()
  const deleteProject = useDeleteProject()

  const currentTask = getWeeklyCurrentTask(state)
  const currentProject = getWeeklyCurrentProject(state)
  const canSkipInboxTask = currentTask ? canSkipTask(currentTask) : false
  const claimedInboxTasks = useRef(new Set<string>())
  const claimInboxTask = useCallback((taskId: string) => {
    if (claimedInboxTasks.current.has(taskId)) return false
    claimedInboxTasks.current.add(taskId)
    return true
  }, [])

  const addNextActionLabel = useCallback((task: Task): string[] => {
    const labels = new Set(task.labels)
    labels.add('next_action')
    return Array.from(labels)
  }, [])

  // Inbox handlers (same as daily review)
  const handleInboxMoveToProject = useCallback(
    (projectId: string, dueString?: string) => {
      if (!currentTask || !claimInboxTask(currentTask.id)) return
      const labels = addNextActionLabel(currentTask)
      moveTask.mutate({ taskId: currentTask.id, projectId, labels })
      if (dueString) {
        scheduleTask.mutate({ taskId: currentTask.id, dueString })
      }
      dispatch({ type: 'INBOX_ACTION', taskId: currentTask.id, action: 'move_to_project' })
    },
    [currentTask, moveTask, scheduleTask, addNextActionLabel, claimInboxTask],
  )

  const handleInboxMoveToSomeday = useCallback(() => {
    if (!currentTask || !prefs.somedayProjectId || !claimInboxTask(currentTask.id)) return
    moveTask.mutate({ taskId: currentTask.id, projectId: prefs.somedayProjectId })
    dispatch({ type: 'INBOX_ACTION', taskId: currentTask.id, action: 'move_to_someday' })
  }, [currentTask, prefs.somedayProjectId, moveTask, claimInboxTask])

  const handleInboxComplete = useCallback(() => {
    if (!currentTask || !claimInboxTask(currentTask.id)) return
    completeTask.mutate(currentTask.id)
    dispatch({ type: 'INBOX_ACTION', taskId: currentTask.id, action: 'complete' })
  }, [currentTask, completeTask, claimInboxTask])

  const handleInboxDelete = useCallback(() => {
    if (!currentTask || !claimInboxTask(currentTask.id)) return
    deleteTask.mutate(currentTask.id)
    dispatch({ type: 'INBOX_ACTION', taskId: currentTask.id, action: 'delete' })
  }, [currentTask, deleteTask, claimInboxTask])

  const handleInboxSkip = useCallback(() => {
    if (!currentTask || !canSkipTask(currentTask) || !claimInboxTask(currentTask.id)) return
    dispatch({ type: 'INBOX_ACTION', taskId: currentTask.id, action: 'skip' })
  }, [currentTask, claimInboxTask])

  // Project handlers
  const handleProjectOk = useCallback(() => {
    dispatch({ type: 'PROJECT_ACTION', action: 'ok' })
  }, [])

  const handleProjectAddTask = useCallback(
    (content: string) => {
      if (!currentProject) return
      addTask.mutate({
        content,
        projectId: currentProject.project.id,
        labels: ['next_action'],
      })
      dispatch({ type: 'PROJECT_ACTION', action: 'added_task' })
    },
    [currentProject, addTask],
  )

  const handleProjectDelete = useCallback(() => {
    if (!currentProject) return
    deleteProject.mutate(currentProject.project.id)
    dispatch({ type: 'PROJECT_ACTION', action: 'deleted_project' })
  }, [currentProject, deleteProject])

  const handleProjectSkip = useCallback(() => {
    dispatch({ type: 'PROJECT_ACTION', action: 'skip' })
  }, [])

  // Someday handlers
  const handleSomedayActivate = useCallback(
    (taskId: string) => {
      moveTask.mutate({ taskId, projectId: inboxProjectId ?? '' })
    },
    [moveTask, inboxProjectId],
  )

  const handleSomedayDelete = useCallback(
    (taskId: string) => {
      deleteTask.mutate(taskId)
    },
    [deleteTask],
  )

  const handleSomedayDone = useCallback(
    (stats: import('~/lib/weekly-review-machine').SomedayStats) => {
      dispatch({ type: 'SOMEDAY_DONE', stats })
    },
    [],
  )

  // Upcoming handlers (batch/list view)
  const handleUpcomingReschedule = useCallback(
    (task: Task, dueString: string) => {
      if (!canChangeTaskDueDate(task)) return
      scheduleTask.mutate({ taskId: task.id, dueString })
    },
    [scheduleTask],
  )

  const handleUpcomingComplete = useCallback(
    (taskId: string) => {
      completeTask.mutate(taskId)
    },
    [completeTask],
  )

  const handleUpcomingRemoveDate = useCallback(
    (task: Task) => {
      if (!canChangeTaskDueDate(task)) return
      scheduleTask.mutate({ taskId: task.id, dueString: null })
    },
    [scheduleTask],
  )

  const handleUpcomingDone = useCallback(
    (stats: import('~/lib/weekly-review-machine').UpcomingStats) => {
      dispatch({ type: 'UPCOMING_DONE', stats })
    },
    [],
  )

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
      if (!isEligibleReviewShortcut(e)) return

      if (e.key === 'Escape') {
        handleStop()
        return
      }

      switch (state.phase) {
        case 'inbox':
          switch (e.key) {
            case 'c': handleInboxComplete(); break
            case 'd': handleInboxDelete(); break
            case 's': if (canSkipInboxTask) handleInboxSkip(); break
          }
          break
        case 'projects':
          switch (e.key) {
            case 'o': handleProjectOk(); break
            case 'a': /* handled by ProjectActionBar */ break
            case 'd': handleProjectDelete(); break
            case 's': handleProjectSkip(); break
          }
          break
        // upcoming phase uses inline actions in UpcomingReviewCard
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    state.phase,
    canSkipInboxTask,
    handleInboxComplete,
    handleInboxDelete,
    handleInboxSkip,
    handleProjectOk,
    handleProjectAddTask,
    handleProjectDelete,
    handleProjectSkip,
    handleStop,
  ])

  if (isReadError) {
    return (
      <PaperPage className="grid place-items-center">
        <TodoistReadError
          onRetry={() => void Promise.all([
            refetchUser(),
            refetchProjects(),
            refetchInbox(),
            refetchUpcoming(),
            refetchAllTasks(),
          ])}
          isRetrying={
            userFetching || projectsFetching || inboxFetching || upcomingFetching || allTasksFetching
          }
        />
      </PaperPage>
    )
  }

  if (isLoading) {
    return <WeeklyReviewSkeleton />
  }

  if (state.phase === 'summary') {
    const trackingTaskId = reviewTrackingTaskId
    const reviewDay = user
      ? new Date().toLocaleDateString('en-CA', { timeZone: user.tzInfo.timezone })
      : new Date().toISOString().slice(0, 10)

    const handleDone = async () => {
      if (!state.completedNaturally || !trackingTaskId) {
        navigate({ to: '/' })
        return
      }

      setIsTracking(true)
      setTrackingFailure(null)
      let taskValidated = false
      try {
        const task = await getTodoistApi().getTask(trackingTaskId)
        const invalidReason = getReviewTrackingTaskInvalidReason(task)
        if (invalidReason) {
          setTrackingFailure(invalidReason)
          return
        }
        taskValidated = true
        if (isEligibleTrackingOccurrence(task, reviewDay)) {
          await completeTask.mutateAsync(trackingTaskId)
        }
        navigate({ to: '/' })
      } catch (error) {
        setTrackingFailure(taskValidated
          ? 'Could not complete the Review tracking task. Please retry.'
          : getTodoistReadFailureMessage(error))
      } finally {
        setIsTracking(false)
      }
    }

    const handleFinishWithoutTracking = () => {
      navigate({ to: '/' })
    }

    return (
      <PaperPage className="grid place-items-center">
        <WeeklyReviewSummary
          inboxStats={state.inboxStats}
          projectStats={state.projectStats}
          somedayStats={state.somedayStats}
          upcomingStats={state.upcomingStats}
          onDone={handleDone}
          isProcessing={isTracking}
          trackingFailure={trackingFailure}
          onFinishWithoutTracking={handleFinishWithoutTracking}
        />
      </PaperPage>
    )
  }

  if (state.phase === 'projects' && currentProject) {
    return (
      <WeeklyReviewFrame state={state}>
        <ProjectReviewCard
          projectWithTasks={currentProject}
          animationKey={`projects-${state.projectIndex}`}
        />
        <div className="w-full max-w-2xl [&>div]:max-w-none">
          <ProjectActionBar
            projectWithTasks={currentProject}
            onOk={handleProjectOk}
            onAddTask={handleProjectAddTask}
            onDeleteProject={handleProjectDelete}
            onSkip={handleProjectSkip}
            onStop={handleStop}
          />
        </div>
      </WeeklyReviewFrame>
    )
  }

  if (state.phase === 'someday') {
    return (
      <WeeklyReviewFrame state={state}>
        <SomedayReviewCard
          tasks={state.somedayTasks}
          onActivate={handleSomedayActivate}
          onDelete={handleSomedayDelete}
          onDone={handleSomedayDone}
          onStop={handleStop}
        />
      </WeeklyReviewFrame>
    )
  }

  if (state.phase === 'upcoming') {
    return (
      <WeeklyReviewFrame state={state}>
        <UpcomingReviewCard
          tasks={state.upcomingTasks}
          projectMap={projectMap}
          onReschedule={handleUpcomingReschedule}
          onComplete={handleUpcomingComplete}
          onRemoveDate={handleUpcomingRemoveDate}
          onDone={handleUpcomingDone}
          onStop={handleStop}
        />
      </WeeklyReviewFrame>
    )
  }

  if (!currentTask) {
    return <PaperMessage eyebrow="Weekly review" title="Nothing is waiting here." />
  }

  return (
    <WeeklyReviewFrame state={state}>
      <TaskCard
        task={currentTask}
        projectMap={projectMap}
        animationKey={`inbox-${state.inboxIndex}`}
      />

      <div className="w-full max-w-2xl [&>div]:max-w-none">
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
          canSkip={canSkipInboxTask}
          isCreatingProject={createProject.isPending}
        />
      </div>
    </WeeklyReviewFrame>
  )
}
