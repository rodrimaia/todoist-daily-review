import { TodoistApi } from '@doist/todoist-api-typescript'
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

export function resetTodoistApi(): void {
  apiInstance = null
  currentToken = null
}
