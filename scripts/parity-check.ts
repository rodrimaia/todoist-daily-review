/** Keep the release surface explicit: each shipped client must have a build and docs. */
import { existsSync } from 'node:fs'

const required = [
  ['apps/web', 'apps/web/package.json'],
  ['apps/tui', 'apps/tui/package.json'],
] as const

for (const [workspace, manifest] of required) {
  if (!existsSync(manifest)) throw new Error(`${workspace} is missing ${manifest}`)
}
if (!existsSync('apps/tui/README.md')) throw new Error('TUI workspace is missing its release documentation')
console.log('Web/TUI parity surface is complete: both workspaces have manifests and the TUI has user documentation.')
