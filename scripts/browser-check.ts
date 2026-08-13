import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright'
import { TODOIST_TOKEN_STORAGE_KEY } from '../src/lib/storage'
import {
  HOSTED_TELEMETRY_HOSTNAME,
  TELEMETRY_CONSENT_STORAGE_KEY,
  UMAMI_ORIGIN,
} from '../src/lib/telemetry'

const DEFAULT_PREVIEW_PORT = 4173
const TEST_TOKEN = 'browser-check'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function originForHostname(origin: string, hostname: string): string {
  const url = new URL(origin)
  url.hostname = hostname
  return url.origin
}

async function waitForServer(origin: string): Promise<void> {
  const deadline = Date.now() + 15_000
  let lastError: unknown

  while (Date.now() < deadline) {
    try {
      const response = await fetch(origin)
      if (response.ok) return
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await Bun.sleep(100)
  }

  throw new Error(`App did not become ready at ${origin}: ${String(lastError)}`)
}

async function prepareApp(): Promise<{
  origin: string
  stop: () => Promise<void>
}> {
  const configuredOrigin = process.env.BROWSER_CHECK_ORIGIN
  if (configuredOrigin) {
    const origin = new URL(configuredOrigin).origin
    await waitForServer(origin)
    return { origin, stop: async () => {} }
  }

  if (!(await Bun.file('dist/index.html').exists())) {
    throw new Error('dist/index.html is missing; run `bun run build` first')
  }

  const port = Number(process.env.BROWSER_CHECK_PORT ?? DEFAULT_PREVIEW_PORT)
  assert(Number.isInteger(port) && port > 0, 'BROWSER_CHECK_PORT must be a port number')

  const preview = Bun.spawn({
    cmd: [
      process.execPath,
      'x',
      '--bun',
      'vite',
      'preview',
      '--host',
      '0.0.0.0',
      '--port',
      String(port),
      '--strictPort',
    ],
    stdout: 'ignore',
    stderr: 'inherit',
  })
  const origin = `http://127.0.0.1:${port}`

  try {
    await waitForServer(origin)
  } catch (error) {
    preview.kill()
    await preview.exited
    throw error
  }

  return {
    origin,
    stop: async () => {
      preview.kill()
      await preview.exited
    },
  }
}

function currentUserFixture() {
  return {
    id: 'browser-user',
    email: 'browser-check@example.invalid',
    full_name: 'Browser Check',
    avatar_big: null,
    avatar_medium: null,
    avatar_s640: null,
    avatar_small: null,
    business_account_id: null,
    is_premium: false,
    premium_status: 'not_premium',
    date_format: 0,
    time_format: 0,
    weekly_goal: 0,
    daily_goal: 0,
    completed_count: 0,
    completed_today: 0,
    karma: 0,
    karma_trend: 'neutral',
    lang: 'en',
    next_week: 1,
    start_day: 1,
    start_page: 'inbox',
    tz_info: {
      gmt_string: '+00:00',
      hours: 0,
      is_dst: 0,
      minutes: 0,
      timezone: 'UTC',
    },
    inbox_project_id: 'browser-inbox',
    days_off: [6, 7],
    weekend_start_day: 6,
  }
}

async function mockTodoist(context: BrowserContext): Promise<string[]> {
  const unexpectedRequests: string[] = []

  await context.route(/^https:\/\/api\.todoist\.com\/.*/, async (route) => {
    const request = route.request()
    const requestUrl = new URL(request.url())
    const corsHeaders = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, OPTIONS',
    }

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }

    if (request.method() !== 'GET') {
      unexpectedRequests.push(`${request.method()} ${requestUrl.pathname}`)
      await route.fulfill({ status: 405, headers: corsHeaders })
      return
    }

    let body: unknown
    if (requestUrl.pathname === '/api/v1/user') {
      body = currentUserFixture()
    } else if (
      requestUrl.pathname === '/api/v1/projects' ||
      requestUrl.pathname === '/api/v1/tasks' ||
      requestUrl.pathname === '/api/v1/tasks/filter'
    ) {
      body = { results: [], next_cursor: null }
    } else {
      unexpectedRequests.push(`${request.method()} ${requestUrl.pathname}`)
      await route.fulfill({ status: 404, headers: corsHeaders })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify(body),
    })
  })

  return unexpectedRequests
}

function watchPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

async function waitForText(page: Page, text: string): Promise<void> {
  await page.getByText(text, { exact: true }).waitFor({ state: 'visible' })
}

async function checkSelfHostedRoutes(browser: Browser, origin: string): Promise<void> {
  const context = await browser.newContext()
  const unexpectedTodoistRequests = await mockTodoist(context)
  const umamiContacts: string[] = []
  context.on('request', (request) => {
    if (request.url().startsWith(UMAMI_ORIGIN)) umamiContacts.push(request.url())
  })
  await context.addInitScript(
    ({ consentKey }) => localStorage.setItem(consentKey, 'accepted'),
    { consentKey: TELEMETRY_CONSENT_STORAGE_KEY },
  )

  const page = await context.newPage()
  const pageErrors = watchPageErrors(page)

  await page.goto(`${origin}/`)
  await page.getByRole('heading', { name: 'Todoist Daily Review' }).waitFor()
  await page.getByRole('button', { name: 'Connect to Todoist' }).waitFor()
  await waitForText(
    page,
    'Your token is used only to talk to the Todoist API from your browser. This copy is self-hosted: no telemetry is loaded, and how much technical access data is recorded depends on your own hosting setup.',
  )

  await page.goto(`${origin}/settings`)
  await waitForText(page, 'Settings')
  assert(
    (await page.getByText('Anonymous pageview measurement', { exact: true }).count()) === 0,
    'Self-hosted Settings exposed Hosted telemetry controls',
  )

  for (const protectedPath of ['/review', '/weekly-review']) {
    await page.goto(`${origin}${protectedPath}`)
    await page.waitForURL((url) => url.origin === origin && url.pathname === '/')
    await page.getByRole('heading', { name: 'Todoist Daily Review' }).waitFor()
  }

  await page.evaluate(
    ({ key, token }) => sessionStorage.setItem(key, token),
    { key: TODOIST_TOKEN_STORAGE_KEY, token: TEST_TOKEN },
  )

  await page.goto(`${origin}/review`)
  await waitForText(page, 'Review Complete')
  await waitForText(page, 'Nothing to review today.')

  await page.goto(`${origin}/weekly-review`)
  await waitForText(page, 'Weekly Review Complete')
  await waitForText(page, 'Nothing to review this week.')

  assert(umamiContacts.length === 0, 'Self-hosted browser contacted the maintainer Umami instance')
  assert(
    unexpectedTodoistRequests.length === 0,
    `Unexpected Todoist requests: ${unexpectedTodoistRequests.join(', ')}`,
  )
  assert(pageErrors.length === 0, `Self-hosted browser errors: ${pageErrors.join('; ')}`)

  await context.close()
}

async function checkTokenPersistence(browser: Browser, origin: string): Promise<void> {
  for (const persistence of ['temporary', 'remembered'] as const) {
    const context = await browser.newContext()
    const unexpectedTodoistRequests = await mockTodoist(context)
    const page = await context.newPage()
    const pageErrors = watchPageErrors(page)

    await page.goto(`${origin}/`)
    await page.getByLabel('Todoist API token').fill(TEST_TOKEN)
    if (persistence === 'remembered') {
      await page
        .getByRole('checkbox', { name: 'Remember this token on this device' })
        .check()
    }
    await page.getByRole('button', { name: 'Connect to Todoist' }).click()
    await page.getByRole('heading', { name: 'GTD Review' }).waitFor()

    const stored = await page.evaluate((key) => ({
      temporary: sessionStorage.getItem(key),
      remembered: localStorage.getItem(key),
    }), TODOIST_TOKEN_STORAGE_KEY)

    if (persistence === 'temporary') {
      assert(stored.temporary === TEST_TOKEN, 'Temporary token was not stored in sessionStorage')
      assert(stored.remembered === null, 'Temporary token leaked into localStorage')
    } else {
      assert(stored.remembered === TEST_TOKEN, 'Remembered token was not stored in localStorage')
      assert(stored.temporary === null, 'Remembered token leaked into sessionStorage')
    }

    assert(
      unexpectedTodoistRequests.length === 0,
      `Unexpected Todoist requests: ${unexpectedTodoistRequests.join(', ')}`,
    )
    assert(pageErrors.length === 0, `Token browser errors: ${pageErrors.join('; ')}`)
    await context.close()
  }
}

async function checkHostedConsent(browser: Browser, selfHostedOrigin: string): Promise<void> {
  const hostedOrigin = originForHostname(selfHostedOrigin, HOSTED_TELEMETRY_HOSTNAME)
  const context = await browser.newContext()
  const contacts: string[] = []
  const pageviews: unknown[] = []

  context.on('request', (request) => {
    if (request.url().startsWith(UMAMI_ORIGIN)) contacts.push(request.url())
  })
  await context.route(`${UMAMI_ORIGIN}/script.js`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.umami={track:function(payload){return fetch(${JSON.stringify(`${UMAMI_ORIGIN}/api/send`)},{method:'POST',headers:{'content-type':'text/plain'},body:JSON.stringify(payload)})}};`,
    })
  })
  await context.route(`${UMAMI_ORIGIN}/api/send`, async (route) => {
    const body = route.request().postData()
    if (body) pageviews.push(JSON.parse(body))
    await route.fulfill({
      status: 204,
      headers: { 'access-control-allow-origin': '*' },
    })
  })

  const page = await context.newPage()
  const pageErrors = watchPageErrors(page)

  await page.goto(`${hostedOrigin}/`)
  await waitForText(page, 'Help improve the Hosted app?')
  assert(contacts.length === 0, 'Hosted app contacted Umami before consent')

  await page.getByRole('button', { name: 'No thanks' }).click()
  assert(
    (await page.evaluate((key) => localStorage.getItem(key), TELEMETRY_CONSENT_STORAGE_KEY)) ===
      'declined',
    'Declined consent was not saved',
  )
  assert(contacts.length === 0, 'Declined Hosted consent contacted Umami')

  await page.goto(`${hostedOrigin}/settings`)
  await waitForText(page, 'Pageview measurement is off.')
  const pageviewResponse = page.waitForResponse(`${UMAMI_ORIGIN}/api/send`)
  await page.getByRole('button', { name: 'Allow', exact: true }).click()
  await pageviewResponse

  assert(
    (await page.evaluate((key) => localStorage.getItem(key), TELEMETRY_CONSENT_STORAGE_KEY)) ===
      'accepted',
    'Accepted consent was not saved',
  )
  assert(
    JSON.stringify(pageviews) ===
      JSON.stringify([
        {
          url: '/settings',
          title: 'Settings',
          referrer: '',
          hostname: HOSTED_TELEMETRY_HOSTNAME,
        },
      ]),
    `Hosted pageview payload escaped the allowlist: ${JSON.stringify(pageviews)}`,
  )

  await page.getByRole('button', { name: "Don't allow", exact: true }).click()
  const contactsAfterWithdrawal = contacts.length
  await page.goto(`${hostedOrigin}/weekly-review`)
  await page.waitForURL((url) => url.origin === hostedOrigin && url.pathname === '/')
  await Bun.sleep(200)

  assert(
    contacts.length === contactsAfterWithdrawal,
    'Withdrawing Hosted consent allowed another Umami contact',
  )
  assert(
    (await page.evaluate((key) => localStorage.getItem(key), TELEMETRY_CONSENT_STORAGE_KEY)) ===
      'declined',
    'Withdrawn consent was not saved as declined',
  )
  assert(pageErrors.length === 0, `Hosted browser errors: ${pageErrors.join('; ')}`)

  await context.close()
}

const app = await prepareApp()
let browser: Browser | null = null

try {
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-proxy-server',
        `--host-resolver-rules=MAP ${HOSTED_TELEMETRY_HOSTNAME} 127.0.0.1`,
      ],
    })
  } catch (error) {
    throw new Error(
      `Chromium could not start. Run \`bunx playwright install --with-deps chromium\` first. ${String(error)}`,
    )
  }

  await checkSelfHostedRoutes(browser, app.origin)
  await checkTokenPersistence(browser, app.origin)
  await checkHostedConsent(browser, app.origin)
  console.log('Browser route, token persistence, and telemetry scenarios passed')
} finally {
  await browser?.close()
  await app.stop()
}
