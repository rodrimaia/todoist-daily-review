import { describe, expect, test } from 'bun:test'
import { normalizeReviewTrackingTaskId } from './review-tracking-task'

describe('Review tracking task ID normalization', () => {
  test('accepts current opaque task IDs', () => {
    expect(normalizeReviewTrackingTaskId('6RVfRg2Pm5qHMw5P')).toBe('6RVfRg2Pm5qHMw5P')
  })

  test('extracts an opaque ID from a slugged Todoist app URL', () => {
    expect(
      normalizeReviewTrackingTaskId(
        'https://app.todoist.com/app/task/revisao-semanal-6RVfRg2Pm5qHMw5P',
      ),
    ).toBe('6RVfRg2Pm5qHMw5P')
  })

  test('accepts the canonical Todoist app URL', () => {
    expect(
      normalizeReviewTrackingTaskId(
        'https://app.todoist.com/app/task/6XGgmFVcrG5RRjVr',
      ),
    ).toBe('6XGgmFVcrG5RRjVr')
  })

  test('continues to accept legacy numeric task IDs and URLs', () => {
    expect(normalizeReviewTrackingTaskId('123456789')).toBe('123456789')
    expect(
      normalizeReviewTrackingTaskId(
        'https://app.todoist.com/app/task/123456789',
      ),
    ).toBe('123456789')
  })

  test('rejects non-Todoist and malformed task URLs', () => {
    expect(
      normalizeReviewTrackingTaskId(
        'https://example.com/app/task/revisao-semanal-6RVfRg2Pm5qHMw5P',
      ),
    ).toBeNull()
    expect(
      normalizeReviewTrackingTaskId(
        'http://app.todoist.com/app/task/revisao-semanal-6RVfRg2Pm5qHMw5P',
      ),
    ).toBeNull()
    expect(
      normalizeReviewTrackingTaskId(
        'https://app.todoist.com/app/task/not-a-task-id',
      ),
    ).toBeNull()
  })
})
