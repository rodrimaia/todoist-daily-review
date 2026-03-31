import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { setToken } from '~/lib/storage'

export function ApiTokenForm({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    setToken(trimmed)
    onSaved()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Connect to Todoist</CardTitle>
        <CardDescription>
          Enter your API token from{' '}
          <a
            href="https://app.todoist.com/app/settings/integrations/developer"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-foreground"
          >
            Todoist Settings
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="password"
            placeholder="Your API token"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <Button type="submit" disabled={!value.trim()}>
            Save & Connect
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
