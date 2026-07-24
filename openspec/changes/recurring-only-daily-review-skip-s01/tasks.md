## 1. Recurrence-Based Skip

- [x] 1.1 Make both Daily Review action surfaces present Skip only when the current Todoist task is explicitly recurring, defaulting missing recurrence data to non-recurring.
- [x] 1.2 Apply the same recurrence rule to the Daily Review `s` shortcut so non-recurring tasks remain active while recurring tasks retain existing Skip progression and accounting.
- [ ] 1.3 Confirm Stop and all non-Skip Daily Review actions remain available under their existing conditions and Weekly Review is unchanged.

## 2. Documentation

- [ ] 2.1 Update the user-facing keyboard shortcut documentation to identify `s` as recurring-task-only during Daily Review.

## 3. Verification

- [ ] 3.1 Run `bunx tsc --noEmit`.
- [ ] 3.2 Run `bun run build`.
- [ ] 3.3 Run `git diff --check` and inspect the implementation diff for unrelated production, dependency, workflow, or OpenSpec changes.
- [ ] 3.4 In an authenticated browser session, verify non-recurring Inbox and Filter tasks have no Skip control and ignore `s`, while Stop and the current task remain available.
- [ ] 3.5 In an authenticated browser session, verify recurring Inbox and Filter tasks expose working pointer and `s` Skip actions, advance through existing review behavior, and increment skipped summary statistics.
- [ ] 3.6 Browser-check that scheduling, moving, completing, deleting, progress, summary behavior, and Weekly Review remain unchanged where applicable; record any credential- or data-dependent limitation without exposing Todoist credentials.
