import { expect, test } from 'bun:test'
import { mkdtempSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseConfigToml, resolveToken, saveConfig, resolveCredentials } from './config'

test('parses the documented TOML credential shape', () => {
  expect(parseConfigToml('[todoist]\ntoken = "from-file"\napi_url = \'https://example.test\'')).toEqual({ token: 'from-file', apiUrl: 'https://example.test' })
})

test('credential precedence is environment, then config file', () => {
  expect(resolveToken({ env: 'env', file: 'file' })).toBe('env')
  expect(resolveCredentials({ configPath: '/does/not/exist', env: { TODOIST_API_TOKEN: 'env' } }).token).toBe('env')
})

test('saved credentials are owner-only', () => {
  const dir = mkdtempSync(join(tmpdir(), 'todoist-review-'))
  const path = join(dir, 'config.toml')
  saveConfig({ token: 'secret' }, path)
  expect(statSync(path).mode & 0o777).toBe(0o600)
})
