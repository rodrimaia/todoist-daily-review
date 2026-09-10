import { describe, expect, test } from 'bun:test'
import type { Task } from '@doist/todoist-sdk'
import { InMemoryTodoistAdapter } from '@todoist-review/todoist'
import { applyDailyReviewAction, createDailyReviewState, loadDailyReview, renameDailyReviewTask } from './index'

const task = (id: string, projectId = 'inbox'): Task => ({
  id, content: id, description: '', projectId, sectionId: '0', parentId: '',
  order: 1, priority: 1, labels: [], due: null, url: '',
  createdAt: '2026-01-01T00:00:00Z', creatorId: 'u', assigneeId: null,
} as Task)

describe('shared Daily Review behavior', () => {
  test('loads all pages and keeps inbox/filter results independent', async () => {
    const api = new InMemoryTodoistAdapter({ tasks: [task('one'), task('two')] })
    const snapshot = await loadDailyReview(api, 'today')
    expect(snapshot.inboxTasks.map((item) => item.id)).toEqual(['one', 'two'])
    expect(snapshot.filterTasks.map((item) => item.id)).toEqual(['one', 'two'])
    expect(api.calls.filter((call) => call.method === 'getTasksByFilter')).toHaveLength(2)
  })

  test('routes decisions through TodoistPort', async () => {
    const api = new InMemoryTodoistAdapter({ tasks: [task('one')] })
    await applyDailyReviewAction(api, { type: 'rename', taskId: 'one', content: 'renamed' })
    await applyDailyReviewAction(api, { type: 'schedule', taskId: 'one', dueString: 'tomorrow' })
    await applyDailyReviewAction(api, { type: 'complete', taskId: 'one' })
    expect(api.tasks[0].content).toBe('renamed')
    expect(api.tasks[0].due?.string).toBeUndefined()
    expect(api.calls.map((call) => call.method)).toContain('closeTask')
  })

  test('moves an Inbox task and applies the selected project follow-up', async () => {
    const api = new InMemoryTodoistAdapter({ tasks: [task('one')] })

    await applyDailyReviewAction(api, {
      type: 'move_to_project',
      taskId: 'one',
      projectId: 'work',
      dueString: 'tomorrow',
      labels: ['next_action'],
    })

    expect(api.tasks[0]?.projectId).toBe('work')
    expect(api.calls).toEqual([
      { method: 'moveTask', args: ['one', { projectId: 'work' }] },
      { method: 'getTask', args: ['one'] },
      { method: 'updateTask', args: ['one', { dueString: 'tomorrow', labels: ['next_action'] }] },
      { method: 'getTask', args: ['one'] },
    ])
  })

  test('renames the current task without advancing the review', () => {
    const state = createDailyReviewState({ inboxTasks: [task('one')], filterTasks: [], projects: [] })
    const renamed = renameDailyReviewTask(state, 'one', 'renamed')

    expect(renamed.index).toBe(0)
    expect(renamed.phase).toBe('inbox')
    expect(renamed.actions).toEqual([])
    expect(renamed.inboxTasks[0]?.content).toBe('renamed')
  })
})
