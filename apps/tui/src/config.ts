import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir, platform } from 'node:os'

export interface TerminalConfig {
  token?: string
  apiUrl?: string
  reviewFilter?: string
  somedayProject?: string
  excludeProjectPrefixes?: string[]
  reviewTrackingTask?: string
}

export interface CredentialSources {
  /** Reserved for embedding/tests; the CLI deliberately has no token flag. */
  cli?: string
  env?: string
  file?: string
}

export function defaultConfigPath(home = homedir(), env: NodeJS.ProcessEnv = process.env, os = platform()): string {
  if (os === 'win32') return join(env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'todoist-review', 'config.toml')
  return join(env.XDG_CONFIG_HOME ?? join(home, '.config'), 'todoist-review', 'config.toml')
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseList(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [unquote(trimmed)]
  return trimmed.slice(1, -1).split(',').map((item) => unquote(item)).filter(Boolean)
}

export function parseConfigToml(contents: string): TerminalConfig {
  const config: TerminalConfig = {}
  let section = ''
  for (const raw of contents.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    if (!line) continue
    const header = /^\[([^\]]+)\]$/.exec(line)
    if (header) { section = header[1]!.trim(); continue }
    const match = /^([A-Za-z][\w-]*)\s*=\s*(.+)$/.exec(line)
    if (!match || (section && section !== 'todoist')) continue
    const key = match[1]
    const value = unquote(match[2]!)
    if (key === 'token' || key === 'api_token') config.token = value
    if (key === 'api_url') config.apiUrl = value
    if (key === 'review_filter') config.reviewFilter = value
    if (key === 'someday_project') config.somedayProject = value
    if (key === 'exclude_project_prefixes') config.excludeProjectPrefixes = parseList(match[2]!)
    if (key === 'review_tracking_task') config.reviewTrackingTask = value
  }
  return config
}

export function readConfig(path = defaultConfigPath()): TerminalConfig {
  try { return parseConfigToml(readFileSync(path, 'utf8')) } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

export function resolveToken(sources: CredentialSources): string | undefined {
  return [sources.cli, sources.env, sources.file].find((value) => value?.trim())?.trim()
}

export function resolveCredentials(options: { cliToken?: string; configPath?: string; env?: NodeJS.ProcessEnv } = {}) {
  const env = options.env ?? process.env
  const path = options.configPath ?? defaultConfigPath()
  const file = readConfig(path)
  return { token: resolveToken({ cli: options.cliToken, env: env.TODOIST_API_TOKEN, file: file.token }), path, config: file }
}

export function saveConfig(config: TerminalConfig, path = defaultConfigPath()): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const lines = ['# Todoist Review terminal configuration', '[todoist]']
  if (config.token) lines.push(`token = ${JSON.stringify(config.token)}`)
  if (config.apiUrl) lines.push(`api_url = ${JSON.stringify(config.apiUrl)}`)
  if (config.reviewFilter) lines.push(`review_filter = ${JSON.stringify(config.reviewFilter)}`)
  if (config.somedayProject) lines.push(`someday_project = ${JSON.stringify(config.somedayProject)}`)
  if (config.excludeProjectPrefixes?.length) lines.push(`exclude_project_prefixes = [${config.excludeProjectPrefixes.map((prefix) => JSON.stringify(prefix)).join(', ')}]`)
  if (config.reviewTrackingTask) lines.push(`review_tracking_task = ${JSON.stringify(config.reviewTrackingTask)}`)
  writeFileSync(path, `${lines.join('\n')}\n`, { mode: 0o600 })
  chmodSync(path, 0o600)
}

export function onboardingConfig(path = defaultConfigPath()): string {
  return `Create ${path} with:\n\n[todoist]\ntoken = "YOUR_TODOIST_API_TOKEN"\nreview_filter = "@next_action"\n\nKeep this file private (mode 600). Alternatively set TODOIST_API_TOKEN for a one-time session.`
}
