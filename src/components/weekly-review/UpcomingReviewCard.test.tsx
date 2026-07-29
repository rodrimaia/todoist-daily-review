import { describe, expect, test } from 'bun:test'
import type { Task } from '@doist/todoist-sdk'
import { renderToStaticMarkup } from 'react-dom/server'
import { UpcomingReviewCard } from './UpcomingReviewCard'

function upcomingTask(isRecurring: boolean): Task {
  return {
    id: isRecurring ? 'recurring' : 'one-off',
    content: isRecurring ? 'Recurring task' : 'One-off task',
    projectId: 'project',
    due: {
      date: '2030-01-01',
      string: isRecurring ? 'every day' : 'Jan 1',
      isRecurring,
    },
  } as Task
}

function renderTask(task: Task): string {
  return renderToStaticMarkup(
    <UpcomingReviewCard
      tasks={[task]}
      projectMap={new Map()}
      onReschedule={() => {}}
      onComplete={() => {}}
      onRemoveDate={() => {}}
      onDone={() => {}}
      onStop={() => {}}
    />,
  )
}

describe('Weekly Upcoming recurrence regression', () => {
  test('does not render reschedule or remove-date controls for recurring tasks', () => {
    const markup = renderTask(upcomingTask(true))

    expect(markup).toContain('title="Complete"')
    expect(markup).not.toContain('title="Reschedule"')
    expect(markup).not.toContain('title="Remove date"')
  })

  test('keeps reschedule and remove-date controls for non-recurring tasks', () => {
    const markup = renderTask(upcomingTask(false))

    expect(markup).toContain('title="Reschedule"')
    expect(markup).toContain('title="Complete"')
    expect(markup).toContain('title="Remove date"')
  })
})
