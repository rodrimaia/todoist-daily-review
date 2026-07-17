---
name: rodrigo-propose-change
description: Discover, specify, approve, and publish any software feature, bug fix, refactor, or maintenance change before implementation. Use automatically for every requested software change that does not already have an approved published Initiative.
---

# Propose a change

Act as the Designer. Use the strongest reasoning available. Before approval, do not modify production code, create implementation issues, or publish Initiative artifacts. Never begin implementation in this session.

Require the original `openspec`, `git`, and authenticated `gh` CLIs. Require both Workflow Pack skills and the generated `ralph/` files before publication.

## Load the contracts

Read these bundled references before authoring artifacts:

- [specification-conventions.md](references/specification-conventions.md) for Product and Engineering Spec content;
- [delivery-slices.md](references/delivery-slices.md) before decomposing the Initiative;
- [approval-view.md](references/approval-view.md) before requesting approval;
- [agent-ready-issue-contract.md](references/agent-ready-issue-contract.md) to ensure every slice can later project a complete issue;
- [issue-publication.md](references/issue-publication.md) before publishing issues;
- [agent-ready-issue.md](assets/templates/agent-ready-issue.md) as the canonical issue-body template.

## Discover

1. Inspect `AGENTS.md`, `openspec/config.yaml`, `openspec/specs/`, relevant code and tests, `CONTEXT.md`, and applicable ADRs. Resolve repository facts directly instead of asking the user.
2. Maintain a private list of unresolved normative decisions. Ask exactly one focused question at a time only when evidence cannot decide it. Include a recommended answer and its trade-off.
3. Adapt the interview depth to the change. Continue until intended spec deltas, acceptance criteria, Engineering constraints, scope boundaries, the Verification Contract, Delivery Slices, dependencies, and risks are explicit.
4. Do not treat implementation preferences or discoverable repository facts as user decisions.

## Author standard OpenSpec changes

1. Use the installed OpenSpec proposal workflow and the original `openspec` CLI. Do not introduce a custom schema or artifact type.
2. Create one standard OpenSpec change per Delivery Slice. Each change contains the standard proposal, specs, design, and tasks artifacts required by the repository's configured schema.
3. Give every slice a stable ID in the form `<initiative-id>-sNN`; map it to exactly one unique OpenSpec change name. Keep blockers in the approved slice graph until publication creates native GitHub relationships.
4. Update at least one ordinary Product Spec or Engineering Spec through every change. Keep issues and implementation recipes out of the Spec Corpus.
5. Run `openspec validate <change-name>` for every slice and resolve all validation errors before approval.

## Obtain one approval

Render the complete Approval View from the canonical artifacts. Continue discovery if any normative decision is unresolved. Ask for explicit human approval of the entire Initiative once; absence of a clear approval authorizes nothing.

After approval, do not silently alter behavior, scope, acceptance criteria, constraints, slice boundaries, dependencies, or verification. Any such change requires a refreshed Approval View and another explicit approval.

## Publish the Initiative

1. Resolve the target repository's default branch and fetch its current tip:

   ```sh
   default_branch="$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name')"
   test -n "$default_branch"
   git fetch origin "$default_branch"
   ```

2. Before committing approved artifacts, require the Initiative branch to contain `origin/$default_branch`. Synchronize before committing; stop on conflicts or any required normative change.
3. Create one source commit containing every approved, validated OpenSpec change and record its hash as `sourceCommit`.
4. Push the source commit directly to the detected default branch:

   ```sh
   git push origin HEAD:"refs/heads/$default_branch"
   ```

   Never force the update, bypass repository protections, or push before all local validation passes. If the push is rejected because the branch advanced or disallows the update, stop with exact command evidence and do not fall back to a pull request.
5. Confirm the remote default branch points to `sourceCommit`. Do not publish issues until this confirmation succeeds.
6. Read the exact active Spec Changes from `sourceCommit`. Using the approved slice graph, bundled publication contract, and issue template, publish exactly one Agent-Ready Issue per Delivery Slice, including the stable marker, source commit, exact change name, `ready-for-agent` label, generated body, and every native `blocked by` edge.
7. If publication partially fails, rerun the same idempotent publication without duplicating existing issues. If publication still cannot complete, stop with command evidence; the Ralph runner has no authority to repair the projection.

## Stop

After the source commit and every Agent-Ready Issue are confirmed, report the default branch, source commit ID, and issue numbers and URLs, then stop. Do not start implementation or carry discovery context into execution. End with this instruction:

> Run `./ralph/afk-ralph.sh`.

Mention `./ralph/ralph-once.sh` only as an optional supervised or debugging path. Do not tell the user to open another agent session.
