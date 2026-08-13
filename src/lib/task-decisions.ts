import type { Task } from '@doist/todoist-sdk'

/** Recurring schedules must advance through completion, never through due-date replacement. */
export function canChangeTaskDueDate(task: Pick<Task, 'due'>): boolean {
  return task.due?.isRecurring !== true
}

export function canSkipTask(task: Pick<Task, 'due'>): boolean {
  return task.due?.isRecurring === true
}

export function canDeleteTask(task: Pick<Task, 'due'>): boolean {
  return task.due?.isRecurring !== true
}

/**
 * An Eligible tracking occurrence is an open task whose due date is on or before
 * the Review day (calendar date in the Todoist account timezone).
 *
 * Undated tasks, future dates, and completed tasks are not eligible.
 */
/** A Review tracking task must be open, recurring, and have due data. */
export function getReviewTrackingTaskInvalidReason(
  task: Pick<Task, 'due' | 'completedAt'>,
): string | null {
  if (task.completedAt !== null) return 'Review tracking task must be open.'
  if (!task.due) return 'Review tracking task requires due data.'
  if (task.due.isRecurring !== true) return 'Review tracking task must recur.'
  return null
}

export function isEligibleTrackingOccurrence(
  task: Pick<Task, 'due' | 'completedAt'>,
  reviewDay: string,
): boolean {
  if (task.completedAt !== null) return false
  if (!task.due) return false
  return task.due.date <= reviewDay
}
