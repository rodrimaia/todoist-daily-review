import { describe, expect, test } from 'bun:test'
import type { Task } from '@doist/todoist-sdk'
import type { ProjectArchiveResult, ProjectArchiveTaskChoice } from './project-archive'
import {
  getUpcomingStatsTotal,
  type ProjectWithTasks,
  weeklyInitialState,
  weeklyReviewReducer,
} from './weekly-review-machine'

function task(id: string): Task {
  return { id } as Task
}

function project(
  id: string,
  tasks: Task[] = [],
  subprojectCount = 0,
): ProjectWithTasks {
  return {
    project: { id, name: id },
    tasks,
    hasNextAction: false,
    subprojectCount,
  } as unknown as ProjectWithTasks
}

function archiveResult(
  choice: ProjectArchiveTaskChoice,
  overrides: Partial<ProjectArchiveResult> = {},
): ProjectArchiveResult {
  return {
    choice,
    projectArchived: true,
    keptOpenTasks: 0,
    completedTasks: 0,
    deletedTasks: 0,
    recurringBranchesPreserved: 0,
    recurringTasksPreserved: 0,
    failures: 0,
    disposedTaskIds: [],
    ...overrides,
  }
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

  describe('Project archive actions', () => {
    for (const scenario of [
      {
        choice: 'keep_open' as const,
        result: { keptOpenTasks: 2 },
        disposedTaskIds: [] as string[],
        expectedStats: { tasksKeptOpen: 2, tasksCompleted: 0, tasksDeleted: 0 },
      },
      {
        choice: 'complete_tasks' as const,
        result: { completedTasks: 2 },
        disposedTaskIds: ['project-task', 'project-subtask'],
        expectedStats: { tasksKeptOpen: 0, tasksCompleted: 2, tasksDeleted: 0 },
      },
      {
        choice: 'delete_tasks' as const,
        result: { deletedTasks: 2 },
        disposedTaskIds: ['project-task', 'project-subtask'],
        expectedStats: { tasksKeptOpen: 0, tasksCompleted: 0, tasksDeleted: 2 },
      },
    ]) {
      test(`records ${scenario.choice} and advances immediately`, () => {
        const projectTask = task('project-task')
        const projectSubtask = task('project-subtask')
        const unrelated = task('unrelated')
        let state = weeklyReviewReducer(weeklyInitialState, {
          type: 'START',
          inboxTasks: [],
          projects: [project('project', [projectTask, projectSubtask])],
          somedayTasks: [],
          upcomingTasks: [projectTask, projectSubtask, unrelated],
        })

        state = weeklyReviewReducer(state, {
          type: 'PROJECT_ACTION',
          action: 'archive',
          projectId: 'project',
          result: archiveResult(scenario.choice, {
            ...scenario.result,
            disposedTaskIds: scenario.disposedTaskIds,
          }),
        })

        expect(state.phase).toBe('upcoming')
        expect(state.projectStats).toMatchObject({
          archiveAttempts: 1,
          projectsArchived: 1,
          ...scenario.expectedStats,
        })
        expect(state.upcomingTasks).toEqual(
          scenario.choice === 'keep_open'
            ? [projectTask, projectSubtask, unrelated]
            : [unrelated],
        )
      })
    }

    test('aggregates recurring-branch preservation and partial failures', () => {
      let state = weeklyReviewReducer(weeklyInitialState, {
        type: 'START',
        inboxTasks: [],
        projects: [project('project')],
        somedayTasks: [],
        upcomingTasks: [],
      })

      state = weeklyReviewReducer(state, {
        type: 'PROJECT_ACTION',
        action: 'archive',
        projectId: 'project',
        result: archiveResult('complete_tasks', {
          projectArchived: false,
          keptOpenTasks: 3,
          recurringBranchesPreserved: 2,
          failures: 3,
        }),
      })

      expect(state.phase).toBe('summary')
      expect(state.projectStats).toMatchObject({
        archiveAttempts: 1,
        projectsArchived: 0,
        tasksKeptOpen: 3,
        recurringBranchesPreserved: 2,
        failures: 3,
      })
    })

    test('rejects bulk archiving for a project with Subprojects', () => {
      const state = weeklyReviewReducer(weeklyInitialState, {
        type: 'START',
        inboxTasks: [],
        projects: [project('parent', [], 1), project('child')],
        somedayTasks: [],
        upcomingTasks: [],
      })

      const next = weeklyReviewReducer(state, {
        type: 'PROJECT_ACTION',
        action: 'archive',
        projectId: 'parent',
        result: archiveResult('keep_open'),
      })

      expect(next).toBe(state)
      expect(next.projectIndex).toBe(0)
      expect(next.projectStats.archiveAttempts).toBe(0)
    })
  })

  test('allows Project deletion only when the Project is empty', () => {
    const nonEmptyState = weeklyReviewReducer(weeklyInitialState, {
      type: 'START',
      inboxTasks: [],
      projects: [project('non-empty', [task('task')])],
      somedayTasks: [],
      upcomingTasks: [],
    })
    expect(weeklyReviewReducer(nonEmptyState, {
      type: 'PROJECT_ACTION',
      action: 'deleted_project',
    })).toBe(nonEmptyState)

    const emptyState = weeklyReviewReducer(weeklyInitialState, {
      type: 'START',
      inboxTasks: [],
      projects: [project('empty')],
      somedayTasks: [],
      upcomingTasks: [],
    })
    const deleted = weeklyReviewReducer(emptyState, {
      type: 'PROJECT_ACTION',
      action: 'deleted_project',
    })
    expect(deleted.phase).toBe('summary')
    expect(deleted.projectStats.projectsDeleted).toBe(1)
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
