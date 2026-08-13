import type { Task } from '@doist/todoist-sdk'

/** Returns the canonical task ID from a raw ID or an official Todoist task URL. */
export function normalizeReviewTrackingTaskId(value: string): string | null {
  const candidate = value.trim()
  if (/^\d+$/.test(candidate)) return candidate

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' || !['todoist.com', 'www.todoist.com', 'app.todoist.com'].includes(url.hostname)) {
      return null
    }
    const match = url.pathname.match(/^\/app\/task\/(\d+)\/?$/)
    return match?.[1] ?? null
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
