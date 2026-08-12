import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { TokenPersistenceChoice } from './TokenPersistenceChoice'

function renderChoice(remembered: boolean): string {
  return renderToStaticMarkup(
    <TokenPersistenceChoice
      id="remember-token"
      remembered={remembered}
      onRememberedChange={() => {}}
    />,
  )
}

describe('Todoist token persistence choice', () => {
  test('explains the default temporary browser-tab session and links Todoist guidance', () => {
    const markup = renderChoice(false)

    expect(markup).toContain('Remember this token on this device')
    expect(markup).toContain('browser tab')
    expect(markup).toContain('survives reloads')
    expect(markup).toContain('find or revoke your API token')
    expect(markup).toContain(
      'href="https://todoist.com/help/articles/find-your-api-token-Jpzx9IIlB"',
    )
    expect(markup).not.toContain('checked=""')
  })

  test('explains when the token will be remembered', () => {
    const markup = renderChoice(true)

    expect(markup).toContain('checked=""')
    expect(markup).toContain('until you clear it')
    expect(markup).toContain('revoke its access in Todoist')
  })
})
