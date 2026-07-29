import { describe, expect, test } from 'bun:test'
import { isRedirect } from '@tanstack/react-router'
import { requireTodoistToken } from './route-guards'

describe('review route token guard', () => {
  test('allows review routes when a token exists', () => {
    expect(() => requireTodoistToken('configured')).not.toThrow()
  })

  test('redirects review routes to Home when no token exists', () => {
    let caught: unknown
    try {
      requireTodoistToken(null)
    } catch (error) {
      caught = error
    }

    expect(isRedirect(caught)).toBe(true)
  })
})
