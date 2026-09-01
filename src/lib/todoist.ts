import {
  TodoistApi,
  type PersonalProject,
  type WorkspaceProject,
} from '@doist/todoist-sdk'
import { getToken } from './storage'

let apiInstance: TodoistApi | null = null
let currentToken: string | null = null

export function getTodoistApi(): TodoistApi {
  const token = getToken()
  if (!token) throw new Error('No API token configured')

  if (!apiInstance || currentToken !== token) {
    apiInstance = new TodoistApi(token)
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
