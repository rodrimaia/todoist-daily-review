import { describe, expect, test } from 'bun:test'

describe('production telemetry security boundary', () => {
  test('keeps Umami absent from the static document', async () => {
    const index = await Bun.file(new URL('../../index.html', import.meta.url)).text()

    expect(index).toContain('<script src="/appearance.js"></script>')
    expect(index).not.toContain('umami.rodrigomaia.me')
    expect(index).not.toContain('b8a9b973-8153-48c2-8cb2-e607e26ceb54')
  })

  test('grants Umami CSP access only for the exact Hosted hostname', async () => {
    const nginx = await Bun.file(new URL('../../nginx.conf', import.meta.url)).text()

    expect(nginx).toContain(
      'default                 "\'self\' https://api.todoist.com";',
    )
    expect(nginx).toContain(
      'review.rodrigomaia.me   "\'self\' https://umami.rodrigomaia.me/script.js";',
    )
    expect(nginx).toContain('https://umami.rodrigomaia.me/api/send')
    expect(nginx).not.toContain('https://umami.rodrigomaia.me";')
    expect(nginx).toContain("object-src 'none'")
    expect(nginx).toContain('Referrer-Policy "no-referrer"')
    expect(nginx).not.toContain("script-src 'unsafe-inline'")
    expect(nginx).not.toContain('script-src *')
  })
})
