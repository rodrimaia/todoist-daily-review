# Recovery and blocker handling

Start a fresh strong-reasoning Recovery Worker when the original Worker reports the same blocker twice or exhausts its context. End the original Worker first.

Give Recovery only:

- the original Context Packet;
- the current branch, worktree, and diff;
- commands run and their exact relevant results;
- attempted approaches and why each failed;
- the precise repeated blocker;
- the owned claim object ID.

Do not include the Designer conversation, unrelated issue results, full Queue Run history, or speculative diagnoses. Recovery continues the same slice, branch, worktree, and claim. It must obey the same approved specs, Test-First Contract, verification gates, and result envelope.

If Recovery merges, handle it like any `merged` result. If it still needs unavailable authority or capability, render `assets/templates/blocker-report.md` as an issue comment, replace `ready-for-agent` with `blocked`, confirm the remote state, release the owned claim, and continue independent frontier work.

Treat Spec Drift as an approval blocker, not a recovery puzzle. Do not edit the approved change to make implementation fit. Comment with a Blocker Report identifying the normative contract that would change, label the issue `blocked`, release the claim after state is durable, and continue independent work. Resolution requires a human-approved Spec Change before the issue can return to `ready-for-agent`.

A repository-wide failure of authentication, remote access, reconciliation, claims, or frontier computation is systemic. Stop the Queue Run with command evidence; do not label unrelated slices `blocked`.
