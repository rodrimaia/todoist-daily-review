# Idempotent issue publication

Read the exact active OpenSpec changes from the remotely confirmed source commit. Render `assets/templates/agent-ready-issue.md` deterministically from those canonical files and the approved slice graph. Each issue must identify its Initiative, source commit, and exact OpenSpec change. Use this exact identity marker:

`<!-- ai-workflow:slice-id: <stable-slice-id> -->`

Search open and closed issues through `gh issue list --state all --search '"<marker>" in:body' --json number,state,body,labels`. Zero matches means create exactly one issue with `gh issue create --label ready-for-agent --body-file <rendered-file>`. One match means update its generated projection when needed. More than one match is ambiguous generated state: stop publication rather than choosing or creating another issue.

For an existing projection:

- render the canonical body and replace any different body with `gh issue edit <number> --body-file <rendered-file>`;
- preserve open/closed state, `ready-for-agent` versus `blocked`, comments, assignees, and other mutable execution state;
- do not copy manual body edits elsewhere; normative edits require Spec Drift;
- ensure `ready-for-agent` and `blocked` exist with `gh label create <label> --force`, but introduce no triage, review, or active-work labels.

After every slice has exactly one issue number, compare its native GitHub `blockedBy` issue numbers with the approved slice graph. Use `gh issue edit <number> --add-blocked-by <number>` for missing edges and `--remove-blocked-by <number>` for stale generated edges. Require agreement between the native GitHub relationships and generated `Blocked By` section.

Rerunning publication with unchanged canonical artifacts must create no issue and perform no edit. Complete every slice before the proposal workflow hands execution to Ralph. Rerun the idempotent publication only after a partial failure. If any issue, body, label, or native GitHub dependency edge remains missing or ambiguous, stop with command evidence; the Ralph runner has no authority to repair it.
