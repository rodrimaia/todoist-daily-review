# Recurring-Only Daily Review Skip

## Goal

Require an action on every non-recurring task during Daily Review by removing the ability to skip it. Recurring tasks remain skippable so the user can leave an occurrence unchanged without completing it.

## Scope

This behavior applies to both Daily Review phases:

- Inbox task processing
- Filter task review

Weekly Review behavior is unchanged.

## Design

`ReviewPage` determines whether the current task is recurring from `currentTask.due?.isRecurring`. It passes that state to both Daily Review action bars.

`InboxActionBar` gains the same recurrence input already accepted by `FilterActionBar`. Each action bar renders Skip only for a recurring task. The `s` keyboard shortcut uses the same condition and does nothing when the current task is non-recurring.

Stop remains available for ending the review. Existing scheduling, moving, completing, deleting, progress, summary, and Todoist mutation behavior remains unchanged.

The review reducer and Skip statistics remain unchanged because recurring tasks can still produce valid Skip actions.

The README keyboard-shortcut description is updated to state that `s` skips recurring Daily Review tasks only.

## Behavior

### Non-recurring task

- The Skip button is not rendered.
- Pressing `s` does nothing.
- The current task remains active until the user takes another available action or stops the review.

### Recurring task

- The Skip button is rendered in both Inbox and Filter phases.
- Pressing `s` skips the task.
- The existing skipped count and review progression behavior are preserved.

## Error Handling

No new API operation or asynchronous path is introduced. The recurrence check treats a missing due date or a due date not marked as recurring as non-recurring, so Skip is unavailable by default.

## Verification

Browser-check the following Daily Review cases:

1. A non-recurring Inbox task has no Skip button and ignores `s`.
2. A recurring Inbox task has a working Skip button and `s` shortcut.
3. A non-recurring Filter task has no Skip button and ignores `s`.
4. A recurring Filter task has a working Skip button and `s` shortcut.
5. Stop remains available for all four cases.
6. Valid recurring skips still appear in summary statistics.

Run the production build to verify TypeScript compilation and bundling. The repository currently has no automated test suite.
