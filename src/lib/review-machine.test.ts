import { describe, expect, test } from 'bun:test'
import type { Task } from '@doist/todoist-sdk'
import {
  getCurrentTask,
  getFilterTotal,
  getInboxTotal,
  initialState,
  reviewReducer,
} from './review-machine'

function task(id: string, recurring = false): Task {
  return { id, due: recurring ? { isRecurring: true, date: '2030-01-01', string: 'every day' } : undefined } as Task
}

describe('daily review reducer', () => {
  test('moves optimistically from Inbox to Filter and deduplicates the moved task', () => {
    const shared = task('shared')
    const filterOnly = task('filter-only')
    let state = reviewReducer(initialState, {
      type: 'START',
      inboxTasks: [shared],
      filterTasks: [shared, filterOnly],
    })

    state = reviewReducer(state, { type: 'INBOX_ACTION', taskId: 'shared', action: 'move_to_project' })

    expect(state.phase).toBe('filter')
    expect(state.filterTasks).toEqual([filterOnly])
    expect(getCurrentTask(state)).toBe(filterOnly)
    expect(state.inboxStats.moved).toBe(1)
    expect(getInboxTotal(state.inboxStats)).toBe(1)
  })

  test('keeps a skipped Inbox task eligible for Filter review', () => {
    const shared = task('shared')
    shared.due = { date: '2030-01-01', string: 'every day', isRecurring: true }
    let state = reviewReducer(initialState, {
      type: 'START',
      inboxTasks: [shared],
      filterTasks: [shared],
    })

    state = reviewReducer(state, { type: 'INBOX_ACTION', taskId: 'shared', action: 'skip' })

    expect(state.phase).toBe('filter')
    expect(state.filterTasks).toEqual([shared])
    expect(state.inboxStats.skipped).toBe(1)
  })

  test('records Filter decisions and advances immediately to Summary', () => {
    let state = reviewReducer(initialState, {
      type: 'START',
      inboxTasks: [],
      filterTasks: [task('one'), task('two')],
    })

    state = reviewReducer(state, {
      type: 'FILTER_ACTION',
      taskId: 'one',
      action: 'schedule',
      dueString: 'today',
    })
    expect(state.currentIndex).toBe(1)
    expect(state.filterStats.rescheduledToday).toBe(1)

    state = reviewReducer(state, { type: 'FILTER_ACTION', taskId: 'two', action: 'remove_date' })
    expect(state.phase).toBe('summary')
    expect(state.filterStats.removedDate).toBe(1)
  })

  test('records filter Delete and counts it in the filter total', () => {
    let state = reviewReducer(initialState, {
      type: 'START',
      inboxTasks: [],
      filterTasks: [task('del-me'), task('next')],
    })

    state = reviewReducer(state, {
      type: 'FILTER_ACTION',
      taskId: 'del-me',
      action: 'delete',
    })

    expect(state.filterStats.deleted).toBe(1)
    expect(getFilterTotal(state.filterStats)).toBe(1)
    expect(state.currentIndex).toBe(1)
    expect(getCurrentTask(state)?.id).toBe('next')
  })

  test('rejects filter Delete for a recurring task', () => {
    let state = reviewReducer(initialState, {
      type: 'START',
      inboxTasks: [],
      filterTasks: [task('recurring', true)],
    })

    state = reviewReducer(state, {
      type: 'FILTER_ACTION',
      taskId: 'recurring',
      action: 'delete',
    })

    expect(state.filterStats.deleted).toBe(0)
    expect(state.phase).toBe('filter')
    expect(state.currentIndex).toBe(0)
  })

  test('starts at the first reachable phase and Stop ends the session', () => {
    const started = reviewReducer(initialState, {
      type: 'START',
      inboxTasks: [],
      filterTasks: [task('filter')],
    })
    expect(started.phase).toBe('filter')

    expect(reviewReducer(started, { type: 'STOP' }).phase).toBe('summary')
    expect(
      reviewReducer(initialState, { type: 'START', inboxTasks: [], filterTasks: [] }).phase,
    ).toBe('summary')
  })
})
