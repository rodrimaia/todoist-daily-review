## ADDED Requirements

### Requirement: Recurrence-based Daily Review Skip
The application SHALL make Skip available during Daily Review only when the current task is explicitly marked as recurring by its Todoist due data, in both Inbox and Filter phases.

#### Scenario: Recurring Inbox task can be skipped
- **WHEN** the current Inbox-phase task has due data marked as recurring
- **THEN** the application presents Skip, and activating Skip or pressing `s` advances the review through the existing Skip behavior

#### Scenario: Recurring Filter task can be skipped
- **WHEN** the current Filter-phase task has due data marked as recurring
- **THEN** the application presents Skip, and activating Skip or pressing `s` advances the review through the existing Skip behavior

#### Scenario: Non-recurring Inbox task cannot be skipped
- **WHEN** the current Inbox-phase task is not explicitly marked as recurring
- **THEN** the application does not present Skip, pressing `s` does not advance the review, and the current task remains active

#### Scenario: Non-recurring Filter task cannot be skipped
- **WHEN** the current Filter-phase task is not explicitly marked as recurring
- **THEN** the application does not present Skip, pressing `s` does not advance the review, and the current task remains active

#### Scenario: Missing recurrence data defaults to non-recurring
- **WHEN** the current Daily Review task has no due data or its due data has no recurrence flag
- **THEN** the application treats the task as non-recurring for Skip availability

### Requirement: Preserved Daily Review behavior
The recurrence-based Skip rule SHALL preserve valid recurring Skip progression and skipped statistics, SHALL keep Stop available for every Daily Review task, and SHALL NOT change other Daily Review actions or Weekly Review behavior.

#### Scenario: Recurring Skip uses existing accounting
- **WHEN** a user skips a recurring task in either Daily Review phase
- **THEN** review progression and skipped summary statistics are updated through the existing Skip behavior

#### Scenario: Stop remains universally available
- **WHEN** any recurring or non-recurring task is active in either Daily Review phase
- **THEN** Stop remains available and can end the review through the existing behavior

#### Scenario: Other review behavior is unchanged
- **WHEN** the recurrence-based Skip rule is applied
- **THEN** scheduling, moving, completing, deleting, progress, summary behavior, Todoist mutations, and Weekly Review behavior remain unchanged
