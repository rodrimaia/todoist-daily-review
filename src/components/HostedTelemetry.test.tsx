import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { TelemetryConsentPrompt } from './HostedTelemetry'

describe('Hosted telemetry consent prompt', () => {
  test('offers an explicit choice and explains the narrow pageview scope', () => {
    const markup = renderToStaticMarkup(
      <TelemetryConsentPrompt onChoose={() => {}} />,
    )

    expect(markup).toContain('Help improve the Hosted app?')
    expect(markup).toContain('Allow pageviews')
    expect(markup).toContain('No thanks')
    expect(markup).toContain('four app pages')
    expect(markup).toContain('No Todoist token')
    expect(markup).toContain('query parameter')
    expect(markup).toContain('custom event')
    expect(markup).toContain('anytime in Settings')
  })
})
