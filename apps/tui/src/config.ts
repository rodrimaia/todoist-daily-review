import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

export interface TerminalConfig {
  token?: string
  apiUrl?: string
}

export interface CredentialSources {
  /** Reserved for embedding/tests; the CLI deliberately has no token flag. */
  cli?: string
  env?: string
  file?: string
}

export function defaultConfigPath(home = homedir()): string {
  return join(home, '.config', 'todoist-review', 'config.toml')
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
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
  writeFileSync(path, `${lines.join('\n')}\n`, { mode: 0o600 })
  chmodSync(path, 0o600)
}

export function onboardingConfig(path = defaultConfigPath()): string {
  return `Create ${path} with:\n\n[todoist]\ntoken = "YOUR_TODOIST_API_TOKEN"\n\nKeep this file private (mode 600). Alternatively set TODOIST_API_TOKEN for a one-time session.`
}
