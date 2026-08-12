import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { TokenPersistenceChoice } from '~/components/TokenPersistenceChoice'
import { replaceTodoistToken } from '~/lib/todoist-session'

export function ApiTokenForm({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState('')
  const [rememberToken, setRememberToken] = useState(false)
  const queryClient = useQueryClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    await replaceTodoistToken(
      queryClient,
      trimmed,
      rememberToken ? 'remembered' : 'temporary',
    )
    onSaved()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Connect to Todoist</CardTitle>
        <CardDescription>
          Enter your API token to start a temporary Todoist session
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
          />
          <TokenPersistenceChoice
            id="connect-remember-token"
            remembered={rememberToken}
            onRememberedChange={setRememberToken}
          />
          <Button type="submit" disabled={!value.trim()}>
            Connect to Todoist
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
