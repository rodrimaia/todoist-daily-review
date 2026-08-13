import { useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { ApiTokenForm } from '~/components/ApiTokenForm'
import { WelcomeIntro } from '~/components/WelcomeIntro'
import { getToken } from '~/lib/storage'
import { getTodoistApi } from '~/lib/todoist'
import { queryKeys } from '~/lib/query-keys'
import { getPreferences } from '~/lib/storage'
import { Inbox, ListChecks, Settings, CalendarRange } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { TodoistReadError } from '~/components/TodoistReadError'
import { PaperMasthead, PaperPage } from '~/components/PaperPage'

export function Home() {
  const [hasToken, setHasToken] = useState(() => !!getToken())

  const handleTokenSaved = useCallback(() => {
    setHasToken(true)
  }, [])

  if (!hasToken) {
    return (
      <PaperPage className="flex flex-col items-center justify-center gap-8">
        <WelcomeIntro />

        <ApiTokenForm onSaved={handleTokenSaved} />

        <Link
          to="/settings"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
      </PaperPage>
    )
  }

  return <Dashboard />
}

function Dashboard() {
  const navigate = useNavigate()
  const prefs = getPreferences()

  const {
    data: inboxData,
    isLoading: inboxLoading,
    isError: inboxError,
    isFetching: inboxFetching,
    refetch: refetchInbox,
  } = useQuery({
    queryKey: queryKeys.inboxTasks,
    queryFn: async () => {
      const api = getTodoistApi()
      return api.getTasksByFilter({ query: '#Inbox' })
    },
  })

  const {
    data: filterData,
    isLoading: filterLoading,
    isError: filterError,
    isFetching: filterFetching,
    refetch: refetchFilter,
  } = useQuery({
    queryKey: queryKeys.filterTasks(prefs.filterQuery),
    queryFn: async () => {
      const api = getTodoistApi()
      return api.getTasksByFilter({ query: prefs.filterQuery })
    },
  })

  const inboxCount = inboxData?.results?.length ?? 0
  const filterCount = filterData?.results?.length ?? 0
  const isLoading = inboxLoading || filterLoading

  if (inboxError || filterError) {
    return (
      <PaperPage className="grid place-items-center">
        <TodoistReadError
          onRetry={() => void Promise.all([refetchInbox(), refetchFilter()])}
          isRetrying={inboxFetching || filterFetching}
        />
      </PaperPage>
    )
  }

  return (
    <PaperPage>
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl grid-rows-[auto_1fr_auto] gap-10">
        <PaperMasthead
          eyebrow="The morning edition"
          title="What needs attention?"
          description="A clear desk, a handful of decisions, and the day begins to move."
          aside={
            <div className="text-right font-mono text-xs leading-5 text-current/50">
              <div>{isLoading ? '—' : inboxCount.toString().padStart(2, '0')} in the Inbox</div>
              <div>{isLoading ? '—' : filterCount.toString().padStart(2, '0')} next actions</div>
            </div>
          }
        />

        <div className="grid content-center gap-8 lg:grid-cols-2">
          <section className="border-t-2 border-orange-700 py-7 dark:border-orange-300 lg:pr-10">
            <div className="mb-10 flex items-start justify-between gap-6">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">Today</p>
                <h2 className="font-serif text-4xl">Daily Review</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-current/55">Clear the Inbox, then make one deliberate decision for each next action.</p>
              </div>
              <span className="font-serif text-5xl italic text-current/15">01</span>
            </div>
            <div className="mb-6 flex gap-5 text-sm text-current/55">
              <span className="flex items-center gap-1.5"><Inbox className="size-4" />{isLoading ? '—' : inboxCount} inbox</span>
              <span className="flex items-center gap-1.5"><ListChecks className="size-4" />{isLoading ? '—' : filterCount} tasks</span>
            </div>
            <Button
              size="lg"
              onClick={() => navigate({ to: '/review' })}
              disabled={isLoading || (inboxCount === 0 && filterCount === 0)}
              className="px-7"
            >
              Begin today’s review
            </Button>
          </section>

          <section className="border-t border-current/20 py-7 lg:border-l lg:border-t-2 lg:pl-10">
            <div className="mb-10 flex items-start justify-between gap-6">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-current/45">The wider view</p>
                <h2 className="font-serif text-4xl">Weekly Review</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-current/55">Step back to inspect projects, someday ideas, and the week ahead.</p>
              </div>
              <span className="font-serif text-5xl italic text-current/15">02</span>
            </div>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate({ to: '/weekly-review' })}
              disabled={isLoading}
              className="gap-2 bg-transparent px-7"
            >
              <CalendarRange className="size-4" />
              Open the weekly review
            </Button>
          </section>
        </div>

        <footer className="flex flex-col justify-between gap-4 border-t border-current/20 pt-5 text-xs text-current/45 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-1.5">
            <ListChecks className="size-3.5 shrink-0" />
            <span className="truncate font-mono" title={prefs.filterQuery}>{prefs.filterQuery}</span>
            <Link to="/settings" className="shrink-0 underline underline-offset-2 hover:text-current">edit filter</Link>
          </div>
          <Button asChild variant="outline" size="sm" className="bg-transparent text-current/75 hover:text-current">
            <Link to="/settings">
              <Settings className="size-3.5" />
              Settings
            </Link>
          </Button>
        </footer>
      </div>
    </PaperPage>
  )
}
