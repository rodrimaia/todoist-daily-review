# Review Domain

This context describes the language used to process Todoist tasks through guided review sessions.

## Language

**Daily Review**:
A guided session that processes Inbox tasks followed by tasks selected by the configured filter.

**Task decision**:
The outcome chosen for the current task before advancing to the next task.
_Avoid_: Action

**Skip**:
A task decision that leaves the current task unchanged and advances to the next task.

**Stop**:
A session command that ends the Daily Review without making a task decision for the current task.
_Avoid_: Skip

**Recurring task**:
A task whose Todoist due data explicitly identifies it as recurring.
