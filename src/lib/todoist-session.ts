import type { QueryClient } from '@tanstack/react-query'
import {
  clearToken,
  setPreferences,
  setToken,
  TODOIST_TOKEN_STORAGE_KEY,
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

export async function replaceTodoistToken(
  queryClient: QueryClient,
  token: string | null,
): Promise<void> {
  await clearTodoistCache(queryClient)
  resetTodoistAccountPreferences()
  resetTodoistApi()

  if (token) setToken(token)
  else clearToken()
}
