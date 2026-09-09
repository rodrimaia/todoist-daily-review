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
import { archiveProjectWithTaskDisposition, type ProjectArchiveResult, type ProjectArchiveTaskChoice } from '../../../src/lib/project-archive'

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

/** State machine used by the terminal Daily Review. Network operations remain
 * outside the reducer so failed writes can be retried without losing context. */
export type DailyReviewPhase = 'inbox' | 'filter' | 'summary' | 'error'
export type DailyReviewStatus = 'ready' | 'confirming' | 'saving' | 'complete' | 'failed'
export interface DailyReviewState {
  phase: DailyReviewPhase
  inboxTasks: Task[]
  filterTasks: Task[]
  index: number
  status: DailyReviewStatus
  pending?: DailyReviewAction
  error?: string
  failedPhase?: 'inbox' | 'filter'
  actions: DailyReviewAction[]
}

export function createDailyReviewState(snapshot: DailyReviewSnapshot): DailyReviewState {
  const phase: DailyReviewPhase = snapshot.inboxTasks.length ? 'inbox' : snapshot.filterTasks.length ? 'filter' : 'summary'
  return { phase, inboxTasks: [...snapshot.inboxTasks], filterTasks: [...snapshot.filterTasks], index: 0, status: phase === 'summary' ? 'complete' : 'ready', actions: [] }
}

export function currentDailyReviewTask(state: DailyReviewState): Task | undefined {
  if (state.phase === 'inbox') return state.inboxTasks[state.index]
  if (state.phase === 'filter') return state.filterTasks[state.index]
  return undefined
}

export function advanceDailyReview(state: DailyReviewState, action: DailyReviewAction): DailyReviewState {
  const next = { ...state, actions: [...state.actions, action], pending: undefined, error: undefined, status: 'ready' as DailyReviewStatus, index: state.index + 1 }
  const queue = next.phase === 'inbox' ? next.inboxTasks : next.filterTasks
  if (next.index < queue.length) return next
  if (next.phase === 'inbox' && next.filterTasks.length) return { ...next, phase: 'filter', index: 0 }
  return { ...next, phase: 'summary', status: 'complete', index: 0 }
}

export function beginDailyReviewAction(state: DailyReviewState, action: DailyReviewAction, requiresConfirmation = action.type === 'delete'): DailyReviewState {
  return requiresConfirmation ? { ...state, pending: action, status: 'confirming' } : { ...state, pending: action, status: 'saving' }
}

export function confirmDailyReviewAction(state: DailyReviewState, confirmed: boolean): DailyReviewState {
  if (!state.pending) return state
  return confirmed ? { ...state, status: 'saving' } : { ...state, pending: undefined, status: 'ready' }
}

export function failDailyReviewAction(state: DailyReviewState, error: unknown): DailyReviewState {
  const failedPhase = state.phase === 'inbox' || state.phase === 'filter' ? state.phase : state.failedPhase
  return { ...state, phase: 'error', failedPhase, status: 'failed', error: error instanceof Error ? error.message : String(error) }
}

export function retryDailyReviewAction(state: DailyReviewState): DailyReviewState {
  return state.pending ? { ...state, phase: state.failedPhase ?? state.phase, status: 'saving', error: undefined } : { ...state, status: 'ready', error: undefined }
}

export function dailyReviewSummary(state: DailyReviewState): Record<string, number> {
  return state.actions.reduce<Record<string, number>>((result, action) => { result[action.type] = (result[action.type] ?? 0) + 1; return result }, {})
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
  if (action.type === 'archive_project') { await api.archiveProject(action.projectId); return }
}

/** A UI-independent lifecycle for the five-step terminal Weekly Review. */
export type TerminalWeeklyPhase = 'inbox' | 'projects' | 'someday' | 'upcoming' | 'summary'
export type TerminalWeeklyDecision =
  | { type: 'inbox'; action: 'complete' | 'delete' | 'skip' | 'move_to_project' | 'move_to_someday'; taskId: string; projectId?: string }
  | { type: 'project'; action: 'ok' | 'skip' | 'delete_project'; projectId: string }
  | { type: 'archive'; projectId: string; choice: ProjectArchiveTaskChoice }
  | { type: 'someday'; action: 'activate' | 'keep' | 'delete'; taskId: string; projectId?: string }
  | { type: 'upcoming'; action: 'reschedule' | 'complete' | 'remove_date'; taskId: string; dueString?: string }

export interface TerminalWeeklyState extends WeeklyReviewPreparation {
  phase: TerminalWeeklyPhase
  started: boolean
  completedNaturally: boolean
  decisions: number
  lastArchive?: ProjectArchiveResult
}

/** Loads a complete Weekly Review session; stopping is always explicit. */
export class TerminalWeeklyReview {
  readonly api: TodoistPort
  state: TerminalWeeklyState = {
    inboxTasks: [], upcomingTasks: [], projects: [], somedayTasks: [], phase: 'inbox',
    started: false, completedNaturally: false, decisions: 0,
  }
  constructor(api: TodoistPort) { this.api = api }

  async start(options: WeeklyReviewOptions = {}): Promise<TerminalWeeklyState> {
    const prepared = prepareWeeklyReview(await loadWeeklyReview(this.api), options)
    this.state = {
      ...prepared,
      phase: prepared.inboxTasks.length
        ? 'inbox'
        : prepared.projects.length
          ? 'projects'
          : prepared.somedayTasks.length
            ? 'someday'
            : prepared.upcomingTasks.length ? 'upcoming' : 'summary',
      started: true,
      completedNaturally: false,
      decisions: 0,
    }
    return this.state
  }

  async decide(decision: TerminalWeeklyDecision): Promise<TerminalWeeklyState> {
    if (!this.state.started || this.state.phase === 'summary') throw new Error('Weekly Review is not active')
    const current = this.state
    if (decision.type === 'inbox') {
      if (current.phase !== 'inbox' || !current.inboxTasks.some((task) => task.id === decision.taskId)) throw new Error('Inbox task is not in the current review')
      if (decision.action !== 'skip') {
        await applyDailyReviewAction(this.api, {
          type: decision.action,
          taskId: decision.taskId,
          ...(decision.projectId ? { projectId: decision.projectId } : {}),
        } as DailyReviewAction)
      }
      this.state = { ...current, inboxTasks: current.inboxTasks.filter((task) => task.id !== decision.taskId), decisions: current.decisions + 1 }
    } else if (decision.type === 'archive') {
      if (current.phase !== 'projects') throw new Error('Project archive is only available during Projects')
      const project = current.projects.find((item) => item.project.id === decision.projectId)
      if (!project || project.subprojectCount > 0) throw new Error('Project archive is unavailable for this project')
      this.state = {
        ...current,
        lastArchive: await archiveProjectWithTaskDisposition(this.api, { projectId: decision.projectId, choice: decision.choice, tasks: project.archiveTasks }),
        decisions: current.decisions + 1,
      }
    } else if (decision.type === 'project') {
      if (current.phase !== 'projects' || !current.projects.some((item) => item.project.id === decision.projectId)) throw new Error('Project is not in the current review')
      if (decision.action === 'delete_project') await this.api.deleteProject(decision.projectId)
      this.state = { ...current, projects: current.projects.filter((item) => item.project.id !== decision.projectId), decisions: current.decisions + 1 }
    } else {
      const queue = decision.type === 'someday' ? current.somedayTasks : current.upcomingTasks
      if (!queue.some((task) => task.id === decision.taskId)) throw new Error('Task is not in the current review')
      if (decision.type === 'someday') {
        if (decision.action === 'activate' && decision.projectId) await this.api.moveTask(decision.taskId, { projectId: decision.projectId })
        else if (decision.action === 'delete') await this.api.deleteTask(decision.taskId)
      } else if (decision.action === 'reschedule') await this.api.updateTask(decision.taskId, { dueString: decision.dueString ?? 'no date' })
      else if (decision.action === 'complete') await this.api.closeTask(decision.taskId)
      else await this.api.updateTask(decision.taskId, { dueString: 'no date' })
      this.state = {
        ...current,
        [decision.type === 'someday' ? 'somedayTasks' : 'upcomingTasks']: queue.filter((task) => task.id !== decision.taskId),
        decisions: current.decisions + 1,
      }
    }
    return this.state
  }

  advance(): TerminalWeeklyState {
    if (!this.state.started) throw new Error('Weekly Review is not active')
    const order: TerminalWeeklyPhase[] = ['inbox', 'projects', 'someday', 'upcoming', 'summary']
    const index = order.indexOf(this.state.phase)
    const next = order.slice(index + 1).find((phase) =>
      phase === 'summary' ||
      (phase === 'projects' ? this.state.projects.length > 0 :
        phase === 'someday' ? this.state.somedayTasks.length > 0 :
          phase === 'upcoming' ? this.state.upcomingTasks.length > 0 : true),
    ) ?? 'summary'
    this.state = { ...this.state, phase: next, completedNaturally: next === 'summary' }
    return this.state
  }

  stop(): TerminalWeeklyState {
    this.state = { ...this.state, phase: 'summary', completedNaturally: false }
    return this.state
  }
}
