import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Skeleton } from '~/components/Skeleton'

export function PaperPage({
  children,
  className,
  ariaBusy,
}: {
  children: ReactNode
  className?: string
  ariaBusy?: boolean
}) {
  return (
    <main
      className={cn(
        'morning-paper min-h-screen bg-[#f4efe6] px-5 py-8 text-[#29251f] dark:bg-[#1c1b18] dark:text-[#f6f0e7] sm:px-10 sm:py-12',
        className,
      )}
      aria-busy={ariaBusy}
    >
      {children}
    </main>
  )
}

export function PaperMasthead({
  eyebrow,
  title,
  description,
  aside,
  backTo,
  backLabel = 'Back',
}: {
  eyebrow: string
  title: string
  description?: string
  aside?: ReactNode
  backTo?: '/'
  backLabel?: string
}) {
  return (
    <header className="border-b border-current/20 pb-5">
      {backTo && (
        <Link
          to={backTo}
          className="mb-7 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-current/50 transition-colors hover:text-current"
        >
          <ArrowLeft className="size-3.5" />
          {backLabel}
        </Link>
      )}
      <div className="flex items-end justify-between gap-8">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-700 dark:text-orange-300">
            {eyebrow}
          </p>
          <h1 className="text-balance font-serif text-4xl leading-none tracking-[-0.025em] sm:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mt-4 max-w-2xl font-serif text-lg italic leading-7 text-current/60 sm:text-xl">
              {description}
            </p>
          )}
        </div>
        {aside && <div className="hidden shrink-0 sm:block">{aside}</div>}
      </div>
    </header>
  )
}

export function DailyReviewSkeleton() {
  return (
    <PaperPage ariaBusy>
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl grid-rows-[auto_1fr] gap-10">
        <div className="flex justify-between border-b border-current/20 pb-4"><div className="space-y-3"><Skeleton className="h-3 w-36" /><Skeleton className="h-7 w-72" /></div><Skeleton className="h-10 w-16" /></div>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,.65fr)] lg:gap-20">
          <div className="space-y-7"><Skeleton className="h-3 w-28" /><Skeleton className="h-14 w-full max-w-2xl" /><Skeleton className="h-14 w-4/5" /><Skeleton className="h-4 w-48" /></div>
          <div className="space-y-4 border-t border-current/20 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"><Skeleton className="h-8 w-44" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-4/5" /><Skeleton className="h-8 w-2/3" /></div>
        </div>
      </div>
      <span className="sr-only" role="status">Preparing today’s review</span>
    </PaperPage>
  )
}

export function WeeklyReviewSkeleton() {
  return (
    <PaperPage ariaBusy>
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl grid-rows-[auto_1fr] gap-8">
        <div className="border-b border-current/20 pb-5 space-y-4"><Skeleton className="h-3 w-40" /><Skeleton className="h-12 w-full max-w-xl" /><Skeleton className="h-5 w-3/4 max-w-2xl" /></div>
        <div className="grid content-center justify-items-center gap-6 pb-8 w-full"><div className="w-full max-w-2xl space-y-5 border-y border-current/20 p-6"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-4/5" /><Skeleton className="h-9 w-1/2" /></div><Skeleton className="h-10 w-full max-w-2xl" /></div>
      </div>
      <span className="sr-only" role="status">Preparing the weekly review</span>
    </PaperPage>
  )
}

export function PaperMessage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: ReactNode
}) {
  return (
    <PaperPage className="grid place-items-center">
      <section className="w-full max-w-xl border-y border-current/20 py-10 text-center">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-700 dark:text-orange-300">
          {eyebrow}
        </p>
        <h1 className="font-serif text-4xl leading-tight sm:text-5xl">{title}</h1>
        {children && <div className="mt-6">{children}</div>}
      </section>
    </PaperPage>
  )
}
