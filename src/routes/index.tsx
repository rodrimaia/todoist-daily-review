import { useState, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { ApiTokenForm } from '~/components/ApiTokenForm'
import { getToken } from '~/lib/storage'
import { getTodoistApi } from '~/lib/todoist'
import { queryKeys } from '~/lib/query-keys'
import { getPreferences } from '~/lib/storage'
import { Inbox, ListChecks, Settings } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  ssr: false,
  component: Home,
})

function Home() {
  const [hasToken, setHasToken] = useState(() => !!getToken())
  const navigate = useNavigate()

  const handleTokenSaved = useCallback(() => {
    setHasToken(true)
  }, [])

  if (!hasToken) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <ApiTokenForm onSaved={handleTokenSaved} />
      </div>
    )
  }

  return <Dashboard />
}

function Dashboard() {
  const navigate = useNavigate()
  const prefs = getPreferences()

  const { data: inboxData, isLoading: inboxLoading } = useQuery({
    queryKey: queryKeys.inboxTasks,
    queryFn: async () => {
      const api = getTodoistApi()
      return api.getTasksByFilter({ query: '#Inbox' })
    },
  })

  const { data: filterData, isLoading: filterLoading } = useQuery({
    queryKey: queryKeys.filterTasks(prefs.filterQuery),
    queryFn: async () => {
      const api = getTodoistApi()
      return api.getTasksByFilter({ query: prefs.filterQuery })
    },
  })

  const inboxCount = inboxData?.results?.length ?? 0
  const filterCount = filterData?.results?.length ?? 0
  const isLoading = inboxLoading || filterLoading

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-medium">Daily Review</h1>
        <p className="text-muted-foreground text-sm">
          {isLoading ? 'Loading...' : `${inboxCount} inbox, ${filterCount} to review`}
        </p>
      </div>

      <Button
        size="lg"
        onClick={() => navigate({ to: '/review' })}
        disabled={isLoading || (inboxCount === 0 && filterCount === 0)}
        className="text-base px-8 py-6"
      >
        Start Review
      </Button>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Inbox className="h-4 w-4" />
          {isLoading ? '-' : inboxCount} inbox
        </div>
        <div className="flex items-center gap-1.5">
          <ListChecks className="h-4 w-4" />
          {isLoading ? '-' : filterCount} tasks
        </div>
      </div>

      <Link
        to="/settings"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
      >
        <Settings className="h-3.5 w-3.5" />
        Settings
      </Link>
    </div>
  )
}
