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

Validate the manifest against `assets/workflow/initiatives/initiative.schema.json`; use `assets/workflow/initiatives/example.yaml` only as a structural example.

## Discover

1. Inspect `AGENTS.md`, `openspec/config.yaml`, `openspec/specs/`, relevant code and tests, `CONTEXT.md`, and applicable ADRs. Resolve repository facts directly instead of asking the user.
2. Maintain a private list of unresolved normative decisions. Ask exactly one focused question at a time only when evidence cannot decide it. Include a recommended answer and its trade-off.
3. Adapt the interview depth to the change. Continue until intended spec deltas, acceptance criteria, Engineering constraints, scope boundaries, the Verification Contract, Delivery Slices, dependencies, and risks are explicit.
4. Do not treat implementation preferences or discoverable repository facts as user decisions.

## Author standard OpenSpec changes

1. Use the installed OpenSpec proposal workflow and the original `openspec` CLI. Do not introduce a custom schema or artifact type.
2. Create one standard OpenSpec change per Delivery Slice. Each change contains the standard proposal, specs, design, and tasks artifacts required by the repository's configured schema.
3. Give every slice a stable ID in the form `<initiative-id>-sNN`; map it to exactly one unique OpenSpec change name. Record blockers only in the Initiative Manifest, outside OpenSpec's schema.
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

2. Before committing approved artifacts, require the Initiative branch to contain `origin/$default_branch`. Synchronize without rewriting an approved artifact commit; stop on conflicts or any required normative change.
3. Commit the approved, validated OpenSpec changes on the Initiative branch and record that exact artifact commit as `sourceCommit`.
4. Create `workflow/initiatives/<initiative-id>.yaml` from the bundled schema. Include each stable slice ID, its exact OpenSpec change name, and its blocking slice IDs. Do not place this metadata under `openspec/`.
5. Validate the manifest, commit it separately, and push the Initiative commits directly to the detected default branch:

   ```sh
   git push origin HEAD:"refs/heads/$default_branch"
   ```

   Never force the update, bypass repository protections, or push before all local validation passes. If the push is rejected because the branch advanced or disallows the update, stop with exact command evidence and do not fall back to a pull request.
6. Fetch the default branch again and confirm both `sourceCommit` and the manifest commit are ancestors of `origin/$default_branch`. Do not publish issues until this confirmation succeeds.
7. Read the newly published Initiative and its exact active Spec Changes from `origin/$default_branch`. Using the bundled publication contract and issue template, publish exactly one Agent-Ready Issue per Delivery Slice, including the stable marker, `ready-for-agent` label, generated body, and every `blocked by` edge.
8. Require one complete publication pass with exact issue bodies and dependency links. If publication partially fails, rerun the same idempotent publication without duplicating existing issues. If a complete pass still cannot succeed, stop with command evidence; the Ralph runner has no authority to repair the projection.

## Stop

After the Initiative commits and every Agent-Ready Issue are confirmed, report the default branch, published commit IDs, and issue numbers and URLs, then stop. Do not start implementation or carry discovery context into execution. End with this instruction:

> Run `./ralph/afk-ralph.sh`.

Mention `./ralph/ralph-once.sh` only as an optional supervised or debugging path. Do not tell the user to open another agent session.
