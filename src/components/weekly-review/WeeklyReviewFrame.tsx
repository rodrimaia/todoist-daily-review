import type { ReactNode } from 'react'
import type { WeeklyPhase, WeeklyReviewState } from '~/lib/weekly-review-machine'
import { getWeeklyPhaseIndex, getWeeklyPhaseTotal } from '~/lib/weekly-review-machine'
import { PaperMasthead, PaperPage } from '~/components/PaperPage'

const PHASE_DETAILS: Record<Exclude<WeeklyPhase, 'summary'>, { number: string; title: string; description: string }> = {
  inbox: {
    number: '01',
    title: 'Clear the landing pad.',
    description: 'Give every Inbox item a trusted place before looking at the wider system.',
  },
  projects: {
    number: '02',
    title: 'Read the project ledger.',
    description: 'Make sure every active commitment has a visible next action.',
  },
  someday: {
    number: '03',
    title: 'Revisit the maybe pile.',
    description: 'Notice what has become timely, and let stale ideas leave quietly.',
  },
  upcoming: {
    number: '04',
    title: 'Look over the horizon.',
    description: 'Shape the next seven days before they begin shaping you.',
  },
}

export function WeeklyReviewFrame({
  state,
  children,
}: {
  state: WeeklyReviewState
  children: ReactNode
}) {
  if (state.phase === 'summary') return children

  const details = PHASE_DETAILS[state.phase]
  const total = getWeeklyPhaseTotal(state)
  const index = getWeeklyPhaseIndex(state)
  const current = Math.min(index + 1, total)

  return (
    <PaperPage>
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl grid-rows-[auto_1fr] gap-8">
        <PaperMasthead
          eyebrow={`Weekly review · Part ${details.number}`}
          title={details.title}
          description={details.description}
          aside={
            total > 0 ? (
              <div
                className="text-right font-mono text-xs leading-5 text-current/50"
                role="progressbar"
                aria-label={`${state.phase} phase progress`}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={index}
              >
                <div>{current.toString().padStart(2, '0')} / {total.toString().padStart(2, '0')}</div>
                <div>{Math.round((index / total) * 100)}% cleared</div>
              </div>
            ) : undefined
          }
        />
        <div key={state.phase} className="content-enter grid content-center justify-items-center gap-6 pb-8">{children}</div>
      </div>
    </PaperPage>
  )
}
