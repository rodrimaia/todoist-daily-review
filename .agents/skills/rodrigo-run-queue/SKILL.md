---
name: rodrigo-run-queue
description: Verify and repair approved GitHub Agent-Ready Issues, then autonomously drain the repository-wide Execution Frontier. Use explicitly from a fresh session to continue approved work; requires gh authentication and native fresh isolated Worker contexts.
---

# Run the repository queue

Act only as the Queue Orchestrator. Never implement a Delivery Slice or edit implementation files in this context. If this session contains the preceding Discovery Interview or Approval View, stop and ask the user to invoke this skill in a new session.

## Prerequisites

Require all of the following before changing remote state:

- the original `openspec` and authenticated `gh` CLIs;
- a GitHub remote and permission to create issues, push claim refs and branches, observe checks, and merge pull requests;
- native Codex subagent or OpenCode child-session support for a fresh isolated Worker per issue. Do not run in a shared-context or degraded mode.

Default to `max_parallel = 1`. Increase it only when the user explicitly configures a higher limit; still select only mutually eligible slices with separate claims, branches, worktrees, and Worker contexts.

Resolve the target repository's default branch once before reading canonical artifacts:

```sh
default_branch="$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name')"
test -n "$default_branch"
git fetch origin "$default_branch"
```

## Load the contracts

Read [reconciliation.md](references/reconciliation.md) before touching issues or claims. Read [worker.md](references/worker.md) before assembling a Worker Context Packet. Read [recovery.md](references/recovery.md) when a Worker repeats a blocker twice, exhausts context, reports Spec Drift, or lacks authority.

Use the files in `assets/templates/` verbatim as structural templates. Replace every placeholder; never remove generated markers or result-envelope fields.

## Reconcile first

1. Read every `workflow/initiatives/*.yaml` manifest from `origin/$default_branch`, including Initiatives older than the newest one.
2. Validate each manifest, source commit, stable slice ID, one-to-one OpenSpec change mapping, blocker reference, and acyclic graph. Confirm the exact active Spec Change exists on the detected default branch.
3. Verify and repair every slice idempotently through `gh` as described in [reconciliation.md](references/reconciliation.md): preserve complete issues, create missing issues, replace drifted generated bodies, preserve execution state and comments, and make GitHub `blocked by` relationships exactly match the manifest.
4. Finish reconciliation before selecting any work. A partial or ambiguous projection is a systemic blocker; report it instead of implementing.

## Drain the Execution Frontier

Repeat these steps until no eligible issue remains:

1. Query all open issues in the repository. The Execution Frontier contains every generated issue labeled `ready-for-agent` whose GitHub blockers are closed and whose deterministic remote claim ref is absent. Do not scope selection to one Initiative.
2. Select an eligible issue according to stable issue-number order unless the repository specifies another deterministic policy.
3. Acquire its exclusive remote Work Claim using the conditional push protocol in [reconciliation.md](references/reconciliation.md). If the push fails because the ref exists, skip it and recompute the entire frontier.
4. Assemble `assets/templates/context-packet.md` with only the allowed canonical inputs. Start one new isolated Worker subagent or child session. Do not include this conversation, the Approval View, rejected alternatives, unrelated issues, or other slices.
5. Accept only `assets/templates/worker-result-envelope.md` from the Worker. Retain no implementation transcript.
6. On `merged`, confirm the merge commit is on `origin/$default_branch` and the issue is closed, then release the claim with its lease and recompute the frontier. Newly unblocked or newly published work is immediately eligible.
7. On `recovery_required`, end that Worker and start one fresh strong-reasoning Recovery Worker with the bounded recovery packet. Never reuse the failed context.
8. On `blocked` or `spec_drift`, follow [recovery.md](references/recovery.md), release the claim only after remote issue state is recorded, and continue independent frontier work.

Never use labels as active-work locks. A dependency does not change `ready-for-agent`; only an unavailable decision, authority, or capability changes it to `blocked`.

## Stop

After every terminal outcome, reconcile and recompute. Stop successfully only when the repository-wide Execution Frontier is empty. Report merged issues, blocked issues, recorded verification limitations, and that the terminal frontier is empty. If infrastructure prevents reconciliation or frontier computation for the repository as a whole, stop as systemically blocked with command evidence.
