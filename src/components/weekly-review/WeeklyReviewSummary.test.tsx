import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { WeeklyReviewSummary } from './WeeklyReviewSummary'

describe('Weekly Review Project archive summary', () => {
  test('reports archived Projects, task dispositions, recurring branches, and failures', () => {
    const markup = renderToStaticMarkup(
      <WeeklyReviewSummary
        inboxStats={{ moved: 0, someday: 0, completed: 0, deleted: 0, skipped: 0 }}
        projectStats={{
          reviewed: 0,
          tasksAdded: 0,
          projectsDeleted: 0,
          archiveAttempts: 2,
          projectsArchived: 1,
          tasksKeptOpen: 3,
          tasksCompleted: 4,
          tasksDeleted: 5,
          recurringBranchesPreserved: 2,
          failures: 1,
          skipped: 0,
        }}
        somedayStats={{ activated: 0, kept: 0, deleted: 0 }}
        upcomingStats={{ rescheduled: 0, completed: 0, removedDate: 0 }}
        onDone={() => {}}
      />,
    )

    expect(markup).toContain('Projects archived')
    expect(markup).toContain('Tasks kept open')
    expect(markup).toContain('Tasks completed')
    expect(markup).toContain('Tasks permanently deleted')
    expect(markup).toContain('Recurring branches preserved')
    expect(markup).toContain('Archive operation failures')
  })
})
