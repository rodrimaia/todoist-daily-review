## ADDED Requirements

### Requirement: Supported application URLs
The application SHALL expose `/`, `/review`, `/weekly-review`, and `/settings` as real client-side URLs and SHALL run the corresponding existing route behavior when any supported URL is loaded directly or reached through in-application navigation.

#### Scenario: Direct load of a supported URL
- **WHEN** a browser requests any supported application URL directly
- **THEN** the application shell loads and the client router resolves the route, including its existing token gate when applicable

#### Scenario: Client-side navigation
- **WHEN** a user follows an application link or action to another supported page
- **THEN** the browser URL updates to the destination and the corresponding page renders without requiring a document navigation to an application server

#### Scenario: Browser history navigation
- **WHEN** a user navigates among supported pages and then uses browser back or forward
- **THEN** the client router restores the page corresponding to the resulting URL

### Requirement: Browser-owned settings and credentials
The application SHALL keep the Todoist API token and review preferences in the browser's existing local storage keys and SHALL NOT introduce server-side credential or preference storage.

#### Scenario: Settings survive reload
- **WHEN** a user saves a token or review preferences and reloads the application in the same browser storage context
- **THEN** the application reads and presents the saved browser-local values

#### Scenario: Missing token protects review flows
- **WHEN** a browser without a stored Todoist token attempts to use a review flow
- **THEN** the application returns the user to the token-entry experience without sending credentials to an application server

### Requirement: Existing Todoist review behavior
The application SHALL preserve the existing daily review, weekly review, settings, Todoist read, and Todoist mutation behavior while executing Todoist access from browser code through the official `@doist/todoist-sdk`.

#### Scenario: Todoist-backed read
- **WHEN** a browser has a valid locally stored token and opens a page that displays Todoist data
- **THEN** the application obtains and presents that data through the browser-side Todoist SDK integration

#### Scenario: Existing review action
- **WHEN** a user performs an existing daily or weekly review action
- **THEN** the application preserves the current Todoist operation and review-state behavior
