import {
  HOSTED_TELEMETRY_HOSTNAME,
  HostedTelemetryController,
  UMAMI_ORIGIN,
  type TelemetryPageview,
  type TelemetryTransport,
} from '../src/lib/telemetry'

class NetworkProbe implements TelemetryTransport {
  contacts: string[] = []
  pageviews: TelemetryPageview[] = []
  private onReady: (() => void) | null = null

  load(onReady: () => void): void {
    this.contacts.push(`${UMAMI_ORIGIN}/script.js`)
    this.onReady = onReady
  }

  unload(): void {
    this.onReady = null
  }

  sendPageview(pageview: TelemetryPageview): boolean {
    this.contacts.push(`${UMAMI_ORIGIN}/api/send`)
    this.pageviews.push(pageview)
    return true
  }

  scriptLoaded(): void {
    this.onReady?.()
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function runScenario(hostname: string) {
  const network = new NetworkProbe()
  const telemetry = new HostedTelemetryController(hostname, network)
  return { network, telemetry }
}

const undecided = runScenario(HOSTED_TELEMETRY_HOSTNAME)
undecided.telemetry.update(null, '/')
assert(undecided.network.contacts.length === 0, 'Undecided contacted Umami')

const declined = runScenario(HOSTED_TELEMETRY_HOSTNAME)
declined.telemetry.update('declined', '/')
assert(declined.network.contacts.length === 0, 'Declined contacted Umami')

const selfHosted = runScenario('self-hosted.example.com')
selfHosted.telemetry.update('accepted', '/')
assert(selfHosted.network.contacts.length === 0, 'Self-hosted contacted Umami')

const accepted = runScenario(HOSTED_TELEMETRY_HOSTNAME)
accepted.telemetry.update('accepted', '/review?token=secret')
assert(accepted.network.contacts.length === 1, 'Accepted did not request the script')
accepted.network.scriptLoaded()
await Promise.resolve()
assert(accepted.network.pageviews.length === 0, 'A query-bearing URL was measured')
accepted.telemetry.update('accepted', '/review')
assert(accepted.network.pageviews.length === 1, 'Fixed route was not measured')
assert(
  JSON.stringify(accepted.network.pageviews) ===
    JSON.stringify([
      {
        url: '/review',
        title: 'Daily Review',
        referrer: '',
        hostname: HOSTED_TELEMETRY_HOSTNAME,
      },
    ]),
  'Pageview contained fields outside the fixed payload',
)

accepted.telemetry.update('declined', '/settings')
const contactsAfterWithdrawal = accepted.network.contacts.length
accepted.telemetry.update('declined', '/weekly-review')
assert(
  accepted.network.contacts.length === contactsAfterWithdrawal,
  'Withdrawal allowed a future Umami contact',
)

console.log('Telemetry browser/network scenarios passed')
