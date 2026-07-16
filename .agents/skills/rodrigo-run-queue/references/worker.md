# Worker instructions

Receive exactly one Context Packet and implement exactly one Delivery Slice. Do not inspect other Initiative entries, other issues, the Designer conversation, or rejected plans. The Spec Corpus and exact Spec Change are authoritative; the issue is a Generated Projection.

## Isolate the slice

1. Confirm the claimed issue number and slice ID match the packet.
2. Resolve and fetch the repository's default branch with `default_branch="$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name')"` and `git fetch origin "$default_branch"`.
3. Create a dedicated branch from current `origin/$default_branch`, such as `ai-workflow/<slice-id>`, and a dedicated worktree for that branch. Never work in the Queue Orchestrator's checkout or another slice's worktree.
4. Run `openspec status --change <change> --json` and `openspec instructions apply --change <change> --json`. Read every returned context file before editing.

## Establish the Test-First Contract

Before production code, list the applicable public test seams and automated acceptance behaviors from the approved change. Record justified non-automatable behaviors in the Verification Contract.

For each applicable behavior, complete one vertical red-green slice at a time:

1. add a behavior-focused test through an approved public seam using mocks only at system boundaries;
2. run it and observe the expected failure for the missing behavior;
3. add the minimum production behavior that makes it pass;
4. rerun the focused test and relevant nearby tests.

If required production behavior was written before its failing test, discard that premature code and restart the behavior from RED. After every planned behavior is green, perform at most one behavior-preserving cleanup pass and rerun verification. Do not introduce unrelated refactors.

## Apply, verify, archive, and merge

1. Implement every task in the exact standard OpenSpec change, marking tasks complete as they finish. Do not change approved normative contracts.
2. Run every applicable local test, typecheck, lint, and build command plus change-specific verification. Record commands and results. A failed applicable check blocks merge.
3. If no verification can be automated, record the reason; do not invent a low-value test solely to claim automation.
4. Run `openspec validate <change>`. Then use the original standard OpenSpec archive workflow to archive that exact change so its spec delta and code are committed together.
5. Rerun all applicable verification after archive. Commit only this slice, push its branch, and open exactly one pull request linked to the issue.
6. Observe all existing pull request checks with `gh`. When they pass, merge autonomously using a repository-permitted merge method without an independent review gate or administrative bypass.
7. Confirm the merge commit is on `origin/$default_branch` and close the issue as completed if the pull request did not close it automatically.

Return only the fixed Worker result envelope. Do not return a narrative transcript.

## Stop conditions

Stop without widening authority when implementation requires a change to behavior, scope, acceptance criteria, constraints, or an Engineering Spec. Return `spec_drift` with precise evidence. Return `recovery_required` after the same blocker occurs twice or context is nearly exhausted. Return `blocked` only when a current external capability or authority is unavailable and recovery evidence is complete.
