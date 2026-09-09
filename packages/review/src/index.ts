/**
 * Shared Review package entry point.
 *
 * Behavior is extracted from the Web client in issues #37 and #38. Keeping a
 * stable package boundary now lets both clients depend on the same seam while
 * the migration remains incremental.
 */
export type ReviewClientKind = 'web' | 'terminal'

import type { Task } from '@doist/todoist-sdk'
import { getAllPages, type TodoistPort, type TodoistProject } from '@todoist-review/todoist'

export interface DailyReviewSnapshot {
  inboxTasks: Task[]
  filterTasks: Task[]
  projects: TodoistProject[]
}

/** Loads the complete data set used by Daily Review, independent of UI/client. */
export async function loadDailyReview(
  api: TodoistPort,
  filterQuery: string,
): Promise<DailyReviewSnapshot> {
  const [inboxTasks, filterTasks, projects] = await Promise.all([
    getAllPages((args) => api.getTasksByFilter({ query: '#Inbox', ...args })),
    getAllPages((args) => api.getTasksByFilter({ query: filterQuery, ...args })),
    getAllPages((args) => api.getProjects(args)),
  ])
  return { inboxTasks, filterTasks, projects }
}

export type DailyReviewAction =
  | { type: 'complete' | 'delete' | 'skip'; taskId: string }
  | { type: 'move_to_project' | 'move_to_someday'; taskId: string; projectId: string }
  | { type: 'schedule'; taskId: string; dueString: string | null }
  | { type: 'rename'; taskId: string; content: string }

/** Applies a Daily Review decision through the port; callers own state transitions. */
export async function applyDailyReviewAction(api: TodoistPort, action: DailyReviewAction): Promise<void> {
  switch (action.type) {
    case 'complete': await api.closeTask(action.taskId); return
    case 'delete': await api.deleteTask(action.taskId); return
    case 'skip': return
    case 'rename': await api.updateTask(action.taskId, { content: action.content }); return
    case 'schedule': await api.updateTask(action.taskId, { dueString: action.dueString ?? 'no date' }); return
    case 'move_to_project':
    case 'move_to_someday': await api.moveTask(action.taskId, { projectId: action.projectId }); return
  }
}
