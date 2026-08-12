import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { WelcomeIntro } from './WelcomeIntro'
import { DEFAULT_FILTER_QUERY } from '~/lib/storage'

describe('Welcome intro', () => {
  test('explains both reviews, the review filter, and live changes before connecting', () => {
    const markup = renderToStaticMarkup(<WelcomeIntro />)

    expect(markup).toContain('Todoist Daily Review')
    expect(markup).toContain('Daily Review')
    expect(markup).toContain('Weekly Review')
    expect(markup).toContain('Your review filter')
    expect(markup).toContain(DEFAULT_FILTER_QUERY.replace('&', '&amp;'))
    expect(markup).toContain('Live changes')
    expect(markup).toContain('applied directly to your Todoist account')
  })

  test('lays out side-by-side on wide viewports and stacked on narrow ones', () => {
    const markup = renderToStaticMarkup(<WelcomeIntro />)

    expect(markup).toContain('sm:grid-cols-2')
    expect(markup).toContain('max-w-2xl')
    expect(markup).toContain('sm:text-base')
  })
})
