import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiTokenForm } from './ApiTokenForm'
import { HOSTED_TELEMETRY_HOSTNAME } from '~/lib/telemetry'

function renderForm(hostname: string): string {
  const queryClient = new QueryClient()
  const previousWindow = (globalThis as Record<string, unknown>).window
  ;(globalThis as Record<string, unknown>).window = {
    location: { hostname },
  } as Window
  try {
    return renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ApiTokenForm onSaved={() => {}} />
      </QueryClientProvider>,
    )
  } finally {
    ;(globalThis as Record<string, unknown>).window = previousWindow
  }
}

describe('Todoist connection form', () => {
  test('explains temporary sessions, the Hosted instance, telemetry, and access data honestly', () => {
    const markup = renderForm(HOSTED_TELEMETRY_HOSTNAME)

    expect(markup).toContain('Connect to Todoist')
    expect(markup).toContain('temporary session')
    expect(markup).toContain('independently operated Hosted instance')
    expect(markup).toContain('review.rodrigomaia.me')
    expect(markup).toContain('normal technical access data')
    expect(markup).toContain('request logs')
    expect(markup).toContain('can&#x27;t promise that nothing is recorded')
    expect(markup).toContain('anonymous pageview counts')
    expect(markup).toContain('only after you allow them')
  })

  test('does not claim Hosted telemetry on a self-hosted copy', () => {
    const markup = renderForm('self-hosted.example.com')

    expect(markup).toContain('self-hosted')
    expect(markup).toContain('no telemetry is loaded')
    expect(markup).toContain('your own hosting setup')
    expect(markup).not.toContain('independently operated Hosted instance')
    expect(markup).not.toContain('anonymous pageview counts')
  })
})
