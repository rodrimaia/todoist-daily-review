import { Button } from '~/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export function TodoistReadError({
  onRetry,
  isRetrying,
  showSettingsLink = true,
}: {
  onRetry: () => void
  isRetrying: boolean
  showSettingsLink?: boolean
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 text-center py-6">
      <div className="space-y-1">
        <p className="text-sm font-medium">Could not load Todoist data</p>
        <p className="text-xs text-muted-foreground">
          Check your connection or API token and try again.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : 'Retry'}
        </Button>
        {showSettingsLink && (
          <Link
            to="/settings"
            className="text-xs text-muted-foreground underline underline-offset-4"
          >
            Open settings
          </Link>
        )}
      </div>
    </div>
  )
}
