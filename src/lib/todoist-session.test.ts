import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'
import { getToken, setToken } from './storage'
import { replaceTodoistToken } from './todoist-session'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(key)
    },
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: memoryStorage(),
  })
})

afterEach(() => {
  delete (globalThis as { localStorage?: Storage }).localStorage
})

describe('Todoist identity changes', () => {
  test('replaces the token only after clearing old account cache data', async () => {
    const queryClient = new QueryClient()
    setToken('old-secret')
    queryClient.setQueryData(queryKeys.projects, ['old-account'])

    await replaceTodoistToken(queryClient, 'new-secret')

    expect(getToken()).toBe('new-secret')
    expect(queryClient.getQueryData(queryKeys.projects)).toBeUndefined()
    expect(JSON.stringify(queryKeys.projects)).not.toContain('new-secret')
  })

  test('clearing the token also clears cached account data', async () => {
    const queryClient = new QueryClient()
    setToken('secret')
    queryClient.setQueryData(queryKeys.inboxTasks, ['private-task'])

    await replaceTodoistToken(queryClient, null)

    expect(getToken()).toBeNull()
    expect(queryClient.getQueryData(queryKeys.inboxTasks)).toBeUndefined()
  })
})
