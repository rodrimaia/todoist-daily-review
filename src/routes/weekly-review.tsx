import { useReducer, useEffect, useCallback, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { PersonalProject, WorkspaceProject, Task } from '@doist/todoist-sdk'
import { getTodoistApi } from '~/lib/todoist'
import { getPreferences, getToken } from '~/lib/storage'
import { queryKeys } from '~/lib/query-keys'
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
import { WeeklyReviewProgress } from '~/components/weekly-review/WeeklyReviewProgress'
import { WeeklyReviewSummary } from '~/components/weekly-review/WeeklyReviewSummary'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/weekly-review')({
  ssr: false,
  component: WeeklyReviewPage,
})

type Project = PersonalProject | WorkspaceProject

function WeeklyReviewPage() {
  const navigate = useNavigate()
  const prefs = getPreferences()
  const [state, dispatch] = useReducer(weeklyReviewReducer, weeklyInitialState)
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

  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
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
  const { data: allTasksData, isLoading: allTasksLoading } = useQuery({
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

  const isLoading = projectsLoading || inboxLoading || upcomingLoading || allTasksLoading

  useEffect(() => {
    if (!isLoading && !started && inboxData && allTasksData) {
      const inboxTasks = inboxData.results ?? []
      const upcomingTasks = upcomingData?.results ?? []

      // Group all tasks by projectId
      const tasksByProject = new Map<string, Task[]>()
      for (const task of allTasksData) {
        const list = tasksByProject.get(task.projectId) ?? []
        list.push(task)
        tasksByProject.set(task.projectId, list)
      }

      // Build project review list from reviewable projects
      const projectsWithTasks: ProjectWithTasks[] = reviewableProjects.map((project) => {
        const tasks = tasksByProject.get(project.id) ?? []
        const hasNextAction = tasks.some((t) => t.labels.includes('next_action'))
        return { project, tasks, hasNextAction }
      })

      // Someday tasks from the someday project
      const somedayTasks = somedayProjectId
        ? tasksByProject.get(somedayProjectId) ?? []
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
  }, [isLoading, started, inboxData, allTasksData, upcomingData])

  const moveTask = useMoveTask()
  const scheduleTask = useScheduleTask()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()
  const createProject = useCreateProject()
  const addTask = useAddTask()
  const deleteProject = useDeleteProject()

  const currentTask = getWeeklyCurrentTask(state)
  const currentProject = getWeeklyCurrentProject(state)

  const addNextActionLabel = useCallback((task: Task): string[] => {
    const labels = new Set(task.labels)
    labels.add('next_action')
    return Array.from(labels)
  }, [])

  // Inbox handlers (same as daily review)
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
    (taskId: string, dueString: string) => {
      scheduleTask.mutate({ taskId, dueString })
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
    (taskId: string) => {
      scheduleTask.mutate({ taskId, dueString: null })
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Escape') {
        handleStop()
        return
      }

      switch (state.phase) {
        case 'inbox':
          switch (e.key) {
            case 'c': handleInboxComplete(); break
            case 'd': handleInboxDelete(); break
            case 's': handleInboxSkip(); break
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
    handleInboxComplete,
    handleInboxDelete,
    handleInboxSkip,
    handleProjectOk,
    handleProjectAddTask,
    handleProjectDelete,
    handleProjectSkip,
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
        <WeeklyReviewSummary
          inboxStats={state.inboxStats}
          projectStats={state.projectStats}
          somedayStats={state.somedayStats}
          upcomingStats={state.upcomingStats}
          onDone={() => navigate({ to: '/' })}
        />
      </div>
    )
  }

  if (state.phase === 'projects' && currentProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
        <WeeklyReviewProgress state={state} />
        <ProjectReviewCard
          projectWithTasks={currentProject}
          animationKey={`projects-${state.projectIndex}`}
        />
        <ProjectActionBar
          projectWithTasks={currentProject}
          onOk={handleProjectOk}
          onAddTask={handleProjectAddTask}
          onDeleteProject={handleProjectDelete}
          onSkip={handleProjectSkip}
          onStop={handleStop}
        />
      </div>
    )
  }

  if (state.phase === 'someday') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
        <SomedayReviewCard
          tasks={state.somedayTasks}
          onActivate={handleSomedayActivate}
          onDelete={handleSomedayDelete}
          onDone={handleSomedayDone}
          onStop={handleStop}
        />
      </div>
    )
  }

  if (state.phase === 'upcoming') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
        <UpcomingReviewCard
          tasks={state.upcomingTasks}
          projectMap={projectMap}
          onReschedule={handleUpcomingReschedule}
          onComplete={handleUpcomingComplete}
          onRemoveDate={handleUpcomingRemoveDate}
          onDone={handleUpcomingDone}
          onStop={handleStop}
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
      <WeeklyReviewProgress state={state} />

      <TaskCard
        task={currentTask}
        projectMap={projectMap}
        animationKey={`inbox-${state.inboxIndex}`}
      />

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

    </div>
  )
}
