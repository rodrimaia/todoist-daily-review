import { describe, expect, test } from 'bun:test'
import type { Task } from '@doist/todoist-sdk'
import { canChangeTaskDueDate, canDeleteTask, isEligibleTrackingOccurrence } from './task-decisions'

function taskWithRecurrence(isRecurring: boolean): Pick<Task, 'due'> {
  return { due: { isRecurring } } as Pick<Task, 'due'>
}

function trackingTask(
  dueDate: string | null,
  isCompleted: boolean,
): Pick<Task, 'due' | 'completedAt'> {
  return {
    completedAt: isCompleted ? '2025-03-15T10:00:00Z' : null,
    due: dueDate ? { date: dueDate, string: 'every week', isRecurring: true } : null,
  } as Pick<Task, 'due' | 'completedAt'>
}

describe('due-date decision eligibility', () => {
  for (const decision of ['reschedule', 'remove date']) {
    test(`blocks ${decision} for a recurring task`, () => {
      expect(canChangeTaskDueDate(taskWithRecurrence(true))).toBe(false)
    })

    test(`allows ${decision} for a non-recurring task`, () => {
      expect(canChangeTaskDueDate(taskWithRecurrence(false))).toBe(true)
    })
  }
})

describe('delete eligibility', () => {
  test('allows delete for a non-recurring task', () => {
    expect(canDeleteTask(taskWithRecurrence(false))).toBe(true)
  })

  test('blocks delete for a recurring task', () => {
    expect(canDeleteTask(taskWithRecurrence(true))).toBe(false)
  })

  test('allows delete for a task with no due data', () => {
    expect(canDeleteTask({ due: null })).toBe(true)
  })
})

describe('tracking occurrence eligibility', () => {
  const reviewDay = '2025-03-15'

  test('eligible when overdue', () => {
    expect(isEligibleTrackingOccurrence(trackingTask('2025-03-14', false), reviewDay)).toBe(true)
  })

  test('eligible when due on the Review day', () => {
    expect(isEligibleTrackingOccurrence(trackingTask('2025-03-15', false), reviewDay)).toBe(true)
  })

  test('not eligible when due in the future', () => {
    expect(isEligibleTrackingOccurrence(trackingTask('2025-03-16', false), reviewDay)).toBe(false)
  })

  test('not eligible when undated', () => {
    expect(isEligibleTrackingOccurrence(trackingTask(null, false), reviewDay)).toBe(false)
  })

  test('not eligible when already completed', () => {
    expect(isEligibleTrackingOccurrence(trackingTask('2025-03-15', true), reviewDay)).toBe(false)
  })

  test('not eligible when completed and overdue', () => {
    expect(isEligibleTrackingOccurrence(trackingTask('2025-03-14', true), reviewDay)).toBe(false)
  })
})
