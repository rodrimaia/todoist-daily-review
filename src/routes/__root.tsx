import { useEffect } from 'react'
import { Outlet, useRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppearance } from '~/lib/use-appearance'
import { observeTodoistTokenChanges } from '~/lib/todoist-session'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

export function RootComponent() {
  const router = useRouter()
  useAppearance()

  useEffect(
    () =>
      observeTodoistTokenChanges(queryClient, () => {
        void router.navigate({ to: '/', replace: true })
      }),
    [router],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  )
}
