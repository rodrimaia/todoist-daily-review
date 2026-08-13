import type { Task } from '@doist/todoist-sdk'

const opaqueTaskIdPattern = /^[A-Za-z0-9]{16}$/
const legacyTaskIdPattern = /^\d+$/

function isTaskId(value: string): boolean {
  return opaqueTaskIdPattern.test(value) || legacyTaskIdPattern.test(value)
}

/** Returns the canonical task ID from a raw ID or an official Todoist task URL. */
export function normalizeReviewTrackingTaskId(value: string): string | null {
  const candidate = value.trim()
  if (isTaskId(candidate)) return candidate

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' || !['todoist.com', 'www.todoist.com', 'app.todoist.com'].includes(url.hostname)) {
      return null
    }
    const pathMatch = url.pathname.match(/^\/app\/task\/([^/]+)\/?$/)
    const taskPath = pathMatch?.[1]
    if (!taskPath) return null
    if (isTaskId(taskPath)) return taskPath

    return taskPath.match(/-([A-Za-z0-9]{16})$/)?.[1] ?? null
  } catch {
    return null
  }
}

export function getTodoistReadFailureMessage(error: unknown): string {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: unknown }).status
    : undefined
  const responseStatus = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { status?: unknown } }).response?.status
    : undefined

  if (status === 404 || responseStatus === 404) {
    return 'Task could not be found, accessed, or is already completed.'
  }
  return 'Could not reach Todoist to validate this task. Please retry.'
}

export function getReviewTrackingTaskSchedule(task: Pick<Task, 'due'>): string {
  return task.due?.string ?? task.due?.date ?? ''
}
