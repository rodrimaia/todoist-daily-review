import { useMutation } from '@tanstack/react-query'
import { getTodoistApi } from './todoist'

export function useMoveTask() {
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
      if (labels) {
        await api.updateTask(taskId, { labels })
      }
    },
  })
}

export function useScheduleTask() {
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
  })
}

export function useCompleteTask() {
  return useMutation({
    mutationFn: async (taskId: string) => {
      const api = getTodoistApi()
      await api.closeTask(taskId)
    },
  })
}

export function useDeleteTask() {
  return useMutation({
    mutationFn: async (taskId: string) => {
      const api = getTodoistApi()
      await api.deleteTask(taskId)
    },
  })
}

export function useCreateProject() {
  return useMutation({
    mutationFn: async (name: string) => {
      const api = getTodoistApi()
      return api.addProject({ name })
    },
  })
}

export function useAddTask() {
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
  })
}

export function useDeleteProject() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const api = getTodoistApi()
      await api.deleteProject(projectId)
    },
  })
}
