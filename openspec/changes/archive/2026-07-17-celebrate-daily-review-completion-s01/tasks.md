## 1. Daily Summary Celebration

- [x] 1.1 Add a celebratory completion treatment to the daily review summary for non-empty completed reviews while preserving the visible statistics and Done action.
- [x] 1.2 Preserve the existing empty-review summary message without presenting non-empty completed-work celebration copy or effects.
- [x] 1.3 Confirm existing daily review actions, summary counts, Done navigation, keyboard shortcuts, storage, routing, and Todoist mutation behavior are unchanged except for the celebration presentation.

## 2. Appearance And Scope Verification

- [x] 2.1 Verify the celebration surface is readable and visually consistent in both Light and Dark resolved appearances.
- [x] 2.2 Verify weekly review summary behavior remains unchanged.
- [x] 2.3 Avoid new dependencies, external assets, services, persistence, routes, settings, backend behavior, CI changes, or unrelated visual redesign.

## 3. Local Verification

- [x] 3.1 Run `bunx tsc --noEmit`.
- [x] 3.2 Run `bun run build`.
- [x] 3.3 Run `git diff --check` and inspect the diff for unrelated production, dependency, documentation, CI, deployment, or OpenSpec drift.
- [x] 3.4 Browser-check a non-empty daily review completion summary and the empty daily review summary in both resolved appearances, recording any credential-dependent limitation without exposing Todoist credentials.
