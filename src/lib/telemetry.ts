export const HOSTED_TELEMETRY_HOSTNAME = 'review.rodrigomaia.me'
export const UMAMI_ORIGIN = 'https://umami.rodrigomaia.me'
export const UMAMI_SCRIPT_URL = `${UMAMI_ORIGIN}/script.js`
export const UMAMI_WEBSITE_ID = 'b8a9b973-8153-48c2-8cb2-e607e26ceb54'
export const UMAMI_SCRIPT_ELEMENT_ID = 'hosted-umami-script'
export const UMAMI_BEFORE_SEND_CALLBACK = '__todoistReviewPageviewOnly'
export const TELEMETRY_CONSENT_STORAGE_KEY = 'todoist-review-telemetry-consent'

export type TelemetryConsentChoice = 'accepted' | 'declined'
export type TelemetryConsent = TelemetryConsentChoice | null

const PAGEVIEWS = {
  '/': { url: '/', title: 'GTD Review' },
  '/review': { url: '/review', title: 'Daily Review' },
  '/weekly-review': { url: '/weekly-review', title: 'Weekly Review' },
  '/settings': { url: '/settings', title: 'Settings' },
} as const

export type TelemetryRoute = keyof typeof PAGEVIEWS

export interface TelemetryPageview {
  url: TelemetryRoute
  title: string
  referrer: ''
  hostname: typeof HOSTED_TELEMETRY_HOSTNAME
}

interface ConsentStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function isHostedTelemetryInstance(hostname: string): boolean {
  return hostname === HOSTED_TELEMETRY_HOSTNAME
}

export function readTelemetryConsent(
  storage: Pick<ConsentStorage, 'getItem'> | null,
): TelemetryConsent {
  if (!storage) return null

  try {
    const value = storage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)
    return value === 'accepted' || value === 'declined' ? value : null
  } catch {
    return null
  }
}

export function writeTelemetryConsent(
  choice: TelemetryConsentChoice,
  storage: Pick<ConsentStorage, 'setItem'> | null,
): void {
  if (!storage) return

  try {
    storage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, choice)
  } catch {
    // Consent still applies to this page even when storage is unavailable.
  }
}

export function pageviewForPath(pathname: string): TelemetryPageview | null {
  if (!Object.prototype.hasOwnProperty.call(PAGEVIEWS, pathname)) return null

  const pageview = PAGEVIEWS[pathname as TelemetryRoute]
  return { ...pageview, referrer: '', hostname: HOSTED_TELEMETRY_HOSTNAME }
}

export interface TelemetryTransport {
  load(onReady: () => void): void
  unload(): void
  sendPageview(pageview: TelemetryPageview): boolean
}

/**
 * Keeps the consent and route allowlists in front of the network transport.
 * The transport never receives arbitrary URLs or application data.
 */
export class HostedTelemetryController {
  private enabled = false
  private ready = false
  private loadGeneration = 0
  private lastMeasuredRoute: TelemetryRoute | null = null
  private queuedPageview: TelemetryPageview | null = null

  constructor(
    private readonly hostname: string,
    private readonly transport: TelemetryTransport,
  ) {}

  update(consent: TelemetryConsent, pathname: string): void {
    if (!isHostedTelemetryInstance(this.hostname)) return

    if (consent !== 'accepted') {
      this.disable()
      return
    }

    if (!this.enabled) {
      this.enable()
    }

    const pageview = pageviewForPath(pathname)
    if (!pageview) {
      this.queuedPageview = null
      return
    }

    if (pageview.url !== this.lastMeasuredRoute) {
      this.queuedPageview = pageview
    }

    this.flush()
  }

  private enable(): void {
    this.enabled = true
    this.ready = false
    const generation = ++this.loadGeneration

    this.transport.load(() => {
      if (!this.enabled || generation !== this.loadGeneration) return
      queueMicrotask(() => {
        if (!this.enabled || generation !== this.loadGeneration) return
        this.ready = true
        this.flush()
      })
    })
  }

  private disable(): void {
    if (!this.enabled) return

    this.enabled = false
    this.ready = false
    this.loadGeneration += 1
    this.lastMeasuredRoute = null
    this.queuedPageview = null
    this.transport.unload()
  }

  private flush(): void {
    if (!this.enabled || !this.ready) return

    const pageview = this.queuedPageview
    if (!pageview || !this.transport.sendPageview(pageview)) return

    this.lastMeasuredRoute = pageview.url
    this.queuedPageview = null
  }
}

interface UmamiTracker {
  track(pageview: TelemetryPageview): unknown
}

export interface UmamiBrowserTarget {
  document: Document
  getTracker(): UmamiTracker | undefined
  clearTracker(): void
}

/** Loads Umami only when called by HostedTelemetryController after acceptance. */
export class UmamiScriptTransport implements TelemetryTransport {
  private script: HTMLScriptElement | null = null
  private onReady: (() => void) | null = null

  constructor(private readonly target: UmamiBrowserTarget) {}

  load(onReady: () => void): void {
    this.onReady = onReady

    if (this.target.getTracker()) {
      this.onReady = null
      onReady()
      return
    }

    const existing = this.target.document.getElementById(UMAMI_SCRIPT_ELEMENT_ID)
    if (existing) {
      this.script = existing as HTMLScriptElement
      this.script.onload = this.handleLoad
      this.script.onerror = this.handleError
      return
    }

    const script = this.target.document.createElement('script')
    script.id = UMAMI_SCRIPT_ELEMENT_ID
    script.src = UMAMI_SCRIPT_URL
    script.async = true
    script.referrerPolicy = 'no-referrer'
    script.dataset.websiteId = UMAMI_WEBSITE_ID
    script.dataset.beforeSend = UMAMI_BEFORE_SEND_CALLBACK
    script.dataset.autoTrack = 'false'
    script.dataset.autoPageview = 'false'
    script.dataset.domains = HOSTED_TELEMETRY_HOSTNAME
    script.dataset.excludeSearch = 'true'
    script.dataset.excludeHash = 'true'
    script.onload = this.handleLoad
    script.onerror = this.handleError

    this.script = script
    this.target.document.head.appendChild(script)
  }

  unload(): void {
    const script =
      this.script ??
      (this.target.document.getElementById(UMAMI_SCRIPT_ELEMENT_ID) as HTMLScriptElement | null)

    if (script) {
      script.onload = null
      script.onerror = null
      script.remove()
    }

    this.script = null
    this.onReady = null
    if (script || this.target.getTracker()) {
      this.target.clearTracker()
    }
  }

  sendPageview(pageview: TelemetryPageview): boolean {
    const tracker = this.target.getTracker()
    const currentScript = this.target.document.currentScript
    if (!tracker || currentScript?.id === UMAMI_SCRIPT_ELEMENT_ID) return false

    try {
      const result = tracker.track({ ...pageview })
      if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
        void Promise.resolve(result).catch(() => {})
      }
      return true
    } catch {
      return false
    }
  }

  private readonly handleLoad = () => {
    if (this.target.getTracker()) {
      const onReady = this.onReady
      this.onReady = null
      onReady?.()
    }
  }

  private readonly handleError = () => {
    this.script?.remove()
    this.script = null
  }
}

export function createBrowserTelemetryController(): HostedTelemetryController {
  const umamiWindow = window as Window & {
    umami?: UmamiTracker
    [UMAMI_BEFORE_SEND_CALLBACK]?: (
      type: string,
      payload: unknown,
    ) => unknown
  }

  if (isHostedTelemetryInstance(window.location.hostname)) {
    umamiWindow[UMAMI_BEFORE_SEND_CALLBACK] = filterUmamiPayload
  }

  const target: UmamiBrowserTarget = {
    document: window.document,
    getTracker: () => umamiWindow.umami,
    clearTracker: () => {
      try {
        delete umamiWindow.umami
      } catch {
        umamiWindow.umami = undefined
      }

      // Umami's auto listeners never initialize because data-auto-track is false.
      // Replacing the global therefore prevents this page from issuing more sends.
    },
  }

  return new HostedTelemetryController(
    window.location.hostname,
    new UmamiScriptTransport(target),
  )
}

export function filterUmamiPayload(type: string, payload: unknown): unknown {
  return type === 'event' && isAllowedPageviewPayload(payload) ? payload : null
}

function isAllowedPageviewPayload(payload: unknown): payload is TelemetryPageview {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as Record<string, unknown>
  const expected =
    typeof candidate.url === 'string'
      ? pageviewForPath(candidate.url)
      : null
  const keys = Object.keys(candidate).sort()

  return (
    expected !== null &&
    keys.join(',') === 'hostname,referrer,title,url' &&
    candidate.title === expected.title &&
    candidate.referrer === expected.referrer &&
    candidate.hostname === expected.hostname
  )
}
