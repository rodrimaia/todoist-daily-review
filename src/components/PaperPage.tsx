import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { cn } from '~/lib/utils'

export function PaperPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <main
      className={cn(
        'morning-paper min-h-screen bg-[#f4efe6] px-5 py-8 text-[#29251f] dark:bg-[#1c1b18] dark:text-[#f6f0e7] sm:px-10 sm:py-12',
        className,
      )}
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

export function PaperLoading({ label }: { label: string }) {
  return (
    <PaperPage className="grid place-items-center">
      <div className="text-center" role="status" aria-live="polite">
        <div className="mx-auto mb-5 size-8 animate-spin rounded-full border-2 border-current/15 border-t-orange-700 dark:border-t-orange-300" />
        <p className="font-serif text-2xl">{label}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-current/40">Gathering the pages</p>
      </div>
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
