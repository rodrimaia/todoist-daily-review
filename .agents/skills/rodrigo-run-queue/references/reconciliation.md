# Reconciliation and Work Claims

## Canonical issue projection

Read manifests and their exact active OpenSpec changes from `origin/$default_branch`, where the caller has resolved and fetched the target repository's default branch. Render `assets/templates/agent-ready-issue.md` deterministically from those canonical files. Use this exact identity marker:

`<!-- ai-workflow:slice-id: <stable-slice-id> -->`

Search open and closed issues through `gh issue list --state all --search '"<marker>" in:body' --json number,state,body,labels`. Zero matches means create exactly one issue with `gh issue create --label ready-for-agent --body-file <rendered-file>`. One match means reconcile it. More than one match is ambiguous generated state: stop reconciliation rather than choosing or creating another issue.

For an existing projection:

- render the canonical body and replace any different body with `gh issue edit <number> --body-file <rendered-file>`;
- preserve open/closed state, `ready-for-agent` versus `blocked`, comments, assignees, and other mutable execution state;
- do not copy manual body edits elsewhere; normative edits require Spec Drift;
- ensure the two permitted labels exist with `gh label create ready-for-agent --force` and `gh label create blocked --force`, but do not introduce triage, review, or active-work labels.

After every slice has an issue number, compare its current GitHub `blockedBy` issue numbers with the manifest. Use `gh issue edit <number> --add-blocked-by <number>` for missing edges and `--remove-blocked-by <number>` for stale generated edges. Re-read the issue and require exact agreement. Dependency links and the generated `Blocked By` section must agree.

Re-running reconciliation with unchanged canonical artifacts must create no issues and perform no edits.

## Frontier eligibility

An issue is eligible only when all are true:

1. it is open and contains exactly one valid stable slice marker;
2. it has `ready-for-agent` and not `blocked`;
3. every GitHub `blockedBy` issue is closed;
4. `refs/ai-workflow/claims/issue-<number>` does not exist on the remote.

Recompute against the whole repository after reconciliation, every failed claim, and every terminal Worker result. Never infer dependency completion from a local branch or Worker report; a blocker advances the frontier only after its merge is on `origin/$default_branch` and its issue is closed.

## Exclusive remote claim

Use the deterministic ref `refs/ai-workflow/claims/issue-<number>`. Create a unique, parentless claim commit whose message contains the issue, Queue Run ID, Worker ID, and UTC creation time. Push its exact object ID without force:

```sh
git push origin <claim-object-id>:refs/ai-workflow/claims/issue-<number>
```

Because each run creates a distinct parentless object, only the first push to an absent ref can succeed; a competing push is non-fast-forward and must be treated as a lost claim. Confirm the remote ref equals the claimed object before delegation. Do not retry with force.

Release only the claim object this run owns:

```sh
git push --force-with-lease=refs/ai-workflow/claims/issue-<number>:<claim-object-id> origin :refs/ai-workflow/claims/issue-<number>
```

If the lease fails, do not delete another run's claim. Record the conflict and recompute. Remove an owned claim after merged, blocked, cancelled, or recorded Spec Drift; never remove it while a Worker or Recovery Worker is active.
