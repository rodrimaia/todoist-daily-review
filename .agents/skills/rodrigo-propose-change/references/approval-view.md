# Approval View

Render one temporary Approval View from canonical artifacts. It is not a saved source of truth.

Include, in this order:

1. **Intent and scope** — outcome, in-scope behavior, and explicit out-of-scope boundaries.
2. **Canonical spec diffs** — every Product Spec and Engineering Spec requirement added, modified, or removed, grouped by OpenSpec change.
3. **Delivery Slices** — stable ID, OpenSpec change name, independently deliverable outcome, and acceptance criteria for each slice.
4. **Dependency graph** — every `blockedBy` edge, including a clear statement when no edges exist.
5. **Verification Contract** — applicable local test, typecheck, lint, and build commands; public test seams; and justified non-automatable behavior.
6. **Risks and decisions** — relevant ADRs, material trade-offs, and risk mitigations.
7. **Unresolved decisions** — must say `None` before approval can be requested.

Ask one explicit question: “Do you approve this complete Initiative for direct publication to the repository's default branch, Agent-Ready Issue creation, autonomous implementation, verification, OpenSpec archive, one atomic Delivery Slice commit, and direct push?”

Only an unambiguous affirmative answer approves the Initiative. Approval authorizes the displayed contracts and slices; it does not authorize later normative drift or unrelated work.
