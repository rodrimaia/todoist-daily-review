import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'
import {
  getPreferences,
  getToken,
  getTokenPersistence,
  setPreferences,
  setToken,
  TODOIST_TOKEN_STORAGE_KEY,
} from './storage'
import {
  observeTodoistTokenChanges,
  replaceTodoistToken,
  setTodoistTokenPersistence,
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

function dispatchLocalStorage(
  key: string | null,
  oldValue: string | null,
  newValue: string | null,
): void {
  const event = new Event('storage')
  Object.defineProperties(event, {
    key: { value: key },
    oldValue: { value: oldValue },
    newValue: { value: newValue },
    storageArea: { value: localStorage },
  })
  window.dispatchEvent(event)
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: memoryStorage(),
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
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
  delete (globalThis as { sessionStorage?: Storage }).sessionStorage
  delete (globalThis as { window?: Window }).window
})

describe('Todoist token persistence', () => {
  test('stores a newly entered token in the browser-tab session by default', async () => {
    await replaceTodoistToken(createQueryClient(), 'temporary-secret')

    expect(getToken()).toBe('temporary-secret')
    expect(getTokenPersistence()).toBe('temporary')
    expect(sessionStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBe('temporary-secret')
    expect(localStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBeNull()

    // A reload reads the same browser storage again rather than relying on memory.
    expect(getToken()).toBe('temporary-secret')
  })

  test('stores a token persistently only when remembered is selected', async () => {
    await replaceTodoistToken(createQueryClient(), 'remembered-secret', 'remembered')

    expect(getToken()).toBe('remembered-secret')
    expect(getTokenPersistence()).toBe('remembered')
    expect(localStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBe('remembered-secret')
    expect(sessionStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBeNull()
  })

  test('treats a token from the legacy localStorage location as remembered', () => {
    localStorage.setItem(TODOIST_TOKEN_STORAGE_KEY, 'legacy-secret')

    expect(getToken()).toBe('legacy-secret')
    expect(getTokenPersistence()).toBe('remembered')
  })

  test('resolves conflicting copies deterministically in favor of the remembered token', () => {
    sessionStorage.setItem(TODOIST_TOKEN_STORAGE_KEY, 'stale-temporary-secret')
    localStorage.setItem(TODOIST_TOKEN_STORAGE_KEY, 'remembered-secret')

    expect(getToken()).toBe('remembered-secret')
    expect(getTokenPersistence()).toBe('remembered')
    expect(sessionStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBeNull()
  })

  test('moves the same token between storage scopes without resetting account state', async () => {
    const queryClient = createQueryClient()
    await replaceTodoistToken(queryClient, 'same-secret')
    setPreferences({
      somedayProjectId: 'current-project',
      reviewTrackingTaskId: 'current-task',
    })
    queryClient.setQueryData(queryKeys.projects, ['current-account'])

    setTodoistTokenPersistence('remembered')

    expect(getTokenPersistence()).toBe('remembered')
    expect(localStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBe('same-secret')
    expect(sessionStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBeNull()
    expect(queryClient.getQueryData<string[]>(queryKeys.projects)).toEqual([
      'current-account',
    ])
    expect(getPreferences().somedayProjectId).toBe('current-project')
    expect(getPreferences().reviewTrackingTaskId).toBe('current-task')

    setTodoistTokenPersistence('temporary')

    expect(getTokenPersistence()).toBe('temporary')
    expect(sessionStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBe('same-secret')
    expect(localStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBeNull()
  })
})

describe('Todoist identity changes', () => {
  test('clears cache and account-scoped preferences before replacing a remembered token', async () => {
    const queryClient = createQueryClient()
    setToken('old-secret', 'remembered')
    setPreferences({
      filterQuery: 'shared filter',
      somedayProjectId: 'old-project',
      excludeProjectPrefixes: 'shared prefix',
      appearance: 'dark',
      reviewTrackingTaskId: 'old-task',
    })
    queryClient.setQueryData(queryKeys.projects, ['old-account'])

    const writeToken = sessionStorage.setItem.bind(sessionStorage)
    let cacheAtTokenWrite: unknown = 'token was not written'
    let preferencesAtTokenWrite = getPreferences()
    sessionStorage.setItem = (key, value) => {
      if (key === TODOIST_TOKEN_STORAGE_KEY && value === 'new-secret') {
        cacheAtTokenWrite = queryClient.getQueryData(queryKeys.projects)
        preferencesAtTokenWrite = getPreferences()
      }
      writeToken(key, value)
    }

    await replaceTodoistToken(queryClient, 'new-secret')

    expect(getToken()).toBe('new-secret')
    expect(getTokenPersistence()).toBe('temporary')
    expect(localStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBeNull()
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

  test('replaces a temporary token with a remembered token and removes the old copy', async () => {
    const queryClient = createQueryClient()
    setToken('old-secret', 'temporary')
    queryClient.setQueryData(queryKeys.user, { id: 'old-account' })

    await replaceTodoistToken(queryClient, 'new-secret', 'remembered')

    expect(getToken()).toBe('new-secret')
    expect(getTokenPersistence()).toBe('remembered')
    expect(localStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBe('new-secret')
    expect(sessionStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBeNull()
    expect(queryClient.getQueryData(queryKeys.user)).toBeUndefined()
  })

  test('clearing removes temporary and remembered copies and account state', async () => {
    const queryClient = createQueryClient()
    sessionStorage.setItem(TODOIST_TOKEN_STORAGE_KEY, 'temporary-secret')
    localStorage.setItem(TODOIST_TOKEN_STORAGE_KEY, 'remembered-secret')
    setPreferences({
      somedayProjectId: 'old-project',
      reviewTrackingTaskId: 'old-task',
    })
    queryClient.setQueryData(queryKeys.inboxTasks, ['private-task'])

    await replaceTodoistToken(queryClient, null)

    expect(getToken()).toBeNull()
    expect(getTokenPersistence()).toBeNull()
    expect(sessionStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBeNull()
    expect(queryClient.getQueryData(queryKeys.inboxTasks)).toBeUndefined()
    expect(getPreferences().somedayProjectId).toBeNull()
    expect(getPreferences().reviewTrackingTaskId).toBeNull()
  })

  test('adopts another tab remembered token after clearing old account state', () => {
    const queryClient = createQueryClient()
    setToken('old-secret', 'temporary')
    setPreferences({
      somedayProjectId: 'old-project',
      reviewTrackingTaskId: 'old-task',
    })
    queryClient.setQueryData(queryKeys.projects, ['old-account'])
    const observedTokens: Array<string | null> = []
    const unsubscribe = observeTodoistTokenChanges(queryClient, () => {
      observedTokens.push(getToken())
    })

    // Model localStorage after another tab has remembered a different token.
    localStorage.setItem(TODOIST_TOKEN_STORAGE_KEY, 'new-secret')
    dispatchLocalStorage(TODOIST_TOKEN_STORAGE_KEY, null, 'new-secret')

    expect(sessionStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBeNull()
    expect(queryClient.getQueryData(queryKeys.projects)).toBeUndefined()
    expect(getPreferences().somedayProjectId).toBeNull()
    expect(getPreferences().reviewTrackingTaskId).toBeNull()
    expect(observedTokens).toEqual(['new-secret'])

    unsubscribe()
    localStorage.setItem(TODOIST_TOKEN_STORAGE_KEY, 'third-secret')
    dispatchLocalStorage(TODOIST_TOKEN_STORAGE_KEY, 'new-secret', 'third-secret')
    expect(observedTokens).toEqual(['new-secret'])
  })

  test('adopts the remembered scope without resetting state when the account is unchanged', () => {
    const queryClient = createQueryClient()
    setToken('same-secret', 'temporary')
    setPreferences({
      somedayProjectId: 'current-project',
      reviewTrackingTaskId: 'current-task',
    })
    queryClient.setQueryData(queryKeys.projects, ['current-account'])
    let identityChanges = 0
    const unsubscribe = observeTodoistTokenChanges(queryClient, () => {
      identityChanges++
    })

    localStorage.setItem(TODOIST_TOKEN_STORAGE_KEY, 'same-secret')
    dispatchLocalStorage(TODOIST_TOKEN_STORAGE_KEY, null, 'same-secret')

    expect(getTokenPersistence()).toBe('remembered')
    expect(sessionStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)).toBeNull()
    expect(queryClient.getQueryData<string[]>(queryKeys.projects)).toEqual([
      'current-account',
    ])
    expect(getPreferences().somedayProjectId).toBe('current-project')
    expect(getPreferences().reviewTrackingTaskId).toBe('current-task')
    expect(identityChanges).toBe(0)
    unsubscribe()
  })

  test('notifies the app after another tab removes remembered storage', () => {
    const queryClient = createQueryClient()
    setToken('secret', 'remembered')
    queryClient.setQueryData(queryKeys.inboxTasks, ['old-account'])
    const observedTokens: Array<string | null> = []
    const unsubscribe = observeTodoistTokenChanges(queryClient, () => {
      observedTokens.push(getToken())
    })

    localStorage.removeItem(TODOIST_TOKEN_STORAGE_KEY)
    dispatchLocalStorage(TODOIST_TOKEN_STORAGE_KEY, 'secret', null)

    expect(queryClient.getQueryData(queryKeys.inboxTasks)).toBeUndefined()
    expect(observedTokens).toEqual([null])
    unsubscribe()
  })

  test('clears a temporary copy when another tab clears all persistent storage', () => {
    const queryClient = createQueryClient()
    setToken('temporary-secret', 'temporary')
    queryClient.setQueryData(queryKeys.inboxTasks, ['old-account'])
    let identityChanges = 0
    const unsubscribe = observeTodoistTokenChanges(queryClient, () => {
      identityChanges++
    })

    localStorage.clear()
    dispatchLocalStorage(null, null, null)

    expect(getToken()).toBeNull()
    expect(queryClient.getQueryData(queryKeys.inboxTasks)).toBeUndefined()
    expect(identityChanges).toBe(1)
    unsubscribe()
  })

  test('ignores unrelated persistent preference changes', () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(queryKeys.projects, ['current-account'])
    let identityChanges = 0
    const unsubscribe = observeTodoistTokenChanges(queryClient, () => {
      identityChanges++
    })

    dispatchLocalStorage('todoist-review-preferences', null, '{}')

    expect(queryClient.getQueryData<string[]>(queryKeys.projects)).toEqual(['current-account'])
    expect(identityChanges).toBe(0)
    unsubscribe()
  })
})
