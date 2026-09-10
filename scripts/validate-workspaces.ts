/** Validate every workspace without relying on package-manager-specific recursion. */
const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '')

const commands: Array<[string, string[], string]> = [
  ['root', ['run', 'validate'], root],
  ['tui', ['run', 'build'], `${root}/apps/tui`],
  ['web', ['run', 'typecheck'], `${root}/apps/web`],
]

for (const [name, args, cwd] of commands) {
  console.log(`\n==> validating ${name}`)
  const result = Bun.spawnSync(['bun', ...args], { cwd, stdout: 'inherit', stderr: 'inherit' })
  if (!result.success) throw new Error(`${name} validation failed (exit ${result.exitCode})`)
}

console.log('\nAll workspaces validated.')
