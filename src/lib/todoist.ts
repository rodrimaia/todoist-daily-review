import type { PersonalProject, WorkspaceProject } from '@doist/todoist-sdk'
import { TodoistAdapter, type TodoistPort } from '../../packages/todoist/src/index'
import { getToken } from './storage'

let apiInstance: TodoistPort | null = null
let currentToken: string | null = null

/**
 * Browser compatibility boundary. Callers may provide a token explicitly in
 * tests or in a future client; the Web app defaults to its browser session.
 */
export function getTodoistApi(token = getToken()): TodoistPort {
  if (!token) throw new Error('No API token configured')

  if (!apiInstance || currentToken !== token) {
    apiInstance = new TodoistAdapter(token)
    currentToken = token
  }

  return apiInstance
}

type Project = PersonalProject | WorkspaceProject

interface ActiveProjectsApi {
  getProjects(args?: { cursor?: string }): Promise<{
    results: Project[]
    nextCursor: string | null
  }>
}

/** Loads every active Project page so all consumers of the shared cache see the same data. */
export async function getAllActiveProjects(
  api: ActiveProjectsApi = getTodoistApi(),
): Promise<{ results: Project[]; nextCursor: null }> {
  const results: Project[] = []
  let cursor: string | undefined

  while (true) {
    const page = await api.getProjects(cursor ? { cursor } : undefined)
    results.push(...page.results)
    if (!page.nextCursor) return { results, nextCursor: null }
    cursor = page.nextCursor
  }
}

export function resetTodoistApi(): void {
  apiInstance = null
  currentToken = null
}
