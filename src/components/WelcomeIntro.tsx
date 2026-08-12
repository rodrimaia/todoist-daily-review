import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { DEFAULT_FILTER_QUERY } from '~/lib/storage'
import { CalendarRange, Inbox } from 'lucide-react'

/** Friendly explanation shown before a visitor connects Todoist. */
export function WelcomeIntro() {
  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-medium">Todoist Daily Review</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          A guided review that helps you clear your Inbox and keep your
          next actions moving — right in your browser.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="text-left">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="h-4 w-4" />
              Daily Review
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Clears your Inbox, then walks you through the tasks your review
            filter selects — one task at a time.
          </CardContent>
        </Card>
        <Card className="text-left">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarRange className="h-4 w-4" />
              Weekly Review
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The bigger picture: every active project, your someday/maybe list,
            and the week ahead.
          </CardContent>
        </Card>
      </div>

      <Card className="text-left">
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm">
            <span className="font-medium">Your review filter</span> decides
            which tasks count as next actions. It defaults to{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {DEFAULT_FILTER_QUERY}
            </code>{' '}
            and you can adjust it in Settings if your workflow differs.
          </p>
          <p className="text-sm">
            <span className="font-medium">Live changes</span>: every move,
            schedule, completion, and deletion is applied directly to your
            Todoist account as you go — nothing is staged for later.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
