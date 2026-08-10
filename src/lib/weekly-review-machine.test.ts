import { describe, expect, test } from 'bun:test'
import type { Task } from '@doist/todoist-sdk'
import {
  getUpcomingStatsTotal,
  type ProjectWithTasks,
  weeklyInitialState,
  weeklyReviewReducer,
} from './weekly-review-machine'

function task(id: string): Task {
  return { id } as Task
}

function project(id: string): ProjectWithTasks {
  return {
    project: { id, name: id },
    tasks: [],
    hasNextAction: false,
  } as unknown as ProjectWithTasks
}

describe('weekly review reducer', () => {
  test('walks every populated phase and deduplicates processed Inbox tasks from Upcoming', () => {
    const shared = task('shared')
    const upcomingOnly = task('upcoming-only')
    let state = weeklyReviewReducer(weeklyInitialState, {
      type: 'START',
      inboxTasks: [shared],
      projects: [project('project')],
      somedayTasks: [task('someday')],
      upcomingTasks: [shared, upcomingOnly],
    })

    state = weeklyReviewReducer(state, {
      type: 'INBOX_ACTION',
      taskId: 'shared',
      action: 'move_to_project',
    })
    expect(state.phase).toBe('projects')
    expect(state.inboxStats.moved).toBe(1)
    expect(state.upcomingTasks).toEqual([upcomingOnly])

    state = weeklyReviewReducer(state, { type: 'PROJECT_ACTION', action: 'added_task' })
    expect(state.phase).toBe('someday')
    expect(state.projectStats).toMatchObject({ reviewed: 1, tasksAdded: 1 })

    state = weeklyReviewReducer(state, {
      type: 'SOMEDAY_DONE',
      stats: { activated: 1, kept: 0, deleted: 0 },
    })
    expect(state.phase).toBe('upcoming')

    state = weeklyReviewReducer(state, {
      type: 'UPCOMING_DONE',
      stats: { rescheduled: 1, completed: 1, removedDate: 0 },
    })
    expect(state.phase).toBe('summary')
    expect(getUpcomingStatsTotal(state.upcomingStats)).toBe(2)
  })

  test('keeps a skipped Inbox task in Upcoming', () => {
    const shared = task('shared')
    shared.due = { date: '2030-01-01', string: 'every day', isRecurring: true }
    let state = weeklyReviewReducer(weeklyInitialState, {
      type: 'START',
      inboxTasks: [shared],
      projects: [],
      somedayTasks: [],
      upcomingTasks: [shared],
    })

    state = weeklyReviewReducer(state, { type: 'INBOX_ACTION', taskId: 'shared', action: 'skip' })

    expect(state.phase).toBe('upcoming')
    expect(state.upcomingTasks).toEqual([shared])
    expect(state.inboxStats.skipped).toBe(1)
  })

  test('skips empty phases and Stop ends the session', () => {
    const upcoming = weeklyReviewReducer(weeklyInitialState, {
      type: 'START',
      inboxTasks: [],
      projects: [],
      somedayTasks: [],
      upcomingTasks: [task('upcoming')],
    })
    expect(upcoming.phase).toBe('upcoming')
    expect(weeklyReviewReducer(upcoming, { type: 'STOP' }).phase).toBe('summary')

    expect(
      weeklyReviewReducer(weeklyInitialState, {
        type: 'START',
        inboxTasks: [],
        projects: [],
        somedayTasks: [],
        upcomingTasks: [],
      }).phase,
    ).toBe('summary')
  })

  describe('completedNaturally', () => {
    test('full run through every phase is naturally completed', () => {
      let state = weeklyReviewReducer(weeklyInitialState, {
        type: 'START',
        inboxTasks: [task('a')],
        projects: [project('p')],
        somedayTasks: [task('s')],
        upcomingTasks: [task('u')],
      })

      state = weeklyReviewReducer(state, { type: 'INBOX_ACTION', taskId: 'a', action: 'complete' })
      state = weeklyReviewReducer(state, { type: 'PROJECT_ACTION', action: 'ok' })
      state = weeklyReviewReducer(state, {
        type: 'SOMEDAY_DONE',
        stats: { activated: 1, kept: 0, deleted: 0 },
      })
      state = weeklyReviewReducer(state, {
        type: 'UPCOMING_DONE',
        stats: { rescheduled: 1, completed: 1, removedDate: 0 },
      })

      expect(state.phase).toBe('summary')
      expect(state.completedNaturally).toBe(true)
    })

    test('empty review is naturally completed', () => {
      const state = weeklyReviewReducer(weeklyInitialState, {
        type: 'START',
        inboxTasks: [],
        projects: [],
        somedayTasks: [],
        upcomingTasks: [],
      })

      expect(state.phase).toBe('summary')
      expect(state.completedNaturally).toBe(true)
    })

    test('STOP marks the review as not naturally completed', () => {
      let state = weeklyReviewReducer(weeklyInitialState, {
        type: 'START',
        inboxTasks: [task('a')],
        projects: [],
        somedayTasks: [],
        upcomingTasks: [],
      })

      state = weeklyReviewReducer(state, { type: 'STOP' })

      expect(state.phase).toBe('summary')
      expect(state.completedNaturally).toBe(false)
    })

    test('STOP overrides natural completion even when all phases were walked', () => {
      let state = weeklyReviewReducer(weeklyInitialState, {
        type: 'START',
        inboxTasks: [task('a')],
        projects: [],
        somedayTasks: [],
        upcomingTasks: [],
      })

      // Walk through inbox (natural advance makes completedNaturally = true)
      state = weeklyReviewReducer(state, { type: 'INBOX_ACTION', taskId: 'a', action: 'complete' })
      expect(state.phase).toBe('summary')
      expect(state.completedNaturally).toBe(true)

      // If the user had STOPped during inbox instead:
      let stopped = weeklyReviewReducer(weeklyInitialState, {
        type: 'START',
        inboxTasks: [task('a')],
        projects: [],
        somedayTasks: [],
        upcomingTasks: [],
      })
      stopped = weeklyReviewReducer(stopped, { type: 'STOP' })
      expect(stopped.phase).toBe('summary')
      expect(stopped.completedNaturally).toBe(false)
    })
  })
})
