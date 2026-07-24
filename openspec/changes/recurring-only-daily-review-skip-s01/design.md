## Context

Daily Review processes tasks through Inbox and Filter phases. Both phases currently present Skip, and the route-level `s` shortcut advances the current task without considering recurrence. Filter actions already receive the Todoist recurrence flag to control scheduling choices; Inbox actions do not.

Todoist tasks expose recurrence through the optional `due.isRecurring` value. The application is a client-only React SPA, and this change introduces no API operation, asynchronous path, persisted data, or reducer transition. The repository has no automated test suite or lint command, so local verification must combine type checking, the production build, and authenticated browser checks.

No `CONTEXT.md` or applicable ADR exists.

## Goals / Non-Goals

**Goals:**

- Require a non-Skip decision for non-recurring tasks in both Daily Review phases.
- Preserve Skip for recurring tasks without changing progression or summary accounting.
- Apply one recurrence rule consistently to visible controls and keyboard input.
- Default safely when recurrence information is absent.
- Keep the user-facing shortcut documentation accurate.

**Non-Goals:**

- Changing Weekly Review.
- Changing Todoist mutations, review state transitions, summary calculations, or storage.
- Removing Stop or changing scheduling, moving, completing, or deleting behavior.
- Adding dependencies, API calls, routes, settings, or a test framework.

## Decisions

### Use Todoist recurrence metadata as the sole eligibility signal

A task is eligible for Skip only when its current Todoist due data explicitly marks it recurring. A missing due date or missing recurrence flag is treated as non-recurring.

**Alternative considered:** Infer recurrence from due-date text. Rejected because the SDK already supplies the authoritative boolean and text parsing would be less reliable.

### Enforce the rule at every user interaction surface

Both action bars conditionally present Skip from the current task's recurrence state, and route-level keyboard handling applies the same condition. This keeps visual affordance and keyboard behavior aligned in both phases.

**Alternative considered:** Hide the buttons while leaving the shortcut active. Rejected because hidden functionality would violate the requirement and create an inconsistent interaction contract.

### Preserve existing valid Skip transitions

The review state machine and summary counters remain unchanged. Recurring tasks still use the existing Skip transition, while non-recurring tasks cannot initiate it through Daily Review controls.

**Alternative considered:** Remove Skip from the reducer and statistics. Rejected because recurring tasks still need the existing behavior.

### Deliver both phases as one vertical slice

Inbox and Filter enforcement, shortcut handling, and documentation ship together. Splitting them would leave Daily Review with inconsistent rules between phases or between pointer and keyboard interaction.

## Risks / Trade-offs

- Recurrence metadata could be absent for a task that is conceptually recurring -> Default to non-recurring so the review cannot silently bypass work; users retain Stop and other valid actions.
- UI and keyboard conditions could diverge -> Derive both from the same current-task recurrence value and browser-check every phase/recurrence combination.
- No automated interaction suite exists -> Run TypeScript and production-build checks, then verify behavior in the authenticated browser session without introducing test infrastructure solely for this change.
- Existing Skip handlers remain callable inside the application -> Keep the change scoped to the currently exposed Daily Review interaction paths; no external or persisted Skip API exists.

## Migration Plan

1. Apply recurrence-based Skip availability to both Daily Review phases and keyboard input.
2. Update the shortcut documentation.
3. Run local static and build verification, then browser-check all phase and recurrence combinations.
4. Roll back by reverting the slice; there is no persisted-data or external-service migration.

## Open Questions

None.
