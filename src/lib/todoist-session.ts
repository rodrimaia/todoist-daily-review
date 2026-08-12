import type { QueryClient } from '@tanstack/react-query'
import {
  clearToken,
  getToken,
  setPreferences,
  setToken,
  TODOIST_TOKEN_STORAGE_KEY,
  type TodoistTokenPersistence,
} from './storage'
import { clearTodoistCache } from './todoist-cache'
import { resetTodoistApi } from './todoist'

function resetTodoistAccountPreferences(): void {
  setPreferences({
    somedayProjectId: null,
    reviewTrackingTaskId: null,
  })
}

export function observeTodoistTokenChanges(
  queryClient: QueryClient,
  onIdentityChange: () => void,
): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (
      event.storageArea !== localStorage ||
      (event.key !== TODOIST_TOKEN_STORAGE_KEY && event.key !== null)
    ) {
      return
    }

    const temporaryToken = sessionStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)
    const previousToken = temporaryToken ?? event.oldValue

    // Persistent changes are authoritative across tabs. Discarding this tab's
    // temporary copy first prevents a stale session from masking the new value.
    sessionStorage.removeItem(TODOIST_TOKEN_STORAGE_KEY)
    const nextToken = localStorage.getItem(TODOIST_TOKEN_STORAGE_KEY)

    if (event.key !== null && previousToken === nextToken) {
      return
    }

    // Clearing starts synchronously, before the routed UI can remount for the
    // token value that localStorage has already received from the other tab.
    void clearTodoistCache(queryClient)
    resetTodoistAccountPreferences()
    resetTodoistApi()
    onIdentityChange()
  }

  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}

export function setTodoistTokenPersistence(
  persistence: TodoistTokenPersistence,
): void {
  const token = getToken()
  if (!token) throw new Error('No API token configured')
  setToken(token, persistence)
}

export async function replaceTodoistToken(
  queryClient: QueryClient,
  token: string | null,
  persistence: TodoistTokenPersistence = 'temporary',
): Promise<void> {
  if (token && token === getToken()) {
    setToken(token, persistence)
    return
  }

  await clearTodoistCache(queryClient)
  resetTodoistAccountPreferences()
  resetTodoistApi()

  if (token) setToken(token, persistence)
  else clearToken()
}
