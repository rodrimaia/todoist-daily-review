import { test, expect } from 'bun:test'
import { expandFilterQuery } from './task-filters'

test('simple filter without OR groups passes through', () => {
  expect(expandFilterQuery('@next_action & today')).toEqual(['@next_action & today'])
})

test('filter with parenthesized OR group expands into multiple queries', () => {
  expect(expandFilterQuery('@next_action & (no date | overdue | today)')).toEqual([
    '@next_action & no date',
    '@next_action & overdue',
    '@next_action & today',
  ])
})

test('standalone OR group expands', () => {
  expect(expandFilterQuery('(overdue | today)')).toEqual(['overdue', 'today'])
})

test('filter with two OR parts', () => {
  expect(expandFilterQuery('@work & (today | tomorrow)')).toEqual([
    '@work & today',
    '@work & tomorrow',
  ])
})

test('no parentheses returns as-is', () => {
  expect(expandFilterQuery('#Inbox')).toEqual(['#Inbox'])
})
