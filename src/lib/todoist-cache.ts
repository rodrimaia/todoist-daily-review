import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'

/** Marks Todoist reads stale and refetches mounted reads without blocking review advancement. */
export function invalidateTodoistCache(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey })
}

/** Cancels account-scoped reads before removing every cached account value. */
export async function clearTodoistCache(queryClient: QueryClient): Promise<void> {
  const cancellation = queryClient.cancelQueries({ queryKey: queryKeys.todoist })
  queryClient.clear()
  await cancellation
}
