import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import {
  TELEMETRY_CONSENT_STORAGE_KEY,
  createBrowserTelemetryController,
  isHostedTelemetryInstance,
  readTelemetryConsent,
  writeTelemetryConsent,
  type HostedTelemetryController,
  type TelemetryConsent,
  type TelemetryConsentChoice,
} from '~/lib/telemetry'

interface HostedTelemetryContextValue {
  isHosted: boolean
  consent: TelemetryConsent
  chooseConsent: (choice: TelemetryConsentChoice) => void
}

const HostedTelemetryContext = createContext<HostedTelemetryContextValue>({
  isHosted: false,
  consent: null,
  chooseConsent: () => {},
})

function getBrowserLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function HostedTelemetryProvider({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const [hostname] = useState(() =>
    typeof window === 'undefined' ? '' : window.location.hostname,
  )
  const isHosted = isHostedTelemetryInstance(hostname)
  const [consent, setConsent] = useState<TelemetryConsent>(() =>
    isHosted ? readTelemetryConsent(getBrowserLocalStorage()) : null,
  )
  const controllerRef = useRef<HostedTelemetryController | null>(null)

  if (controllerRef.current === null && typeof window !== 'undefined') {
    controllerRef.current = createBrowserTelemetryController()
  }

  useEffect(() => {
    controllerRef.current?.update(consent, pathname)
  }, [consent, pathname])

  useEffect(
    () => () => controllerRef.current?.update(null, '/'),
    [],
  )

  useEffect(() => {
    if (!isHosted) return

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key !== TELEMETRY_CONSENT_STORAGE_KEY &&
        event.key !== null
      ) {
        return
      }

      const nextConsent =
        event.key === TELEMETRY_CONSENT_STORAGE_KEY
          ? event.newValue === 'accepted' || event.newValue === 'declined'
            ? event.newValue
            : null
          : readTelemetryConsent(getBrowserLocalStorage())
      controllerRef.current?.update(nextConsent, pathname)
      setConsent(nextConsent)
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [isHosted, pathname])

  const chooseConsent = useCallback(
    (choice: TelemetryConsentChoice) => {
      if (!isHosted) return
      controllerRef.current?.update(choice, pathname)
      writeTelemetryConsent(choice, getBrowserLocalStorage())
      setConsent(choice)
    },
    [isHosted, pathname],
  )

  const context = useMemo(
    () => ({ isHosted, consent, chooseConsent }),
    [isHosted, consent, chooseConsent],
  )

  return (
    <HostedTelemetryContext.Provider value={context}>
      {children}
      {isHosted && consent === null && (
        <TelemetryConsentPrompt onChoose={chooseConsent} />
      )}
    </HostedTelemetryContext.Provider>
  )
}

export function useHostedTelemetryConsent(): HostedTelemetryContextValue {
  return useContext(HostedTelemetryContext)
}

export function TelemetryConsentPrompt({
  onChoose,
}: {
  onChoose: (choice: TelemetryConsentChoice) => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <Card
        role="dialog"
        aria-labelledby="telemetry-consent-title"
        aria-describedby="telemetry-consent-description"
        className="mx-auto max-w-2xl shadow-lg"
      >
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 space-y-1.5">
            <h2 id="telemetry-consent-title" className="font-medium">
              Help improve the Hosted app?
            </h2>
            <p
              id="telemetry-consent-description"
              className="text-sm text-muted-foreground"
            >
              Allow anonymous, aggregate pageview counts for the four app pages.
              No Todoist token, task or project content, filter value, query
              parameter, identifier, or custom event is measured. You can change
              this choice anytime in Settings.
            </p>
          </div>
          <div className="flex shrink-0 gap-2 sm:flex-col-reverse">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChoose('declined')}
              className="flex-1"
            >
              No thanks
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onChoose('accepted')}
              className="flex-1"
            >
              Allow pageviews
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function HostedTelemetrySettings() {
  const { isHosted, consent, chooseConsent } = useHostedTelemetryConsent()

  if (!isHosted) return null

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Anonymous pageview measurement</p>
          <p className="text-xs text-muted-foreground">
            The Hosted app can send aggregate visits for Home, Daily Review,
            Weekly Review, and Settings to the maintainer&apos;s Umami instance.
            It never sends Todoist data, filter values, query parameters,
            identifiers, or custom events.
          </p>
        </div>
        <div
          role="group"
          aria-label="Anonymous pageview measurement consent"
          className="flex gap-2"
        >
          <Button
            type="button"
            size="sm"
            variant={consent === 'accepted' ? 'default' : 'outline'}
            aria-pressed={consent === 'accepted'}
            onClick={() => chooseConsent('accepted')}
            className="flex-1"
          >
            Allow
          </Button>
          <Button
            type="button"
            size="sm"
            variant={consent === 'declined' ? 'default' : 'outline'}
            aria-pressed={consent === 'declined'}
            onClick={() => chooseConsent('declined')}
            className="flex-1"
          >
            Don&apos;t allow
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {consent === 'accepted'
            ? 'Pageview measurement is on. Turning it off stops future measurement immediately.'
            : consent === 'declined'
              ? 'Pageview measurement is off.'
              : 'No choice has been saved yet.'}
        </p>
      </div>
    </>
  )
}
