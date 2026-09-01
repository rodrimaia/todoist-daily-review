import { describe, expect, test } from 'bun:test'
import type { Task } from '@doist/todoist-sdk'
import type { ProjectArchiveApi } from './project-archive'
import { runProjectArchiveMutation } from './mutations'

function task(id: string): Task {
  return {
    id,
    parentId: null,
    completedAt: null,
    checked: false,
    isDeleted: false,
    due: null,
  } as Task
}

describe('Project archive mutation boundary', () => {
  test('invalidates project and task caches after all best-effort API calls', async () => {
    const events: string[] = []
    const api: ProjectArchiveApi = {
      closeTask: async (id) => {
        events.push(`close:${id}`)
        if (id === 'rejected') throw new Error('rejected')
      },
      deleteTask: async (id) => {
        events.push(`delete:${id}`)
      },
      archiveProject: async (id) => {
        events.push(`archive:${id}`)
      },
    }

    const result = await runProjectArchiveMutation(
      {
        projectId: 'project',
        choice: 'complete_tasks',
        tasks: [task('rejected'), task('successful')],
      },
      {
        api,
        invalidateProjects: () => events.push('invalidate:projects'),
        invalidateTasks: () => events.push('invalidate:tasks'),
      },
    )

    expect(events).toEqual([
      'close:rejected',
      'close:successful',
      'archive:project',
      'invalidate:projects',
      'invalidate:tasks',
    ])
    expect(result).toMatchObject({
      projectArchived: true,
      completedTasks: 1,
      failures: 1,
    })
  })
})
