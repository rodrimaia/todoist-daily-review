import { describe, expect, test } from 'bun:test'
import { queryKeys } from './query-keys'

describe('Todoist query keys', () => {
  test('describe data scope without embedding an account token', () => {
    const keys = [
      queryKeys.todoist,
      queryKeys.user,
      queryKeys.projects,
      queryKeys.tasks,
      queryKeys.inboxTasks,
      queryKeys.filterTasks('@next_action'),
      queryKeys.todayTasks,
      queryKeys.projectTasks('project-id'),
      queryKeys.somedayTasks('someday-project-id'),
      queryKeys.upcomingTasks,
      queryKeys.allTasks,
    ]

    expect(keys).toEqual([
      ['todoist'],
      ['todoist', 'user'],
      ['todoist', 'projects'],
      ['todoist', 'tasks'],
      ['todoist', 'tasks', 'inbox'],
      ['todoist', 'tasks', 'filter', '@next_action'],
      ['todoist', 'tasks', 'today'],
      ['todoist', 'tasks', 'project', 'project-id'],
      ['todoist', 'tasks', 'someday', 'someday-project-id'],
      ['todoist', 'tasks', 'upcoming'],
      ['todoist', 'tasks', 'all'],
    ])
  })
})
