import { expect, test } from 'bun:test'
import type { Task } from '@doist/todoist-sdk'
import {
  InMemoryTodoistAdapter,
  TodoistAdapter,
  TodoistAdapterError,
  getAllPages,
} from './index'

const task = (id: string) => ({
  id,
  content: id,
  projectId: 'project',
  labels: [],
  due: null,
  completedAt: null,
} as unknown as Task)

test('getAllPages follows cursors without exposing credentials', async () => {
  const calls: Array<{ cursor?: string }> = []
  const items = await getAllPages(async (args) => {
    calls.push(args ?? {})
    return args?.cursor
      ? { results: [task('second')], nextCursor: null }
      : { results: [task('first')], nextCursor: 'next' }
  })

  expect(items.map((item) => item.id)).toEqual(['first', 'second'])
  expect(calls).toEqual([{}, { cursor: 'next' }])
  expect(JSON.stringify(calls)).not.toContain('token')
})

test('TodoistAdapter passes an explicit token to the SDK factory and translates errors', async () => {
  let receivedToken = ''
  const api = {
    getUser: async () => { throw new Error('bad request') },
  }
  const adapter = new TodoistAdapter('explicit-secret', (token) => {
    receivedToken = token
    return api as never
  })

  expect(receivedToken).toBe('explicit-secret')
  await expect(adapter.getUser()).rejects.toMatchObject({
    name: 'TodoistAdapterError',
    operation: 'getUser',
  })
  await expect(adapter.getUser()).rejects.not.toHaveProperty('message', expect.stringContaining('explicit-secret'))
})

test('in-memory adapter records request arguments and paginates', async () => {
  const adapter = new InMemoryTodoistAdapter({ tasks: [task('one'), task('two')] })
  const page = await adapter.getTasks({ cursor: '1' })
  await adapter.getTasksByFilter({ query: '@next_action' })

  expect(page.results.map((item) => item.id)).toEqual(['two'])
  expect(adapter.calls).toEqual([
    { method: 'getTasks', args: [{ cursor: '1' }] },
    { method: 'getTasksByFilter', args: [{ query: '@next_action' }] },
  ])
})

test('TodoistAdapterError has a stable operation and safe message', () => {
  const error = new TodoistAdapterError('updateTask', new Error('secret-token'))
  expect(error.message).toBe('Todoist updateTask failed')
  expect(error.operation).toBe('updateTask')
})
