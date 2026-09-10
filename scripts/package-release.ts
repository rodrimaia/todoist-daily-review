import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const out = join(root, 'artifacts')
const hostPlatform = process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux'
const hostArchitecture = process.arch === 'arm64' ? 'arm64' : 'x64'
const targets = (process.env.RELEASE_TARGETS ?? `${hostPlatform}-${hostArchitecture}`).split(',').map((target) => target.trim()).filter(Boolean)
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

for (const target of targets) {
  const [platform, architecture] = target.split('-')
  if (!platform || !architecture) throw new Error(`Invalid release target: ${target}`)
  const binaryName = `todoist-review-${target}`
  const binary = join(out, binaryName)
  const build = Bun.spawnSync([
    'bun', 'build', 'apps/tui/src/main.ts', '--compile',
    '--target', `bun-${platform}-${architecture}`, '--outfile', binary,
  ], { cwd: root, stdout: 'inherit', stderr: 'inherit' })
  if (!build.success || !existsSync(binary)) throw new Error(`TUI packaging build failed for ${target}`)
  const archive = join(out, `${binaryName}.tar.gz`)
  const tar = Bun.spawnSync(['tar', '-czf', archive, '-C', out, binaryName], { stdout: 'inherit', stderr: 'inherit' })
  if (!tar.success) throw new Error(`Unable to create release archive for ${target}`)
  const digest = await new Response(Bun.file(archive)).arrayBuffer().then((bytes) => crypto.subtle.digest('SHA-256', bytes))
  const checksum = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  await Bun.write(`${archive}.sha256`, `${checksum}  ${archive.split('/').pop()}\n`)
}
console.log(`Created ${targets.length} release artifact set(s) for commit ${process.env.GITHUB_SHA ?? 'local'}.`)
