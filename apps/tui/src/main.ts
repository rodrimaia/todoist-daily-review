#!/usr/bin/env bun

import { resolveCredentials } from './config'

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

export function run(args: readonly string[], io: Pick<typeof process, 'stdout' | 'stderr'> = process): number {
  const route = routeFromArgs(args)
  if (route === 'help') { io.stdout.write(`${HELP}\n`); return 0 }
  if (route === 'version') { io.stdout.write(`${VERSION}\n`); return 0 }
  if (route === 'error') { io.stderr.write('Unknown option or route. Use --help for usage.\n'); return 2 }
  const configArg = args.find((arg) => arg.startsWith('--config='))?.slice('--config='.length)
    ?? (args.includes('--config') ? args[args.indexOf('--config') + 1] : undefined)
  try { resolveCredentials({ configPath: configArg }) } catch { io.stderr.write('Unable to read configuration file.\n'); return 2 }
  io.stdout.write(render(route))
  return 0
}

if (import.meta.main) process.exit(run(Bun.argv.slice(2)))
