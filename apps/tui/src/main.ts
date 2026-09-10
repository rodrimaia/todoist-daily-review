#!/usr/bin/env bun

import { onboardingConfig, resolveCredentials } from './config'
import type { Task } from '@doist/todoist-sdk'
import { TodoistAdapter, type TodoistPort } from '@todoist-review/todoist'
import {
  advanceDailyReview,
  applyDailyReviewAction,
  beginDailyReviewAction,
  confirmDailyReviewAction,
  createDailyReviewState,
  currentDailyReviewTask,
  dailyReviewSummary,
  failDailyReviewAction,
  loadDailyReview,
  retryDailyReviewAction,
  TerminalWeeklyReview,
  type DailyReviewAction,
  type DailyReviewState,
} from '@todoist-review/review'

export type Route = 'home' | 'daily' | 'weekly' | 'settings'
export type KeyIntent = 'next' | 'previous' | 'select' | 'back' | 'quit' | 'none'
export type Layout = 'compact' | 'wide'

export const VERSION = '0.1.0'

const HELP = `Todoist Review — terminal client

Usage:
  todoist-review [route]

Routes:
  daily       Open the Daily Review
  weekly      Open the Weekly Review
  settings    Open settings

Options:
  --config PATH   Read credentials from a TOML configuration file
  -h, --help      Show this help and exit
  -v, --version   Show the version and exit

Interactive keys:
  j, ↓            Next
  k, ↑            Previous
  enter           Select
  esc, q          Back / quit
`

export function routeFromArgs(args: readonly string[]): Route | 'help' | 'version' | 'error' {
  if (args.includes('--config') || args.some((arg) => arg.startsWith('--config='))) {
    const index = args.indexOf('--config')
    if (index >= 0 && !args[index + 1]) return 'error'
  }
  const positional = args.filter((arg, index) => !arg.startsWith('-') && args[index - 1] !== '--config')
  if (args.includes('--help') || args.includes('-h')) return 'help'
  if (args.includes('--version') || args.includes('-v')) return 'version'
  if (args.some((arg, index) => arg.startsWith('-') && !arg.startsWith('--config=') && arg !== '--config' && args[index - 1] !== '--config')) return 'error'
  if (positional.length > 1) return 'error'
  const route = positional[0] ?? 'home'
  return ['home', 'daily', 'weekly', 'settings'].includes(route) ? route as Route : 'error'
}

export function keyIntent(input: string): KeyIntent {
  if (input === 'j' || input === '\u001b[B') return 'next'
  if (input === 'k' || input === '\u001b[A') return 'previous'
  if (input === '\r' || input === '\n') return 'select'
  if (input === '\u001b' || input === 'q') return 'back'
  if (input === 'x' || input === '\u0003') return 'quit'
  return 'none'
}

export function layoutForWidth(width: number | undefined): Layout {
  return (width ?? 80) < 72 ? 'compact' : 'wide'
}

function screen(route: Route, layout: Layout): string {
  const title = route === 'home' ? 'Todoist Review' : `${route[0].toUpperCase()}${route.slice(1)} Review`
  const hint = route === 'home' ? 'Choose a review to begin.' : 'Terminal shell ready. Review flow will be connected incrementally.'
  const navigation = route === 'home' ? '[d] Daily   [w] Weekly   [s] Settings' : '[q] Back   [x] Quit'
  return `${title}\n${'─'.repeat(layout === 'compact' ? 32 : 56)}\n${hint}\n\n${navigation}\n`
}

export function render(route: Route, width = process.stdout.columns): string {
  return screen(route, layoutForWidth(width))
}

export type DailyIntent = 'complete' | 'delete' | 'keep-date' | 'remove-date' | 'skip' | 'stop' | 'help'

export function dailyIntent(input: string): DailyIntent | 'none' {
  const map: Record<string, DailyIntent> = { c: 'complete', d: 'delete', k: 'keep-date', '0': 'remove-date', s: 'skip', q: 'stop', '?': 'help' }
  return map[input] ?? 'none'
}

/** A small line-oriented shell keeps the terminal client usable in dumb TTYs and tests. */
export async function runInteractive(
  route: Route,
  io: Pick<typeof process, 'stdin' | 'stdout'> = process,
  api?: TodoistPort,
  filterQuery = '@next_action',
): Promise<number> {
  let current = route
  let dailyState: DailyReviewState | undefined
  let weekly: TerminalWeeklyReview | undefined
  const write = (value: string) => io.stdout.write(value)
  const renderCurrent = () => {
    if (current === 'daily' && dailyState) write(renderDailyState(dailyState))
    else if (current === 'weekly' && weekly) write(`Weekly Review\n\nPhase: ${weekly.state.phase}\nInbox: ${weekly.state.inboxTasks.length}  Projects: ${weekly.state.projects.length}  Someday: ${weekly.state.somedayTasks.length}  Upcoming: ${weekly.state.upcomingTasks.length}\n\n[n] next phase  [q] back  [x] quit\n`)
    else write(render(current))
  }
  const loadCurrent = async () => {
    if (current === 'daily' && api && !dailyState) {
      try { dailyState = createDailyReviewState(await loadDailyReview(api, filterQuery)) }
      catch (error) { write(`Unable to load Daily Review: ${error instanceof Error ? error.message : String(error)}\n`) }
    }
    if (current === 'weekly' && api && !weekly) {
      try { weekly = new TerminalWeeklyReview(api); await weekly.start() }
      catch (error) { write(`Unable to load Weekly Review: ${error instanceof Error ? error.message : String(error)}\n`) }
    }
  }
  io.stdout.write(render(current))
  if (io.stdin.isTTY) io.stdin.setRawMode?.(true)
  for await (const chunk of io.stdin) {
    const input = String(chunk).trim()
    if (input === 'x' || input === 'q') {
      if (current !== 'home') { current = 'home'; io.stdout.write(render(current)); continue }
      return 0
    }
    if (current === 'home' && input === 'd') { current = 'daily'; await loadCurrent() }
    else if (current === 'home' && input === 'w') { current = 'weekly'; await loadCurrent() }
    else if (current === 'home' && input === 's') current = 'settings'
    else if (input === 'h' || input === '?') io.stdout.write(HELP)
    else if (current === 'daily' && dailyState && api) {
      if (dailyState.phase === 'error' && input === 'r') {
        const retry = retryDailyReviewAction(dailyState)
        if (retry.pending) {
          try { await applyDailyReviewAction(api, retry.pending); dailyState = advanceDailyReview(retry, retry.pending) }
          catch (error) { dailyState = failDailyReviewAction(retry, error) }
        } else dailyState = retry
      } else if (dailyState.status === 'confirming' && dailyState.pending) {
        if (input === 'y' || input === 'Y') {
          const confirmed = confirmDailyReviewAction(dailyState, true)
          try { await applyDailyReviewAction(api, confirmed.pending!); dailyState = advanceDailyReview(confirmed, confirmed.pending!) }
          catch (error) { dailyState = failDailyReviewAction(confirmed, error) }
        } else if (input === 'n' || input === 'N') dailyState = confirmDailyReviewAction(dailyState, false)
      } else if (dailyState.status === 'ready') {
          const task = currentDailyReviewTask(dailyState)
          const intent = dailyIntent(input)
          if (task && intent !== 'none' && intent !== 'stop' && intent !== 'help') {
          if (intent === 'remove-date' && task.due?.isRecurring) {
            write('Recurring tasks keep their schedule; complete or skip the task instead.\n')
            renderCurrent()
            continue
          }
          const action: DailyReviewAction = intent === 'complete' ? { type: 'complete', taskId: task.id }
            : intent === 'delete' ? { type: 'delete', taskId: task.id }
              : intent === 'skip' ? { type: 'skip', taskId: task.id }
                : intent === 'keep-date' ? { type: 'skip', taskId: task.id }
                  : { type: 'schedule', taskId: task.id, dueString: null }
          const next = beginDailyReviewAction(dailyState, action)
          if (next.status === 'confirming') dailyState = next
          else { try { await applyDailyReviewAction(api, action); dailyState = advanceDailyReview(next, action) } catch (error) { dailyState = failDailyReviewAction(next, error) } }
        }
      }
    } else if (current === 'weekly' && weekly && input === 'n') weekly.advance()
    renderCurrent()
  }
  return 0
}

export function taskDetail(task: Task | undefined, position?: number, total?: number): string {
  if (!task) return 'No task selected\n'
  const due = task.due?.string ?? 'No date'
  const labels = task.labels.length ? task.labels.map((label) => `@${label}`).join(' ') : 'No labels'
  const progress = position !== undefined && total !== undefined ? `\n${position + 1}/${total}` : ''
  const link = task.url ? `\n${task.url}` : ''
  return `${task.content}\n${task.description ? `${task.description}\n` : ''}Project: ${task.projectId}\nDue: ${due}\nLabels: ${labels}${link}${progress}\n`
}

export function renderDailyState(state: DailyReviewState): string {
  if (state.phase === 'summary') {
    const summary = dailyReviewSummary(state)
    const lines = Object.entries(summary).map(([name, count]) => `${name}: ${count}`)
    return `Daily Review complete\n\n${lines.length ? lines.join('\n') : 'No actions taken.'}\n\nPress q to exit.\n`
  }
  if (state.phase === 'error') return `Daily Review error\n${state.error ?? 'Unable to save decision.'}\nPress r to retry or q to exit.\n`
  const task = currentDailyReviewTask(state)
  const total = state.phase === 'inbox' ? state.inboxTasks.length : state.filterTasks.length
  return `${state.phase === 'inbox' ? 'Inbox' : 'Filter'}\n${taskDetail(task, state.index, total)}\n[c] complete  [d] delete  [k] keep date  [0] remove date  [s] skip  [q] stop\n`
}

export function run(args: readonly string[], io: Pick<typeof process, 'stdout' | 'stderr'> = process): number {
  const route = routeFromArgs(args)
  if (route === 'help') { io.stdout.write(`${HELP}\n`); return 0 }
  if (route === 'version') { io.stdout.write(`${VERSION}\n`); return 0 }
  if (route === 'error') { io.stderr.write('Unknown option or route. Use --help for usage.\n'); return 2 }
  const configArg = args.find((arg) => arg.startsWith('--config='))?.slice('--config='.length)
    ?? (args.includes('--config') ? args[args.indexOf('--config') + 1] : undefined)
  let credentials
  try { credentials = resolveCredentials({ configPath: configArg }) } catch { io.stderr.write('Unable to read configuration file.\n'); return 2 }
  if (!credentials.token) { io.stderr.write(`Todoist API token is required.\n\n${onboardingConfig(credentials.path)}\n`); return 2 }
  io.stdout.write(render(route))
  return 0
}

if (import.meta.main) {
  const exitCode = run(Bun.argv.slice(2))
  if (exitCode === 0 && !Bun.argv.slice(2).includes('--help') && !Bun.argv.slice(2).includes('-h') && !Bun.argv.slice(2).includes('--version') && !Bun.argv.slice(2).includes('-v')) {
    const args = Bun.argv.slice(2)
    const configArg = args.find((arg) => arg.startsWith('--config='))?.slice('--config='.length)
      ?? (args.includes('--config') ? args[args.indexOf('--config') + 1] : undefined)
    const credentials = resolveCredentials({ configPath: configArg })
    const api = new TodoistAdapter(credentials.token!)
    await runInteractive(routeFromArgs(args) as Route, process, api, credentials.config.reviewFilter ?? '@next_action')
  }
  process.exit(exitCode)
}
