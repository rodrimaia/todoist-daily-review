import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Separator } from '~/components/ui/separator'
import {
  getToken,
  setToken,
  clearToken,
  getPreferences,
  setPreferences,
} from '~/lib/storage'
import { resetTodoistApi, getTodoistApi } from '~/lib/todoist'
import { queryKeys } from '~/lib/query-keys'
import type { PersonalProject, WorkspaceProject } from '@doist/todoist-sdk'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/settings')({
  ssr: false,
  component: SettingsPage,
})

type Project = PersonalProject | WorkspaceProject

function SettingsPage() {
  const [token, setTokenState] = useState(() => getToken() ?? '')
  const [filter, setFilter] = useState(() => getPreferences().filterQuery)
  const [somedayId, setSomedayId] = useState(() => getPreferences().somedayProjectId ?? '')
  const [excludePrefixes, setExcludePrefixes] = useState(() => getPreferences().excludeProjectPrefixes)
  const [saved, setSaved] = useState(false)

  const hasToken = !!getToken()

  const { data: projectsData } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const api = getTodoistApi()
      return api.getProjects()
    },
    enabled: hasToken,
  })

  const projects = (projectsData?.results ?? []) as Project[]

  function handleSave() {
    if (token.trim()) {
      setToken(token.trim())
      resetTodoistApi()
    }
    setPreferences({
      filterQuery: filter,
      somedayProjectId: somedayId || null,
      excludeProjectPrefixes: excludePrefixes,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleClearToken() {
    const currentToken = getToken()
    if (currentToken) {
      fetch('/api/auth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: currentToken }),
      }).catch(() => {})
    }
    clearToken()
    resetTodoistApi()
    setTokenState('')
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4 pt-8 gap-6">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure your daily review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">API Token</label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setTokenState(e.target.value)}
                placeholder="Your Todoist API token"
              />
              {hasToken && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearToken}
                  className="text-destructive text-xs"
                >
                  Clear token
                </Button>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">Review filter</label>
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="@next_action & (no date | overdue | today)"
              />
              <p className="text-xs text-muted-foreground">
                Todoist filter syntax for which tasks to review
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Someday/Maybe project</label>
              <select
                value={somedayId}
                onChange={(e) => setSomedayId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">Exclude projects (weekly review)</label>
              <Input
                value={excludePrefixes}
                onChange={(e) => setExcludePrefixes(e.target.value)}
                placeholder="AREA, LISTA"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated prefixes. Projects starting with these are skipped during weekly review.
              </p>
            </div>

            <Button onClick={handleSave} className="w-full">
              {saved ? 'Saved!' : 'Save'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
