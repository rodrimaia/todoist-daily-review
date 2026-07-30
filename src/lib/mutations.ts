import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getTodoistApi } from './todoist'
import { invalidateTodoistCache } from './todoist-cache'
import { queryKeys } from './query-keys'

function useInvalidateTodoistCache(queryKey: readonly unknown[]) {
  const queryClient = useQueryClient()
  return () => {
    void invalidateTodoistCache(queryClient, queryKey)
  }
}

export function useMoveTask() {
  const invalidateCache = useInvalidateTodoistCache(queryKeys.tasks)
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
      invalidateCache()
      if (labels) {
        await api.updateTask(taskId, { labels })
      }
    },
    onSuccess: invalidateCache,
  })
}

export function useScheduleTask() {
  const invalidateCache = useInvalidateTodoistCache(queryKeys.tasks)
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
    onSuccess: invalidateCache,
  })
}

export function useCompleteTask() {
  const invalidateCache = useInvalidateTodoistCache(queryKeys.tasks)
  return useMutation({
    mutationFn: async (taskId: string) => {
      const api = getTodoistApi()
      await api.closeTask(taskId)
    },
    onSuccess: invalidateCache,
  })
}

export function useDeleteTask() {
  const invalidateCache = useInvalidateTodoistCache(queryKeys.tasks)
  return useMutation({
    mutationFn: async (taskId: string) => {
      const api = getTodoistApi()
      await api.deleteTask(taskId)
    },
    onSuccess: invalidateCache,
  })
}

export function useCreateProject() {
  const invalidateCache = useInvalidateTodoistCache(queryKeys.projects)
  return useMutation({
    mutationFn: async (name: string) => {
      const api = getTodoistApi()
      return api.addProject({ name })
    },
    onSuccess: invalidateCache,
  })
}

export function useAddTask() {
  const invalidateCache = useInvalidateTodoistCache(queryKeys.tasks)
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
    onSuccess: invalidateCache,
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
