import { redirect } from '@tanstack/react-router'

export function requireTodoistToken(token: string | null): void {
  if (!token) throw redirect({ to: '/' })
}
