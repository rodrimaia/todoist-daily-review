import { expect, test } from 'bun:test'
import type { PersonalProject } from '@doist/todoist-sdk'
import { searchProjects } from './focus-desk'

const project = (id: string, name: string, inboxProject = false) => ({
  id,
  name,
  inboxProject,
} as unknown as PersonalProject)

test('project picker search is case-insensitive and excludes Inbox', () => {
  const projects = [
    project('inbox', 'Inbox', true),
    project('work', 'Work / Launch'),
    project('personal', 'Personal'),
  ]

  expect(searchProjects(projects, 'launch').map((item) => item.id)).toEqual(['work'])
  expect(searchProjects(projects, '').map((item) => item.id)).toEqual(['work', 'personal'])
})
