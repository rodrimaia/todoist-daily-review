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
          Sign in with your Todoist account to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button asChild className="w-full" size="lg">
          <a href="/api/auth/login">Login with Todoist</a>
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="password"
            placeholder="Paste API token manually"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={!value.trim()}>
            Save Token
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
