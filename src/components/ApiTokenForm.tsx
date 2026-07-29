import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { replaceTodoistToken } from '~/lib/todoist-session'

export function ApiTokenForm({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState('')
  const queryClient = useQueryClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    await replaceTodoistToken(queryClient, trimmed)
    onSaved()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Connect to Todoist</CardTitle>
        <CardDescription>
          Enter your Todoist API token to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Find your token at{' '}
            <a
              href="https://todoist.com/help/articles/find-your-api-token-Jpzx9IIlB"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Todoist Settings &rarr; Integrations
            </a>
          </p>
          <Input
            type="password"
            placeholder="Paste your API token"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button type="submit" disabled={!value.trim()}>
            Save Token
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
