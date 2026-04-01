import type { Task } from '@doist/todoist-sdk'
import { getTodoistApi } from './todoist'

/**
 * The Todoist REST API doesn't support complex filter syntax with | (OR)
 * and parentheses, even though the Todoist app does. This function splits
 * a compound filter into multiple simple API calls and merges the results.
 *
 * Example: "@next_action & (no date | overdue | today)" becomes 3 calls:
 *   - "@next_action & no date"
 *   - "@next_action & overdue"
 *   - "@next_action & today"
 *
 * Simple filters without parenthesized OR groups are sent as-is.
 */
export async function fetchFilteredTasks(query: string): Promise<Task[]> {
  const queries = expandFilterQuery(query)
  const api = getTodoistApi()

  if (queries.length === 1) {
    const data = await api.getTasksByFilter({ query: queries[0] })
    return data.results ?? []
  }

  const results = await Promise.all(
    queries.map((q) => api.getTasksByFilter({ query: q })),
  )

  const seen = new Set<string>()
  const merged: Task[] = []
  for (const result of results) {
    for (const task of result.results ?? []) {
      if (!seen.has(task.id)) {
        seen.add(task.id)
        merged.push(task)
      }
    }
  }
  return merged
}

/**
 * Expands a filter query with parenthesized OR groups into multiple simple queries.
 *
 * "A & (B | C | D)" -> ["A & B", "A & C", "A & D"]
 * "A & B"           -> ["A & B"]  (no expansion needed)
 * "(A | B)"         -> ["A", "B"]
 */
export function expandFilterQuery(query: string): string[] {
  const match = query.match(/^(.*?)\(([^)]+)\)(.*)$/)
  if (!match) return [query.trim()]

  const prefix = match[1].trim()
  const orGroup = match[2]
  const suffix = match[3].trim()

  const parts = orGroup.split('|').map((s) => s.trim()).filter(Boolean)
  if (parts.length <= 1) return [query.trim()]

  return parts.map((part) => {
    const segments = [prefix, part, suffix].map((s) => s.trim()).filter(Boolean)
    // Clean up: remove trailing/leading & from joining
    return segments
      .join(' ')
      .replace(/&\s*$/, '')
      .replace(/^\s*&/, '')
      .replace(/&\s+&/g, '&')
      .trim()
  })
}
