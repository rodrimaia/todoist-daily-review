# Review Domain

This context describes the language used to process Todoist tasks through guided review sessions.

## Language

**Daily Review**:
A guided session that processes Inbox tasks followed by tasks selected by the configured filter.

**Review day**:
The calendar day in the Todoist account timezone used to resolve relative scheduling choices.
_Avoid_: Browser day, local day

**Task decision**:
The outcome chosen for the current task before advancing to the next task.
_Avoid_: Action

**Skip**:
A task decision that leaves the current recurring task unchanged and advances to the next task. Non-recurring tasks are not eligible.

**Keep date**:
A task decision that preserves the task's existing Todoist due data while the task leaves the Inbox.
_Avoid_: No date, leave on the current date

**Remove date**:
A task decision that removes the task's existing Todoist due data.
_Avoid_: No date

**No date**:
A scheduling choice that leaves an undated task without Todoist due data when it leaves the Inbox.
_Avoid_: Remove date

**Stop**:
A session command that ends the Daily Review without making a task decision for the current task.
_Avoid_: Skip

**Recurring task**:
A task whose Todoist due data explicitly identifies it as recurring. A review must not reschedule it or remove its date; completing it is what advances the recurrence.
