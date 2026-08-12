import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'

/** Marks one Todoist query family stale and refreshes mounted reads in the background. */
export function invalidateTodoistCache(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey })
}

/** Cancels account-scoped reads and synchronously removes every cached account value. */
export async function clearTodoistCache(queryClient: QueryClient): Promise<void> {
  const cancellation = queryClient.cancelQueries({ queryKey: queryKeys.todoist })
  queryClient.clear()
  await cancellation
}
