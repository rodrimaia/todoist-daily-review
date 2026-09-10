const checks = ['validate:workspaces', 'parity:check', 'test:review-scenarios']
for (const check of checks) {
  console.log(`\n==> release gate: ${check}`)
  const result = Bun.spawnSync(['bun', 'run', check], { stdout: 'inherit', stderr: 'inherit' })
  if (!result.success) throw new Error(`${check} failed (exit ${result.exitCode})`)
}
console.log('\nRelease gate passed.')
