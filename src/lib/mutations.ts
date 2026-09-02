import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getTodoistApi } from './todoist'
import { invalidateTodoistCache } from './todoist-cache'
import { queryKeys } from './query-keys'
import {
  archiveProjectWithTaskDisposition,
  type ProjectArchiveApi,
  type ProjectArchiveInput,
  type ProjectArchiveResult,
} from './project-archive'

function useInvalidateTodoistCache(queryKey: readonly unknown[]) {
  const queryClient = useQueryClient()
  return () => {
    void invalidateTodoistCache(queryClient, queryKey)
  }
}

export function useMoveTask() {
  const invalidateTasks = useInvalidateTodoistCache(queryKeys.tasks)
  return useMutation({
    mutationFn: async ({
      taskId,
      projectId,
      labels,
    }: {
      taskId: string
      projectId: string
      labels?: string[]
    }) => {
      const api = getTodoistApi()
      await api.moveTask(taskId, { projectId })
      // A move is already committed even if the follow-up label update fails.
      invalidateTasks()
      if (labels) {
        await api.updateTask(taskId, { labels })
      }
    },
    onSuccess: (_data, { labels }) => {
      // Refresh again after a successful follow-up so the labels are current.
      if (labels) invalidateTasks()
    },
  })
}

export function useScheduleTask() {
  const invalidateTasks = useInvalidateTodoistCache(queryKeys.tasks)
  return useMutation({
    mutationFn: async ({
      taskId,
      dueString,
      labels,
    }: {
      taskId: string
      dueString: string | null
      labels?: string[]
    }) => {
      const api = getTodoistApi()
      await api.updateTask(taskId, {
        dueString: dueString ?? 'no date',
        ...(labels ? { labels } : {}),
      })
    },
    onSuccess: invalidateTasks,
  })
}

export async function runRenameTaskMutation(taskId: string, content: string): Promise<void> {
  const api = getTodoistApi()
  await api.updateTask(taskId, { content })
}

export function useRenameTask() {
  const invalidateTasks = useInvalidateTodoistCache(queryKeys.tasks)
  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) => runRenameTaskMutation(taskId, content),
    onSuccess: invalidateTasks,
  })
}

export function useCompleteTask() {
  const invalidateTasks = useInvalidateTodoistCache(queryKeys.tasks)
  return useMutation({
    mutationFn: async (taskId: string) => {
      const api = getTodoistApi()
      await api.closeTask(taskId)
    },
    onSuccess: invalidateTasks,
  })
}

export function useDeleteTask() {
  const invalidateTasks = useInvalidateTodoistCache(queryKeys.tasks)
  return useMutation({
    mutationFn: async (taskId: string) => {
      const api = getTodoistApi()
      await api.deleteTask(taskId)
    },
    onSuccess: invalidateTasks,
  })
}

export function useCreateProject() {
  const invalidateProjects = useInvalidateTodoistCache(queryKeys.projects)
  return useMutation({
    mutationFn: async (name: string) => {
      const api = getTodoistApi()
      return api.addProject({ name })
    },
    onSuccess: invalidateProjects,
  })
}

export function useAddTask() {
  const invalidateTasks = useInvalidateTodoistCache(queryKeys.tasks)
  return useMutation({
    mutationFn: async ({
      content,
      projectId,
      labels,
      dueString,
    }: {
      content: string
      projectId?: string
      labels?: string[]
      dueString?: string
    }) => {
      const api = getTodoistApi()
      return api.addTask({
        content,
        ...(projectId ? { projectId } : {}),
        ...(labels ? { labels } : {}),
        ...(dueString ? { dueString } : {}),
      })
    },
    onSuccess: invalidateTasks,
  })
}

export function useDeleteProject() {
  const invalidateProjects = useInvalidateTodoistCache(queryKeys.projects)
  const invalidateTasks = useInvalidateTodoistCache(queryKeys.tasks)
  return useMutation({
    mutationFn: async (projectId: string) => {
      const api = getTodoistApi()
      await api.deleteProject(projectId)
    },
    onSuccess: () => {
      invalidateProjects()
      invalidateTasks()
    },
  })
}

interface ProjectArchiveMutationDependencies {
  api: ProjectArchiveApi
  invalidateProjects: () => void
  invalidateTasks: () => void
}

/** Project archive mutation boundary, exported so API ordering and cache policy stay testable. */
export async function runProjectArchiveMutation(
  input: ProjectArchiveInput,
  dependencies: ProjectArchiveMutationDependencies,
): Promise<ProjectArchiveResult> {
  try {
    return await archiveProjectWithTaskDisposition(dependencies.api, input)
  } finally {
    dependencies.invalidateProjects()
    dependencies.invalidateTasks()
  }
}

export function useArchiveProjectWithTaskDisposition() {
  const invalidateProjects = useInvalidateTodoistCache(queryKeys.projects)
  const invalidateTasks = useInvalidateTodoistCache(queryKeys.tasks)

  return useMutation({
    mutationFn: (input: ProjectArchiveInput) => runProjectArchiveMutation(input, {
      api: getTodoistApi(),
      invalidateProjects,
      invalidateTasks,
    }),
  })
}
