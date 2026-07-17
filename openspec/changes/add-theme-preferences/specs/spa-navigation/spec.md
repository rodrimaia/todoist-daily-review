## MODIFIED Requirements

### Requirement: Browser-owned settings and credentials
The application SHALL keep the Todoist API token, review preferences, and appearance preference in the browser's existing local storage keys, SHALL preserve existing stored review settings that predate the appearance preference, and SHALL NOT introduce server-side credential or preference storage.

#### Scenario: Settings survive reload
- **WHEN** a user saves a token, review preferences, or appearance preference and reloads the application in the same browser storage context
- **THEN** the application reads and presents the saved browser-local values

#### Scenario: Existing settings gain the default appearance
- **WHEN** stored review preferences contain no valid appearance preference
- **THEN** the application preserves the existing review preferences and uses System as the appearance preference

#### Scenario: Missing token protects review flows
- **WHEN** a browser without a stored Todoist token attempts to use a review flow
- **THEN** the application returns the user to the token-entry experience without sending credentials or preferences to an application server
