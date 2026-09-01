import { describe, expect, test } from 'bun:test'
import type { Task } from '@doist/todoist-sdk'
import {
  archiveProjectWithTaskDisposition,
  buildProjectArchivePlan,
  buildProjectTaskTree,
  type ProjectArchiveApi,
} from './project-archive'

function task(
  id: string,
  parentId: string | null = null,
  options: { recurring?: boolean; completed?: boolean; deleted?: boolean } = {},
): Task {
  return {
    id,
    parentId,
    checked: options.completed ?? false,
    completedAt: options.completed ? '2030-01-01T00:00:00Z' : null,
    isDeleted: options.deleted ?? false,
    due: options.recurring
      ? { date: '2030-01-01', string: 'every week', isRecurring: true }
      : null,
  } as Task
}

function apiWithEvents(
  events: string[],
  failures: Set<string> = new Set(),
): ProjectArchiveApi {
  async function record(event: string) {
    events.push(event)
    if (failures.has(event)) throw new Error('rejected')
  }

  return {
    closeTask: (id) => record(`close:${id}`),
    deleteTask: (id) => record(`delete:${id}`),
    archiveProject: (id) => record(`archive:${id}`),
  }
}

describe('Project archive task tree', () => {
  test('builds nested Subtasks at every depth and excludes completed or deleted tasks', () => {
    const roots = buildProjectTaskTree([
      task('root'),
      task('child', 'root'),
      task('grandchild', 'child'),
      task('completed', null, { completed: true }),
      task('active-child-of-completed', 'completed'),
      task('deleted', null, { deleted: true }),
    ])

    expect(roots.map((node) => node.task.id)).toEqual(['root', 'active-child-of-completed'])
    expect(roots[0]?.children[0]?.task.id).toBe('child')
    expect(roots[0]?.children[0]?.children[0]?.task.id).toBe('grandchild')
  })

  test('preserves an entire top-level branch when any descendant is recurring', () => {
    const plan = buildProjectArchivePlan([
      task('safe-root'),
      task('safe-child', 'safe-root'),
      task('safe-grandchild', 'safe-child'),
      task('preserved-root'),
      task('preserved-sibling', 'preserved-root'),
      task('recurring-grandchild', 'preserved-sibling', { recurring: true }),
    ])

    expect(plan.activeTaskCount).toBe(6)
    expect(plan.eligibleTaskCount).toBe(3)
    expect(plan.preservedTaskCount).toBe(3)
    expect(plan.recurringTaskCount).toBe(1)
    expect(plan.eligibleBranches.map((branch) => branch.root.id)).toEqual(['safe-root'])
    expect(plan.recurringBranches.map((branch) => branch.root.id)).toEqual(['preserved-root'])
  })
})

describe('Project archive Todoist operations', () => {
  test('completes safe branches through their roots, preserves recurring branches, then archives', async () => {
    const events: string[] = []
    const result = await archiveProjectWithTaskDisposition(apiWithEvents(events), {
      projectId: 'project',
      choice: 'complete_tasks',
      tasks: [
        task('safe-root'),
        task('safe-child', 'safe-root'),
        task('safe-grandchild', 'safe-child'),
        task('recurring-root'),
        task('recurring-child', 'recurring-root', { recurring: true }),
      ],
    })

    expect(events).toEqual(['close:safe-root', 'archive:project'])
    expect(result).toMatchObject({
      choice: 'complete_tasks',
      projectArchived: true,
      keptOpenTasks: 2,
      completedTasks: 3,
      deletedTasks: 0,
      recurringBranchesPreserved: 1,
      recurringTasksPreserved: 1,
      failures: 0,
    })
    expect(result.disposedTaskIds).toEqual(['safe-root', 'safe-child', 'safe-grandchild'])
  })

  test('continues deleting later branches after a rejection and archives last', async () => {
    const events: string[] = []
    const result = await archiveProjectWithTaskDisposition(
      apiWithEvents(events, new Set(['delete:first'])),
      {
        projectId: 'project',
        choice: 'delete_tasks',
        tasks: [task('first'), task('second'), task('second-child', 'second')],
      },
    )

    expect(events).toEqual(['delete:first', 'delete:second', 'archive:project'])
    expect(result.deletedTasks).toBe(2)
    expect(result.disposedTaskIds).toEqual(['second', 'second-child'])
    expect(result.failures).toBe(1)
    expect(result.projectArchived).toBe(true)
  })

  test('keeps every open task unchanged and still reports an archive failure', async () => {
    const events: string[] = []
    const result = await archiveProjectWithTaskDisposition(
      apiWithEvents(events, new Set(['archive:project'])),
      {
        projectId: 'project',
        choice: 'keep_open',
        tasks: [task('one'), task('recurring', null, { recurring: true })],
      },
    )

    expect(events).toEqual(['archive:project'])
    expect(result).toMatchObject({
      projectArchived: false,
      keptOpenTasks: 2,
      completedTasks: 0,
      deletedTasks: 0,
      recurringBranchesPreserved: 1,
      failures: 1,
    })
    expect(result.disposedTaskIds).toEqual([])
  })
})
