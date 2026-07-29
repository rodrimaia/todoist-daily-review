import { describe, expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'
import { clearTodoistCache, invalidateTodoistCache } from './todoist-cache'

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('Todoist cache coherence', () => {
  test('invalidates all Todoist query families after a successful mutation', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(queryKeys.projects, ['project'])
    queryClient.setQueryData(queryKeys.inboxTasks, ['task'])

    await invalidateTodoistCache(queryClient)

    expect(queryClient.getQueryState(queryKeys.projects)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(queryKeys.inboxTasks)?.isInvalidated).toBe(true)
  })

  test('discards an old account read that finishes after identity clearing', async () => {
    const queryClient = createQueryClient()
    let finishOldRead: ((value: string[]) => void) | undefined
    const oldRead = queryClient.fetchQuery({
      queryKey: queryKeys.projects,
      queryFn: () => new Promise<string[]>((resolve) => {
        finishOldRead = resolve
      }),
    }).catch(() => undefined)

    await Promise.resolve()
    await clearTodoistCache(queryClient)
    finishOldRead?.(['late-old-account'])
    await oldRead

    expect(queryClient.getQueryData(queryKeys.projects)).toBeUndefined()
  })

  test('clears fresh account data so the same key fetches the new identity', async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(queryKeys.projects, ['old-account'])

    await clearTodoistCache(queryClient)

    let calls = 0
    const result = await queryClient.fetchQuery({
      queryKey: queryKeys.projects,
      queryFn: async () => {
        calls++
        return ['new-account']
      },
    })

    expect(result).toEqual(['new-account'])
    expect(calls).toBe(1)
  })
})
