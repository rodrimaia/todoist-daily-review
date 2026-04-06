import type { Task } from '@doist/todoist-sdk'

export type Phase = 'inbox' | 'filter' | 'summary'

export type TaskActionType =
  | 'move_to_project'
  | 'move_to_someday'
  | 'schedule'
  | 'complete'
  | 'delete'
  | 'remove_date'
  | 'skip'

export interface InboxStats {
  moved: number
  someday: number
  scheduled: number
  completed: number
  deleted: number
  skipped: number
}

export interface FilterStats {
  rescheduledToday: number
  rescheduledTomorrow: number
  rescheduledSaturday: number
  rescheduledMonday: number
  removedDate: number
  completed: number
  skipped: number
}

export interface ReviewState {
  phase: Phase
  inboxTasks: Task[]
  filterTasks: Task[]
  currentIndex: number
  inboxStats: InboxStats
  filterStats: FilterStats
  processedInboxTaskIds: Set<string>
}

export type ReviewAction =
  | { type: 'START'; inboxTasks: Task[]; filterTasks: Task[] }
  | { type: 'INBOX_ACTION'; action: TaskActionType; dueString?: string }
  | { type: 'FILTER_ACTION'; action: TaskActionType; dueString?: string }
  | { type: 'STOP' }

function emptyInboxStats(): InboxStats {
  return { moved: 0, someday: 0, scheduled: 0, completed: 0, deleted: 0, skipped: 0 }
}

function emptyFilterStats(): FilterStats {
  return {
    rescheduledToday: 0,
    rescheduledTomorrow: 0,
    rescheduledSaturday: 0,
    rescheduledMonday: 0,
    removedDate: 0,
    completed: 0,
    skipped: 0,
  }
}

export const initialState: ReviewState = {
  phase: 'inbox',
  inboxTasks: [],
  filterTasks: [],
  currentIndex: 0,
  inboxStats: emptyInboxStats(),
  filterStats: emptyFilterStats(),
  processedInboxTaskIds: new Set(),
}

function advanceOrTransition(state: ReviewState): ReviewState {
  const tasks = state.phase === 'inbox' ? state.inboxTasks : state.filterTasks
  const nextIndex = state.currentIndex + 1

  if (nextIndex >= tasks.length) {
    if (state.phase === 'inbox') {
      const dedupedFilterTasks = state.filterTasks.filter(
        (t) => !state.processedInboxTaskIds.has(t.id),
      )
      if (dedupedFilterTasks.length === 0) {
        return { ...state, phase: 'summary', currentIndex: 0, filterTasks: dedupedFilterTasks }
      }
      return { ...state, phase: 'filter', currentIndex: 0, filterTasks: dedupedFilterTasks }
    }
    return { ...state, phase: 'summary', currentIndex: 0 }
  }

  return { ...state, currentIndex: nextIndex }
}

export function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'START': {
      const phase: Phase = action.inboxTasks.length > 0 ? 'inbox' : action.filterTasks.length > 0 ? 'filter' : 'summary'
      return {
        ...initialState,
        phase,
        inboxTasks: action.inboxTasks,
        filterTasks: action.filterTasks,
      }
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
      const currentTask = state.inboxTasks[state.currentIndex]
      const processedInboxTaskIds = new Set(state.processedInboxTaskIds)
      if (action.action !== 'skip' && currentTask) {
        processedInboxTaskIds.add(currentTask.id)
      }
      return advanceOrTransition({ ...state, inboxStats: stats, processedInboxTaskIds })
    }

    case 'FILTER_ACTION': {
      const stats = { ...state.filterStats }
      switch (action.action) {
        case 'schedule': {
          if (action.dueString === 'today') stats.rescheduledToday++
          else if (action.dueString === 'tomorrow') stats.rescheduledTomorrow++
          else if (action.dueString === 'saturday') stats.rescheduledSaturday++
          else if (action.dueString === 'monday') stats.rescheduledMonday++
          break
        }
        case 'remove_date': stats.removedDate++; break
        case 'complete': stats.completed++; break
        case 'skip': stats.skipped++; break
      }
      return advanceOrTransition({ ...state, filterStats: stats })
    }

    case 'STOP':
      return { ...state, phase: 'summary', currentIndex: 0 }

    default:
      return state
  }
}

export function getCurrentTask(state: ReviewState): Task | null {
  const tasks = state.phase === 'inbox' ? state.inboxTasks : state.filterTasks
  return tasks[state.currentIndex] ?? null
}

export function getTotalTasks(state: ReviewState): number {
  return state.phase === 'inbox' ? state.inboxTasks.length : state.filterTasks.length
}

export function getInboxTotal(stats: InboxStats): number {
  return stats.moved + stats.someday + stats.scheduled + stats.completed + stats.deleted + stats.skipped
}

export function getFilterTotal(stats: FilterStats): number {
  return (
    stats.rescheduledToday +
    stats.rescheduledTomorrow +
    stats.rescheduledSaturday +
    stats.rescheduledMonday +
    stats.removedDate +
    stats.completed +
    stats.skipped
  )
}
