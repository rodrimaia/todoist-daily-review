import type { QueryClient } from '@tanstack/react-query'
import { clearToken, setToken } from './storage'
import { clearTodoistCache } from './todoist-cache'
import { resetTodoistApi } from './todoist'

export async function replaceTodoistToken(
  queryClient: QueryClient,
  token: string | null,
): Promise<void> {
  await clearTodoistCache(queryClient)

  if (token) setToken(token)
  else clearToken()

  resetTodoistApi()
}
