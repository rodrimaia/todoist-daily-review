import { Outlet } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppearance } from '~/lib/use-appearance'
import { TodoistWriteError } from '~/components/TodoistWriteError'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

export function RootComponent() {
  useAppearance()

  return (
    <QueryClientProvider client={queryClient}>
      <TodoistWriteError />
      <Outlet />
    </QueryClientProvider>
  )
}
