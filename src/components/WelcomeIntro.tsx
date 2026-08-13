import { DEFAULT_FILTER_QUERY } from '~/lib/storage'
import { CalendarRange, Inbox } from 'lucide-react'

/** Friendly explanation shown before a visitor connects Todoist. */
export function WelcomeIntro() {
  return (
    <div className="w-full max-w-2xl">
      <div className="border-b border-current/20 pb-8 text-center">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-700 dark:text-orange-300">
          Your personal review desk
        </p>
        <h1 className="font-serif text-5xl leading-none tracking-[-0.03em] sm:text-7xl">
          Todoist Daily Review
        </h1>
        <p className="mx-auto mt-5 max-w-xl font-serif text-base italic leading-7 text-current/60 sm:text-base lg:text-lg">
          A guided review that helps you clear your Inbox and keep your
          next actions moving — right in your browser.
        </p>
      </div>

      <div className="grid border-b border-current/20 sm:grid-cols-2">
        <section className="py-7 text-left sm:border-r sm:border-current/20 sm:pr-7">
          <h2 className="flex items-center gap-2 font-serif text-2xl">
            <Inbox className="size-4 text-orange-700 dark:text-orange-300" />
            Daily Review
          </h2>
          <p className="mt-3 text-sm leading-6 text-current/55">
            Clears your Inbox, then walks you through the tasks your review
            filter selects — one task at a time.
          </p>
        </section>
        <section className="border-t border-current/20 py-7 text-left sm:border-t-0 sm:pl-7">
          <h2 className="flex items-center gap-2 font-serif text-2xl">
            <CalendarRange className="size-4 text-orange-700 dark:text-orange-300" />
            Weekly Review
          </h2>
          <p className="mt-3 text-sm leading-6 text-current/55">
            The bigger picture: every active project, your someday/maybe list,
            and the week ahead.
          </p>
        </section>
      </div>

      <div className="grid gap-4 py-6 text-left sm:grid-cols-2">
          <p className="text-sm leading-6 text-current/65">
            <span className="font-medium">Your review filter</span> decides
            which tasks count as next actions. It defaults to{' '}
            <code className="rounded bg-current/8 px-1.5 py-0.5 text-xs">
              {DEFAULT_FILTER_QUERY}
            </code>{' '}
            and you can adjust it in Settings if your workflow differs.
          </p>
          <p className="text-sm leading-6 text-current/65">
            <span className="font-medium">Live changes</span>: every move,
            schedule, completion, and deletion is applied directly to your
            Todoist account as you go — nothing is staged for later.
          </p>
      </div>
    </div>
  )
}
