/**
 * Shared Review package entry point.
 *
 * Behavior is extracted from the Web client in issues #37 and #38. Keeping a
 * stable package boundary now lets both clients depend on the same seam while
 * the migration remains incremental.
 */
export type ReviewClientKind = 'web' | 'terminal'

import type { PersonalProject, Task, WorkspaceProject } from '@doist/todoist-sdk'
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

type WeeklyProject = PersonalProject | WorkspaceProject

export interface WeeklyReviewSnapshot {
  inboxTasks: Task[]
  upcomingTasks: Task[]
  allTasks: Task[]
  projects: TodoistProject[]
}

/** The complete, paginated read set used by Weekly Review. */
export async function loadWeeklyReview(api: TodoistPort): Promise<WeeklyReviewSnapshot> {
  const [inboxTasks, upcomingTasks, allTasks, projects] = await Promise.all([
    getAllPages((args) => api.getTasksByFilter({ query: '#Inbox', ...args })),
    getAllPages((args) => api.getTasksByFilter({ query: 'overdue | 7 days', ...args })),
    getAllPages((args) => api.getTasks(args)),
    getAllPages((args) => api.getProjects(args)),
  ])
  return { inboxTasks, upcomingTasks, allTasks, projects }
}

export interface WeeklyReviewPreparation {
  inboxTasks: Task[]
  upcomingTasks: Task[]
  projects: Array<{
    project: WeeklyProject
    tasks: Task[]
    archiveTasks: Task[]
    hasNextAction: boolean
    subprojectCount: number
  }>
  somedayTasks: Task[]
}

export interface WeeklyReviewOptions {
  somedayProjectId?: string
  excludeTaskId?: string
  excludeProjectPrefixes?: string[]
}

/** Derives the review queues from the raw snapshot without mutating it. */
export function prepareWeeklyReview(
  snapshot: WeeklyReviewSnapshot,
  options: WeeklyReviewOptions = {},
): WeeklyReviewPreparation {
  const excluded = (task: Task) => options.excludeTaskId !== undefined && task.id === options.excludeTaskId
  const prefixes = (options.excludeProjectPrefixes ?? [])
    .map((prefix) => prefix.trim().toLowerCase())
    .filter(Boolean)
  const inbox = snapshot.projects.find((project) => 'inboxProject' in project && project.inboxProject)
  const inboxProjectId = inbox?.id
  const projects = snapshot.projects.filter((project) =>
    project.id !== inboxProjectId &&
    project.id !== options.somedayProjectId &&
    !prefixes.some((prefix) => project.name.toLowerCase().startsWith(prefix)),
  )
  const byProject = new Map<string, Task[]>()
  for (const task of snapshot.allTasks) {
    const list = byProject.get(task.projectId) ?? []
    list.push(task)
    byProject.set(task.projectId, list)
  }
  const children = new Map<string, number>()
  for (const project of snapshot.projects) {
    if (!('parentId' in project) || !project.parentId) continue
    children.set(project.parentId, (children.get(project.parentId) ?? 0) + 1)
  }
  return {
    inboxTasks: snapshot.inboxTasks.filter((task) => !excluded(task)),
    upcomingTasks: snapshot.upcomingTasks.filter((task) => !excluded(task)),
    somedayTasks: options.somedayProjectId
      ? (byProject.get(options.somedayProjectId) ?? []).filter((task) => !excluded(task))
      : [],
    projects: projects.map((project) => {
      const archiveTasks = byProject.get(project.id) ?? []
      const tasks = archiveTasks.filter((task) => !excluded(task))
      return {
        project,
        tasks,
        archiveTasks,
        hasNextAction: tasks.some((task) => task.labels.includes('next_action')),
        subprojectCount: children.get(project.id) ?? 0,
      }
    }),
  }
}

export type WeeklyReviewAction =
  | { type: 'move_to_project' | 'move_to_someday'; taskId: string; projectId: string }
  | { type: 'complete' | 'delete'; taskId: string }
  | { type: 'schedule'; taskId: string; dueString: string | null }
  | { type: 'rename'; taskId: string; content: string }
  | { type: 'delete_project'; projectId: string }
  | { type: 'archive_project'; projectId: string }

/** Applies a Todoist mutation selected during Weekly Review. */
export async function applyWeeklyReviewAction(api: TodoistPort, action: WeeklyReviewAction): Promise<void> {
  if (action.type === 'move_to_project' || action.type === 'move_to_someday') {
    await api.moveTask(action.taskId, { projectId: action.projectId })
    return
  }
  if (action.type === 'complete') { await api.closeTask(action.taskId); return }
  if (action.type === 'delete') { await api.deleteTask(action.taskId); return }
  if (action.type === 'schedule') { await api.updateTask(action.taskId, { dueString: action.dueString ?? 'no date' }); return }
  if (action.type === 'rename') { await api.updateTask(action.taskId, { content: action.content }); return }
  if (action.type === 'delete_project') { await api.deleteProject(action.projectId); return }
  await api.archiveProject(action.projectId)
}
