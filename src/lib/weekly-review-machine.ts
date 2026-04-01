import type { Task, PersonalProject, WorkspaceProject } from '@doist/todoist-sdk'
import type { InboxStats } from './review-machine'

export type WeeklyPhase = 'inbox' | 'projects' | 'someday' | 'upcoming' | 'summary'

type Project = PersonalProject | WorkspaceProject

export interface ProjectWithTasks {
  project: Project
  tasks: Task[]
  hasNextAction: boolean
}

export interface ProjectStats {
  reviewed: number
  tasksAdded: number
  projectsDeleted: number
  skipped: number
}

export interface SomedayStats {
  activated: number
  kept: number
  deleted: number
}

export interface WeeklyReviewState {
  phase: WeeklyPhase
  // Inbox
  inboxTasks: Task[]
  inboxIndex: number
  inboxStats: InboxStats
  processedTaskIds: Set<string>
  // Projects
  projects: ProjectWithTasks[]
  projectIndex: number
  projectStats: ProjectStats
  // Someday
  somedayTasks: Task[]
  somedayStats: SomedayStats
  // Upcoming
  upcomingTasks: Task[]
  upcomingStats: UpcomingStats
}

export type WeeklyReviewAction =
  | {
      type: 'START'
      inboxTasks: Task[]
      projects: ProjectWithTasks[]
      somedayTasks: Task[]
      upcomingTasks: Task[]
    }
  | { type: 'INBOX_ACTION'; action: InboxActionType; dueString?: string }
  | { type: 'PROJECT_ACTION'; action: ProjectActionType }
  | { type: 'SOMEDAY_DONE'; stats: SomedayStats }
  | { type: 'UPCOMING_DONE'; stats: UpcomingStats }
  | { type: 'STOP' }

type InboxActionType =
  | 'move_to_project'
  | 'move_to_someday'
  | 'schedule'
  | 'complete'
  | 'delete'
  | 'skip'

type ProjectActionType = 'ok' | 'added_task' | 'deleted_project' | 'skip'
export interface UpcomingStats {
  rescheduled: number
  completed: number
  removedDate: number
}

function emptyInboxStats(): InboxStats {
  return { moved: 0, someday: 0, scheduled: 0, completed: 0, deleted: 0, skipped: 0 }
}

function emptyUpcomingStats(): UpcomingStats {
  return { rescheduled: 0, completed: 0, removedDate: 0 }
}

function emptyProjectStats(): ProjectStats {
  return { reviewed: 0, tasksAdded: 0, projectsDeleted: 0, skipped: 0 }
}

function emptySomedayStats(): SomedayStats {
  return { activated: 0, kept: 0, deleted: 0 }
}

export const weeklyInitialState: WeeklyReviewState = {
  phase: 'inbox',
  inboxTasks: [],
  inboxIndex: 0,
  inboxStats: emptyInboxStats(),
  processedTaskIds: new Set(),
  projects: [],
  projectIndex: 0,
  projectStats: emptyProjectStats(),
  somedayTasks: [],
  somedayStats: emptySomedayStats(),
  upcomingTasks: [],
  upcomingStats: emptyUpcomingStats(),
}

const PHASE_ORDER: WeeklyPhase[] = ['inbox', 'projects', 'someday', 'upcoming', 'summary']

function nextPhase(state: WeeklyReviewState, currentPhase: WeeklyPhase): WeeklyReviewState {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase)
  for (let i = currentIdx + 1; i < PHASE_ORDER.length; i++) {
    const phase = PHASE_ORDER[i]
    if (phase === 'summary') return { ...state, phase: 'summary' }
    if (phase === 'projects' && state.projects.length > 0)
      return { ...state, phase: 'projects', projectIndex: 0 }
    if (phase === 'someday' && state.somedayTasks.length > 0)
      return { ...state, phase: 'someday' }
    if (phase === 'upcoming' && state.upcomingTasks.length > 0)
      return { ...state, phase: 'upcoming' }
  }
  return { ...state, phase: 'summary' }
}

function advanceInbox(state: WeeklyReviewState): WeeklyReviewState {
  const next = state.inboxIndex + 1
  if (next >= state.inboxTasks.length) {
    // Dedup upcoming tasks against processed inbox tasks
    const upcomingTasks = state.upcomingTasks.filter((t) => !state.processedTaskIds.has(t.id))
    return nextPhase({ ...state, upcomingTasks }, 'inbox')
  }
  return { ...state, inboxIndex: next }
}

function advanceProject(state: WeeklyReviewState): WeeklyReviewState {
  const next = state.projectIndex + 1
  if (next >= state.projects.length) return nextPhase(state, 'projects')
  return { ...state, projectIndex: next }
}

export function weeklyReviewReducer(
  state: WeeklyReviewState,
  action: WeeklyReviewAction,
): WeeklyReviewState {
  switch (action.type) {
    case 'START': {
      const initial: WeeklyReviewState = {
        ...weeklyInitialState,
        inboxTasks: action.inboxTasks,
        projects: action.projects,
        somedayTasks: action.somedayTasks,
        upcomingTasks: action.upcomingTasks,
      }
      if (action.inboxTasks.length > 0) return { ...initial, phase: 'inbox' }
      return nextPhase(initial, 'inbox')
    }

    case 'INBOX_ACTION': {
      const stats = { ...state.inboxStats }
      switch (action.action) {
        case 'move_to_project': stats.moved++; break
        case 'move_to_someday': stats.someday++; break
        case 'schedule': stats.scheduled++; break
        case 'complete': stats.completed++; break
        case 'delete': stats.deleted++; break
        case 'skip': stats.skipped++; break
      }
      const processedTaskIds = new Set(state.processedTaskIds)
      const currentTask = state.inboxTasks[state.inboxIndex]
      if (action.action !== 'skip' && currentTask) {
        processedTaskIds.add(currentTask.id)
      }
      return advanceInbox({ ...state, inboxStats: stats, processedTaskIds })
    }

    case 'PROJECT_ACTION': {
      const stats = { ...state.projectStats }
      switch (action.action) {
        case 'ok': stats.reviewed++; break
        case 'added_task': stats.reviewed++; stats.tasksAdded++; break
        case 'deleted_project': stats.projectsDeleted++; break
        case 'skip': stats.skipped++; break
      }
      return advanceProject({ ...state, projectStats: stats })
    }

    case 'SOMEDAY_DONE': {
      return nextPhase({ ...state, somedayStats: action.stats }, 'someday')
    }

    case 'UPCOMING_DONE': {
      return nextPhase({ ...state, upcomingStats: action.stats }, 'upcoming')
    }

    case 'STOP':
      return { ...state, phase: 'summary' }

    default:
      return state
  }
}

export function getWeeklyCurrentTask(state: WeeklyReviewState): Task | null {
  if (state.phase === 'inbox') return state.inboxTasks[state.inboxIndex] ?? null
  return null
}

export function getWeeklyCurrentProject(state: WeeklyReviewState): ProjectWithTasks | null {
  if (state.phase !== 'projects') return null
  return state.projects[state.projectIndex] ?? null
}

export function getWeeklyPhaseTotal(state: WeeklyReviewState): number {
  switch (state.phase) {
    case 'inbox': return state.inboxTasks.length
    case 'projects': return state.projects.length
    default: return 0
  }
}

export function getWeeklyPhaseIndex(state: WeeklyReviewState): number {
  switch (state.phase) {
    case 'inbox': return state.inboxIndex
    case 'projects': return state.projectIndex
    default: return 0
  }
}

export function getUpcomingStatsTotal(stats: UpcomingStats): number {
  return stats.rescheduled + stats.completed + stats.removedDate
}

export function getProjectStatsTotal(stats: ProjectStats): number {
  return stats.reviewed + stats.projectsDeleted + stats.skipped
}

export function getSomedayStatsTotal(stats: SomedayStats): number {
  return stats.activated + stats.kept + stats.deleted
}
