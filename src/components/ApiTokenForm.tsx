import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { TokenPersistenceChoice } from '~/components/TokenPersistenceChoice'
import { replaceTodoistToken } from '~/lib/todoist-session'
import { isHostedTelemetryInstance } from '~/lib/telemetry'

export function ApiTokenForm({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState('')
  const [rememberToken, setRememberToken] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [hostname] = useState(() =>
    typeof window === 'undefined' ? '' : window.location.hostname,
  )
  const isHosted = isHostedTelemetryInstance(hostname)
  const queryClient = useQueryClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    setIsConnecting(true)
    try {
      await replaceTodoistToken(
        queryClient,
        trimmed,
        rememberToken ? 'remembered' : 'temporary',
      )
      onSaved()
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Card className="w-full max-w-md rounded-none border-x-0 border-b-0 bg-transparent pt-7">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Connect to Todoist</CardTitle>
        <CardDescription>
          Paste your Todoist API token to start a temporary session. You can
          change or clear it later in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="password"
            autoComplete="off"
            aria-label="Todoist API token"
            placeholder="Paste your API token"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isConnecting}
          />
          <TokenPersistenceChoice
            id="connect-remember-token"
            remembered={rememberToken}
            onRememberedChange={setRememberToken}
            disabled={isConnecting}
          />
          <Button type="submit" disabled={!value.trim() || isConnecting} aria-busy={isConnecting}>
            {isConnecting ? 'Connecting…' : 'Connect to Todoist'}
          </Button>
        </form>

        {isHosted ? (
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            This is the independently operated Hosted instance at
            review.rodrigomaia.me. Like any web host, it can record normal
            technical access data such as request logs; it can&apos;t promise
            that nothing is recorded. Optional, anonymous pageview counts are
            offered only here and only after you allow them. Your token itself
            is used only to talk to the Todoist API from your browser.
          </p>
        ) : (
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Your token is used only to talk to the Todoist API from your
            browser. This copy is self-hosted: no telemetry is loaded, and how
            much technical access data is recorded depends on your own hosting
            setup.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
