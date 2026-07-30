import type { QueryClient } from '@tanstack/react-query'
import {
  clearToken,
  setToken,
  TODOIST_TOKEN_STORAGE_KEY,
} from './storage'
import { clearTodoistCache } from './todoist-cache'
import { resetTodoistApi } from './todoist'

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

    void clearTodoistCache(queryClient)
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

  if (token) setToken(token)
  else clearToken()

  resetTodoistApi()
}
