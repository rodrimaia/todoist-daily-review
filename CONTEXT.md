# Review Domain

This context describes the language used to process Todoist tasks through guided review sessions.

## Language

**Daily Review**:
A guided session that processes Inbox tasks followed by tasks selected by the configured filter.

**Weekly Review**:
A guided session that processes every weekly review phase. Stopping early does not complete the Weekly Review.

**Hosted instance**:
The public deployment operated by the project maintainer. It serves the application but does not store Todoist account data or API tokens.
_Avoid_: User-hosted instance, Todoist server

**Self-hosted instance**:
A deployment operated by a user from the public container image or source code. Its operator, rather than the project maintainer, controls the hosting infrastructure.
_Avoid_: Hosted instance, local installation

**Temporary token session**:
A browser-tab session in which the Todoist API token survives reloads in session storage but is discarded when the tab is closed. It does not affect persisted review preferences.
_Avoid_: Saved token, persistent login

**Telemetry consent**:
The visitor's explicit choice to allow aggregate pageview measurement for the Hosted instance's fixed routes. Refusal prevents analytics code from loading and sends no telemetry requests; task data, custom usage events, and Self-hosted instances are excluded.
_Avoid_: Implied consent, necessary data

**Review tracking task**:
A configured task, accessible in the current Todoist account, that is open, recurring, and has due data. It records completion of a Weekly Review, does not participate in that review, and a completed review never advances a future occurrence.
_Avoid_: Weekly review task, reminder task

**Eligible tracking occurrence**:
An open occurrence of the Review tracking task due on or before the Review day. An undated or future occurrence is not eligible.
_Avoid_: Pending tracking task

**Review day**:
The calendar day in the Todoist account timezone used to resolve relative scheduling choices.
_Avoid_: Browser day, local day

**Task decision**:
The outcome chosen for the current task before advancing to the next task.
_Avoid_: Action

**Task title**:
The primary text that identifies a Todoist task during a review.
_Avoid_: Task content

**Task description**:
Optional supporting text that adds detail beneath the Task title.
_Avoid_: Task body

**Delete**:
A task decision that permanently removes the current non-recurring task from Todoist. Recurring tasks are not eligible during a Daily Review.

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
