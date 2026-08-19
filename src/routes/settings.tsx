import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { TokenPersistenceChoice } from '~/components/TokenPersistenceChoice'
import {
  getToken,
  getTokenPersistence,
  getPreferences,
  setPreferences,
  DEFAULT_FILTER_QUERY,
  type Appearance,
} from '~/lib/storage'
import { updateAppearance, useAppearance } from '~/lib/use-appearance'
import { getTodoistApi } from '~/lib/todoist'
import {
  replaceTodoistToken,
  setTodoistTokenPersistence,
} from '~/lib/todoist-session'
import { queryKeys } from '~/lib/query-keys'
import type { PersonalProject, WorkspaceProject } from '@doist/todoist-sdk'
import { Check, Loader2 } from 'lucide-react'
import { getReviewTrackingTaskInvalidReason } from '~/lib/task-decisions'
import {
  getReviewTrackingTaskSchedule,
  getTodoistReadFailureMessage,
  normalizeReviewTrackingTaskId,
} from '~/lib/review-tracking-task'
import { TodoistReadError } from '~/components/TodoistReadError'
import { HostedTelemetrySettings } from '~/components/HostedTelemetry'
import { PaperMasthead, PaperPage } from '~/components/PaperPage'

type Project = PersonalProject | WorkspaceProject

export function SettingsPage() {
  const [token, setTokenState] = useState(() => getToken() ?? '')
  const [rememberToken, setRememberToken] = useState(
    () => getTokenPersistence() === 'remembered',
  )
  const [filter, setFilter] = useState(() => getPreferences().filterQuery)
  const [somedayId, setSomedayId] = useState(() => getPreferences().somedayProjectId ?? '')
  const [excludePrefixes, setExcludePrefixes] = useState(() => getPreferences().excludeProjectPrefixes)
  const [reviewTrackingTaskId, setReviewTrackingTaskId] = useState(() => getPreferences().reviewTrackingTaskId ?? '')
  const [savedReviewTrackingTaskId, setSavedReviewTrackingTaskId] = useState(
    () => getPreferences().reviewTrackingTaskId,
  )
  const [trackingValidation, setTrackingValidation] = useState<
    { status: 'idle' | 'pending' } | { status: 'valid'; title: string; schedule: string } | { status: 'invalid' | 'unavailable'; message: string }
  >({ status: 'idle' })
  const [validationAttempt, setValidationAttempt] = useState(0)
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isClearingToken, setIsClearingToken] = useState(false)
  const currentAppearance = useAppearance()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const hasToken = !!getToken()
  const normalizedTrackingTaskId = reviewTrackingTaskId.trim()
    ? normalizeReviewTrackingTaskId(reviewTrackingTaskId)
    : null
  const trackingTaskChanged = reviewTrackingTaskId.trim()
    ? normalizedTrackingTaskId === null || normalizedTrackingTaskId !== savedReviewTrackingTaskId
    : savedReviewTrackingTaskId !== null
  const tokenChanged = token.trim() !== (getToken() ?? '')

  useEffect(() => {
    if (!trackingTaskChanged) {
      setTrackingValidation({ status: 'idle' })
      return
    }
    if (!reviewTrackingTaskId.trim()) {
      setTrackingValidation({ status: 'idle' })
      return
    }
    if (!normalizedTrackingTaskId) {
      setTrackingValidation({ status: 'invalid', message: 'Enter a Todoist task ID or official task URL.' })
      return
    }
    if (tokenChanged) {
      setTrackingValidation({ status: 'unavailable', message: 'Save the account change before validating this task.' })
      return
    }
    if (!hasToken) {
      setTrackingValidation({ status: 'unavailable', message: 'Add an API token before validating this task.' })
      return
    }

    let current = true
    setTrackingValidation({ status: 'pending' })
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const task = await getTodoistApi().getTask(normalizedTrackingTaskId)
          const reason = getReviewTrackingTaskInvalidReason(task)
          if (!current) return
          setTrackingValidation(reason
            ? { status: 'invalid', message: reason }
            : { status: 'valid', title: task.content, schedule: getReviewTrackingTaskSchedule(task) })
        } catch (error) {
          if (current) setTrackingValidation({ status: 'unavailable', message: getTodoistReadFailureMessage(error) })
        }
      })()
    }, 500)
    return () => {
      current = false
      window.clearTimeout(timer)
    }
  }, [trackingTaskChanged, reviewTrackingTaskId, normalizedTrackingTaskId, tokenChanged, hasToken, validationAttempt])

  const { 
    data: projectsData,
    isLoading: projectsLoading,
    isError: projectsError,
    isFetching: projectsFetching,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const api = getTodoistApi()
      return api.getProjects()
    },
    enabled: hasToken,
  })

  const projects = (projectsData?.results ?? []) as Project[]

  async function handleSave() {
    setIsSaving(true)
    try {
    const nextToken = token.trim()
    const currentToken = getToken()
    const nextPersistence = rememberToken ? 'remembered' : 'temporary'
    const identityChanged = !!nextToken && nextToken !== currentToken
    const persistenceChanged =
      !!nextToken &&
      !identityChanged &&
      nextPersistence !== getTokenPersistence()

    if (identityChanged) {
      await replaceTodoistToken(queryClient, nextToken, nextPersistence)
      const resetPreferences = getPreferences()
      setTokenState(nextToken)
      setSomedayId(resetPreferences.somedayProjectId ?? '')
      setReviewTrackingTaskId(resetPreferences.reviewTrackingTaskId ?? '')
      setSavedReviewTrackingTaskId(resetPreferences.reviewTrackingTaskId)
    } else if (persistenceChanged) {
      setTodoistTokenPersistence(nextPersistence)
    }

    setPreferences({
      filterQuery: filter,
      excludeProjectPrefixes: excludePrefixes,
      ...(identityChanged
        ? {}
        : {
            somedayProjectId: somedayId || null,
            reviewTrackingTaskId: normalizedTrackingTaskId,
          }),
    })
    if (!identityChanged) setSavedReviewTrackingTaskId(normalizedTrackingTaskId)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleClearToken() {
    setIsClearingToken(true)
    try {
    await replaceTodoistToken(queryClient, null)
    const resetPreferences = getPreferences()
    setTokenState('')
    setRememberToken(false)
    setSomedayId(resetPreferences.somedayProjectId ?? '')
    setReviewTrackingTaskId(resetPreferences.reviewTrackingTaskId ?? '')
    setSavedReviewTrackingTaskId(resetPreferences.reviewTrackingTaskId)
    await navigate({ to: '/', replace: true })
    } finally {
      setIsClearingToken(false)
    }
  }

  const handleAppearanceChange = useCallback(
    (appearance: Appearance) => {
      updateAppearance(appearance)
    },
    [],
  )

  return (
    <PaperPage>
      <div className="mx-auto max-w-5xl">
        <PaperMasthead
          eyebrow="Settings"
          title="Tune the ritual."
          description="The quiet machinery behind your Daily and Weekly Reviews."
          backTo="/"
          backLabel="Return to the desk"
        />

        <div className="grid gap-10 py-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-20">
          <aside className="text-sm leading-6 text-current/50">
            <p className="font-serif text-xl italic text-current/75">Small adjustments, kept in one place.</p>
            <p className="mt-3">Your token and review preferences stay in this browser. Appearance changes are immediate.</p>
          </aside>

          <div className="min-w-0 border-b border-current/20">
            <section className="py-10 first:pt-0">
              <div className="flex items-center gap-3">
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">01 · Connection</p>
                <span className="h-px flex-1 bg-current/20" />
              </div>
              <h2 className="mt-2 font-serif text-3xl">Todoist connection</h2>
              <div className="mt-7 space-y-5">
                <div className="space-y-2">
                  <label htmlFor="settings-api-token" className="text-sm font-medium">API Token</label>
                  <Input
                    id="settings-api-token"
                    type="password"
                    autoComplete="off"
                    value={token}
                    onChange={(e) => setTokenState(e.target.value)}
                    placeholder="Your Todoist API token"
                  />
                </div>
                <TokenPersistenceChoice
                  id="settings-remember-token"
                  remembered={rememberToken}
                  onRememberedChange={setRememberToken}
                />
                {hasToken && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearToken}
                    disabled={isSaving || isClearingToken}
                    aria-busy={isClearingToken}
                    className="border-destructive/35 bg-transparent text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    {isClearingToken ? 'Clearing…' : 'Clear token'}
                  </Button>
                )}
              </div>
            </section>

            <section className="py-10">
              <div className="flex items-center gap-3">
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">02 · Daily Review</p>
                <span className="h-px flex-1 bg-current/20" />
              </div>
              <h2 className="mt-2 font-serif text-3xl">Daily defaults</h2>
              <div className="mt-8 space-y-8">
                <div className="space-y-3">
                  <label htmlFor="settings-filter" className="text-sm font-medium">Review filter</label>
                  <Input
                    id="settings-filter"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={DEFAULT_FILTER_QUERY}
                  />
                  <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
                    Todoist filter syntax for which tasks to review after the Inbox. The default uses the{' '}
                    <code className="rounded bg-muted px-1 py-0.5">@next_action</code> label:{' '}
                    <code className="rounded bg-muted px-1 py-0.5">{DEFAULT_FILTER_QUERY}</code>.
                    If your workflow differs, try{' '}
                    <code className="rounded bg-muted px-1 py-0.5">@today</code> or{' '}
                    <code className="rounded bg-muted px-1 py-0.5">priority 1</code>.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilter(DEFAULT_FILTER_QUERY)}
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Reset to default filter
                  </Button>
                </div>

                <div className="space-y-3 border-t border-current/10 pt-7">
                  <label htmlFor="settings-someday" className="text-sm font-medium">Someday/Maybe project</label>
                  {projectsError ? (
                    <TodoistReadError
                      onRetry={() => void refetchProjects()}
                      isRetrying={projectsFetching}
                      showSettingsLink={false}
                    />
                  ) : (
                    <select
                      id="settings-someday"
                      value={somedayId}
                      onChange={(e) => setSomedayId(e.target.value)}
                      disabled={projectsLoading && !projectsData}
                      aria-busy={projectsLoading && !projectsData}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">{projectsLoading && !projectsData ? 'Loading projects…' : 'None'}</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </section>

            <section className="py-10">
              <div className="flex items-center gap-3">
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">03 · Weekly Review</p>
                <span className="h-px flex-1 bg-current/20" />
              </div>
              <h2 className="mt-2 font-serif text-3xl">Weekly boundaries</h2>
              <div className="mt-8 grid gap-8 xl:grid-cols-2">
                <div className="space-y-3">
                  <label htmlFor="settings-excludes" className="text-sm font-medium">Exclude projects</label>
                  <Input
                    id="settings-excludes"
                    value={excludePrefixes}
                    onChange={(e) => setExcludePrefixes(e.target.value)}
                    placeholder="Archive, Reference"
                  />
                  <p className="text-xs leading-5 text-muted-foreground">Comma-separated prefixes. Matching projects are skipped.</p>
                </div>
                <div className="space-y-3">
                  <label htmlFor="settings-tracking" className="text-sm font-medium">Review tracking task</label>
                  <Input
                    id="settings-tracking"
                    value={reviewTrackingTaskId}
                    onChange={(e) => {
                      setReviewTrackingTaskId(e.target.value)
                      setTrackingValidation({ status: 'pending' })
                    }}
                    placeholder="Task ID or Todoist URL (optional)"
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    ID or URL of an open, recurring Todoist task with a due date.
                  </p>
                  {trackingTaskChanged && trackingValidation.status === 'pending' && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Validating task…
                    </p>
                  )}
                  {trackingTaskChanged && trackingValidation.status === 'valid' && (
                    <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Check className="h-3.5 w-3.5" /> Valid: {trackingValidation.title} — {trackingValidation.schedule}
                    </p>
                  )}
                  {trackingTaskChanged && (trackingValidation.status === 'invalid' || trackingValidation.status === 'unavailable') && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <span>{trackingValidation.message}</span>
                      {trackingValidation.status === 'unavailable' && !tokenChanged && hasToken && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => setValidationAttempt((attempt) => attempt + 1)}
                        >
                          Retry validation
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="py-10">
              <div className="flex items-center gap-3">
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">04 · Reading room</p>
                <span className="h-px flex-1 bg-current/20" />
              </div>
              <h2 className="mt-2 font-serif text-3xl">Appearance</h2>
              <div className="mt-7 space-y-3">
                <div className="flex gap-2">
                  {(['system', 'light', 'dark'] as Appearance[]).map((option) => (
                    <Button
                      key={option}
                      variant={currentAppearance === option ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAppearanceChange(option)}
                      className="flex-1"
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Changes apply immediately. System follows your device preference.</p>
              </div>
              <HostedTelemetrySettings />
            </section>

            <div className="border-t border-current/20 py-8">
              <Button
                onClick={handleSave}
                disabled={isSaving || isClearingToken || (trackingTaskChanged && !!reviewTrackingTaskId.trim() && trackingValidation.status !== 'valid')}
                aria-busy={isSaving}
                size="lg"
                className="w-full"
              >
                {isSaving ? 'Saving…' : saved ? 'Saved!' : 'Save settings'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PaperPage>
  )
}
