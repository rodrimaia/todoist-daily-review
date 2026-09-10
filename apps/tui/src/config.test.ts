import { expect, test } from 'bun:test'
import { mkdtempSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defaultConfigPath, parseConfigToml, resolveToken, saveConfig, resolveCredentials } from './config'

test('parses the documented TOML credential shape', () => {
  expect(parseConfigToml('[todoist]\ntoken = "from-file"\napi_url = \'https://example.test\'')).toEqual({ token: 'from-file', apiUrl: 'https://example.test' })
})

test('parses review settings and uses platform config conventions', () => {
  expect(parseConfigToml('[todoist]\nreview_filter = "today"\nsomeday_project = "Someday"\nexclude_project_prefixes = ["Archive/", "Done/"]\nreview_tracking_task = "task-1"')).toMatchObject({
    reviewFilter: 'today',
    somedayProject: 'Someday',
    excludeProjectPrefixes: ['Archive/', 'Done/'],
    reviewTrackingTask: 'task-1',
  })
  expect(defaultConfigPath('/home/alice', {}, 'win32')).toBe('/home/alice/AppData/Roaming/todoist-review/config.toml')
  expect(defaultConfigPath('/home/alice', { XDG_CONFIG_HOME: '/tmp/config' }, 'linux')).toBe('/tmp/config/todoist-review/config.toml')
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
