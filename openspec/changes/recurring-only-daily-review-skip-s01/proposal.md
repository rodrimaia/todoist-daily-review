## Why

Daily Review currently lets users skip any task, allowing non-recurring work to pass through the review without a decision. Skip should remain available only for recurring tasks, where leaving the current occurrence unchanged is a valid review outcome.

## What Changes

- Hide the Daily Review Skip action for non-recurring tasks in both Inbox and Filter phases.
- Make the `s` shortcut a no-op for non-recurring Daily Review tasks.
- Preserve Skip, review progression, and skipped statistics for recurring tasks.
- Keep Stop available for all tasks and preserve all other review actions and Weekly Review behavior.
- Treat a missing due date or recurrence flag as non-recurring.

## Capabilities

### New Capabilities

- `daily-review-task-actions`: Defines which task actions are available during the Inbox and Filter phases of Daily Review, including recurrence-based Skip behavior.

### Modified Capabilities

None.

## Impact

- Daily Review action availability and keyboard handling.
- Daily Review Inbox and Filter action presentation.
- User-facing keyboard shortcut documentation.
- No Todoist API, persistence, dependency, routing, review reducer, summary calculation, or Weekly Review changes.
