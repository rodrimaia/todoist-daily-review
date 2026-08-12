import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'
import {
  getPreferences,
  getToken,
  setPreferences,
  setToken,
  TODOIST_TOKEN_STORAGE_KEY,
} from './storage'
import {
  observeTodoistTokenChanges,
  replaceTodoistToken,
} from './todoist-session'

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

function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function dispatchStorage(key: string | null): void {
  const event = new Event('storage')
  Object.defineProperties(event, {
    key: { value: key },
    storageArea: { value: localStorage },
  })
  window.dispatchEvent(event)
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: memoryStorage(),
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: new EventTarget(),
  })
})

afterEach(() => {
  delete (globalThis as { localStorage?: Storage }).localStorage
  delete (globalThis as { window?: Window }).window
})

describe('Todoist identity changes', () => {
  test('clears cache and account-scoped preferences before replacing the token', async () => {
    const queryClient = createQueryClient()
    setToken('old-secret')
    setPreferences({
      filterQuery: 'shared filter',
      somedayProjectId: 'old-project',
      excludeProjectPrefixes: 'shared prefix',
      appearance: 'dark',
      reviewTrackingTaskId: 'old-task',
    })
    queryClient.setQueryData(queryKeys.projects, ['old-account'])

    const writeToken = localStorage.setItem.bind(localStorage)
    let cacheAtTokenWrite: unknown = 'token was not written'
    let preferencesAtTokenWrite = getPreferences()
    localStorage.setItem = (key, value) => {
      if (key === TODOIST_TOKEN_STORAGE_KEY && value === 'new-secret') {
        cacheAtTokenWrite = queryClient.getQueryData(queryKeys.projects)
        preferencesAtTokenWrite = getPreferences()
      }
      writeToken(key, value)
    }

    await replaceTodoistToken(queryClient, 'new-secret')

    expect(getToken()).toBe('new-secret')
    expect(cacheAtTokenWrite).toBeUndefined()
    expect(preferencesAtTokenWrite.somedayProjectId).toBeNull()
    expect(preferencesAtTokenWrite.reviewTrackingTaskId).toBeNull()
    expect(getPreferences()).toEqual({
      filterQuery: 'shared filter',
      somedayProjectId: null,
      excludeProjectPrefixes: 'shared prefix',
      appearance: 'dark',
      reviewTrackingTaskId: null,
    })
  })

  test('clearing the token also clears cache and account-scoped preferences', async () => {
    const queryClient = createQueryClient()
    setToken('secret')
    setPreferences({
      somedayProjectId: 'old-project',
      reviewTrackingTaskId: 'old-task',
    })
    queryClient.setQueryData(queryKeys.inboxTasks, ['private-task'])

    await replaceTodoistToken(queryClient, null)

    expect(getToken()).toBeNull()
    expect(queryClient.getQueryData(queryKeys.inboxTasks)).toBeUndefined()
    expect(getPreferences().somedayProjectId).toBeNull()
    expect(getPreferences().reviewTrackingTaskId).toBeNull()
  })

  test('clears old account state and notifies the app after another tab replaces the token', () => {
    const queryClient = createQueryClient()
    setToken('old-secret')
    setPreferences({
      somedayProjectId: 'old-project',
      reviewTrackingTaskId: 'old-task',
    })
    queryClient.setQueryData(queryKeys.projects, ['old-account'])
    const observedTokens: Array<string | null> = []
    const unsubscribe = observeTodoistTokenChanges(queryClient, () => {
      observedTokens.push(getToken())
    })

    // Model localStorage after the browser has persisted another tab's write.
    setToken('new-secret')
    dispatchStorage(TODOIST_TOKEN_STORAGE_KEY)

    expect(queryClient.getQueryData(queryKeys.projects)).toBeUndefined()
    expect(getPreferences().somedayProjectId).toBeNull()
    expect(getPreferences().reviewTrackingTaskId).toBeNull()
    expect(observedTokens).toEqual(['new-secret'])

    unsubscribe()
    setToken('third-secret')
    dispatchStorage(TODOIST_TOKEN_STORAGE_KEY)
    expect(observedTokens).toEqual(['new-secret'])
  })

  test('notifies the app after another tab removes persistent storage', () => {
    const queryClient = createQueryClient()
    setToken('secret')
    queryClient.setQueryData(queryKeys.inboxTasks, ['old-account'])
    const observedTokens: Array<string | null> = []
    const unsubscribe = observeTodoistTokenChanges(queryClient, () => {
      observedTokens.push(getToken())
    })

    localStorage.clear()
    dispatchStorage(null)

    expect(queryClient.getQueryData(queryKeys.inboxTasks)).toBeUndefined()
    expect(observedTokens).toEqual([null])
    unsubscribe()
  })

  test('ignores unrelated persistent preference changes', () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(queryKeys.projects, ['current-account'])
    let identityChanges = 0
    const unsubscribe = observeTodoistTokenChanges(queryClient, () => {
      identityChanges++
    })

    dispatchStorage('todoist-review-preferences')

    expect(queryClient.getQueryData<string[]>(queryKeys.projects)).toEqual(['current-account'])
    expect(identityChanges).toBe(0)
    unsubscribe()
  })
})
