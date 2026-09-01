import { describe, expect, test } from 'bun:test'
import type { PersonalProject } from '@doist/todoist-sdk'
import { getAllActiveProjects } from './todoist'

function project(id: string): PersonalProject {
  return { id, name: id } as PersonalProject
}

describe('active Project loading', () => {
  test('follows every cursor so Subproject eligibility uses the complete Project list', async () => {
    const cursors: Array<string | undefined> = []
    const result = await getAllActiveProjects({
      getProjects: async (args) => {
        cursors.push(args?.cursor)
        if (!args?.cursor) {
          return { results: [project('parent')], nextCursor: 'next-page' }
        }
        return { results: [project('subproject')], nextCursor: null }
      },
    })

    expect(cursors).toEqual([undefined, 'next-page'])
    expect(result.results.map((item) => item.id)).toEqual(['parent', 'subproject'])
    expect(result.nextCursor).toBeNull()
  })
})
