import { describe, expect, test } from 'bun:test'
import {
  HOSTED_TELEMETRY_HOSTNAME,
  UMAMI_BEFORE_SEND_CALLBACK,
  HostedTelemetryController,
  TELEMETRY_CONSENT_STORAGE_KEY,
  UMAMI_SCRIPT_ELEMENT_ID,
  UMAMI_SCRIPT_URL,
  UMAMI_WEBSITE_ID,
  UmamiScriptTransport,
  filterUmamiPayload,
  isHostedTelemetryInstance,
  pageviewForPath,
  readTelemetryConsent,
  writeTelemetryConsent,
  type TelemetryPageview,
  type TelemetryTransport,
  type UmamiBrowserTarget,
} from './telemetry'

class RecordingTransport implements TelemetryTransport {
  loadCalls = 0
  unloadCalls = 0
  sent: TelemetryPageview[] = []
  private readyCallback: (() => void) | null = null

  load(onReady: () => void): void {
    this.loadCalls += 1
    this.readyCallback = onReady
  }

  unload(): void {
    this.unloadCalls += 1
  }

  sendPageview(pageview: TelemetryPageview): boolean {
    this.sent.push({ ...pageview })
    return true
  }

  becomeReady(): void {
    this.readyCallback?.()
  }
}

describe('Hosted telemetry policy', () => {
  test('recognizes only the exact Hosted hostname', () => {
    expect(isHostedTelemetryInstance(HOSTED_TELEMETRY_HOSTNAME)).toBe(true)
    expect(isHostedTelemetryInstance('localhost')).toBe(false)
    expect(isHostedTelemetryInstance('127.0.0.1')).toBe(false)
    expect(isHostedTelemetryInstance('review.rodrigomaia.me.example.com')).toBe(false)
    expect(isHostedTelemetryInstance('todoist-review.example.com')).toBe(false)
  })

  test('stores only an explicit accepted or declined choice', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }

    expect(readTelemetryConsent(storage)).toBeNull()

    writeTelemetryConsent('declined', storage)
    expect(values.get(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('declined')
    expect(readTelemetryConsent(storage)).toBe('declined')

    writeTelemetryConsent('accepted', storage)
    expect(readTelemetryConsent(storage)).toBe('accepted')

    values.set(TELEMETRY_CONSENT_STORAGE_KEY, 'yes')
    expect(readTelemetryConsent(storage)).toBeNull()
  })

  test('fails closed when browser storage is unavailable', () => {
    const unavailableStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }

    expect(readTelemetryConsent(unavailableStorage)).toBeNull()
    expect(() => writeTelemetryConsent('accepted', unavailableStorage)).not.toThrow()
  })

  test('allows only fixed, query-free routes and static pageview fields', () => {
    const pageview: TelemetryPageview = {
      url: '/review',
      title: 'Daily Review',
      referrer: '',
      hostname: HOSTED_TELEMETRY_HOSTNAME,
    }

    expect(pageviewForPath('/review')).toEqual(pageview)
    expect(pageviewForPath('/review?filter=secret')).toBeNull()
    expect(pageviewForPath('/review/task-123')).toBeNull()
    expect(pageviewForPath('/settings#token')).toBeNull()
    expect(filterUmamiPayload('event', pageview)).toEqual(pageview)
    expect(filterUmamiPayload('identify', pageview)).toBeNull()
    expect(filterUmamiPayload('performance', pageview)).toBeNull()
    expect(filterUmamiPayload('event', { ...pageview, data: { secret: true } })).toBeNull()
    expect(filterUmamiPayload('event', { ...pageview, title: 'Task content' })).toBeNull()
    expect(filterUmamiPayload('event', { ...pageview, url: '/review?filter=secret' })).toBeNull()
  })
})

describe('Hosted telemetry browser/network boundary', () => {
  test('does not load a script before a choice or after declining', () => {
    const transport = new RecordingTransport()
    const controller = new HostedTelemetryController(
      HOSTED_TELEMETRY_HOSTNAME,
      transport,
    )

    controller.update(null, '/')
    controller.update('declined', '/review')

    expect(transport.loadCalls).toBe(0)
    expect(transport.sent).toEqual([])
  })

  test('never loads a script on localhost or a Self-hosted instance, even with stored acceptance', () => {
    for (const hostname of ['localhost', '127.0.0.1', 'review.example.com']) {
      const transport = new RecordingTransport()
      const controller = new HostedTelemetryController(hostname, transport)

      controller.update('accepted', '/')
      controller.update('accepted', '/review')

      expect(transport.loadCalls).toBe(0)
      expect(transport.sent).toEqual([])
      expect(transport.unloadCalls).toBe(0)
    }
  })

  test('loads after acceptance and sends only allowlisted pageviews', async () => {
    const transport = new RecordingTransport()
    const controller = new HostedTelemetryController(
      HOSTED_TELEMETRY_HOSTNAME,
      transport,
    )

    controller.update('accepted', '/')
    expect(transport.loadCalls).toBe(1)
    expect(transport.sent).toEqual([])

    transport.becomeReady()
    await Promise.resolve()
    controller.update('accepted', '/review')
    controller.update('accepted', '/weekly-review')
    controller.update('accepted', '/settings')
    controller.update('accepted', '/settings?token=todoist-secret')
    controller.update('accepted', '/project/dynamic-id')

    expect(transport.sent).toEqual([
      {
        url: '/',
        title: 'GTD Review',
        referrer: '',
        hostname: HOSTED_TELEMETRY_HOSTNAME,
      },
      {
        url: '/review',
        title: 'Daily Review',
        referrer: '',
        hostname: HOSTED_TELEMETRY_HOSTNAME,
      },
      {
        url: '/weekly-review',
        title: 'Weekly Review',
        referrer: '',
        hostname: HOSTED_TELEMETRY_HOSTNAME,
      },
      {
        url: '/settings',
        title: 'Settings',
        referrer: '',
        hostname: HOSTED_TELEMETRY_HOSTNAME,
      },
    ])
    expect(JSON.stringify(transport.sent)).not.toContain('todoist-secret')
    expect(JSON.stringify(transport.sent)).not.toContain('dynamic-id')
  })

  test('unloads on withdrawal, ignores a stale load, and can be accepted again', async () => {
    const transport = new RecordingTransport()
    const controller = new HostedTelemetryController(
      HOSTED_TELEMETRY_HOSTNAME,
      transport,
    )

    controller.update('accepted', '/')
    transport.becomeReady()
    await Promise.resolve()
    expect(transport.sent).toHaveLength(1)

    controller.update('declined', '/review')
    expect(transport.unloadCalls).toBe(1)

    transport.becomeReady()
    controller.update('declined', '/weekly-review')
    expect(transport.sent).toHaveLength(1)

    controller.update('accepted', '/settings')
    expect(transport.loadCalls).toBe(2)
    transport.becomeReady()
    await Promise.resolve()
    expect(transport.sent.at(-1)).toEqual({
      url: '/settings',
      title: 'Settings',
      referrer: '',
      hostname: HOSTED_TELEMETRY_HOSTNAME,
    })
  })

  test('configures the Umami script for manual, Hosted-only tracking', () => {
    const elements = new Map<string, FakeScript>()
    let createdScript: FakeScript | null = null
    let tracker:
      | { track: (pageview: TelemetryPageview) => void }
      | undefined
    const tracked: TelemetryPageview[] = []
    let trackerCleared = false

    const document = {
      currentScript: null,
      getElementById: (id: string) => elements.get(id) ?? null,
      createElement: (tagName: string) => {
        expect(tagName).toBe('script')
        createdScript = new FakeScript(elements)
        return createdScript
      },
      head: {
        appendChild: (script: FakeScript) => {
          elements.set(script.id, script)
          return script
        },
      },
    }

    const target = {
      document: document as unknown as Document,
      getTracker: () => tracker,
      clearTracker: () => {
        tracker = undefined
        trackerCleared = true
      },
    } satisfies UmamiBrowserTarget

    const transport = new UmamiScriptTransport(target)
    let ready = false
    transport.load(() => {
      ready = true
    })

    const script = createdScript as FakeScript | null
    expect(script).not.toBeNull()
    if (!script) throw new Error('Expected the Umami script to be created')

    expect(script.id).toBe(UMAMI_SCRIPT_ELEMENT_ID)
    expect(script.src).toBe(UMAMI_SCRIPT_URL)
    expect(script.async).toBe(true)
    expect(script.referrerPolicy).toBe('no-referrer')
    expect(script.dataset).toEqual({
      websiteId: UMAMI_WEBSITE_ID,
      beforeSend: UMAMI_BEFORE_SEND_CALLBACK,
      autoTrack: 'false',
      autoPageview: 'false',
      domains: HOSTED_TELEMETRY_HOSTNAME,
      excludeSearch: 'true',
      excludeHash: 'true',
    })
    expect(ready).toBe(false)

    tracker = {
      track: (pageview) => tracked.push(pageview),
    }
    script.onload?.(new Event('load'))
    expect(ready).toBe(true)

    expect(
      transport.sendPageview({
        url: '/',
        title: 'GTD Review',
        referrer: '',
        hostname: HOSTED_TELEMETRY_HOSTNAME,
      }),
    ).toBe(true)
    expect(tracked).toEqual([
      {
        url: '/',
        title: 'GTD Review',
        referrer: '',
        hostname: HOSTED_TELEMETRY_HOSTNAME,
      },
    ])

    transport.unload()
    expect(script.removed).toBe(true)
    expect(trackerCleared).toBe(true)
  })
})

class FakeScript {
  id = ''
  src = ''
  async = false
  referrerPolicy = ''
  dataset: Record<string, string> = {}
  onload: ((event: Event) => void) | null = null
  onerror: ((event: Event | string) => void) | null = null
  removed = false

  constructor(private readonly elements: Map<string, FakeScript>) {}

  remove(): void {
    this.removed = true
    this.elements.delete(this.id)
  }
}
