import { describe, expect, test } from 'bun:test'
import type { Task } from '@doist/todoist-sdk'
import { canChangeTaskDueDate } from './task-decisions'

function taskWithRecurrence(isRecurring: boolean): Pick<Task, 'due'> {
  return { due: { isRecurring } } as Pick<Task, 'due'>
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
