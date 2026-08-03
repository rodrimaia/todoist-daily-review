import type { Task } from '@doist/todoist-sdk'

/** Recurring schedules must advance through completion, never through due-date replacement. */
export function canChangeTaskDueDate(task: Pick<Task, 'due'>): boolean {
  return task.due?.isRecurring !== true
}

export function canSkipTask(task: Pick<Task, 'due'>): boolean {
  return task.due?.isRecurring === true
}
