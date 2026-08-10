import type { QueryClient } from '@tanstack/react-query'
import { clearToken, setToken, setPreferences } from './storage'
import { clearTodoistCache } from './todoist-cache'
import { resetTodoistApi } from './todoist'

export async function replaceTodoistToken(
  queryClient: QueryClient,
  token: string | null,
): Promise<void> {
  await clearTodoistCache(queryClient)

  if (token) setToken(token)
  else clearToken()

  // Clear the Review tracking task ID so a task from one account
  // is never used with another account.
  setPreferences({ reviewTrackingTaskId: null })

  resetTodoistApi()
}
