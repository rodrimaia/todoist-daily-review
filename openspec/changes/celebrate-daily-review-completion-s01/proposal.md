## Why

The daily review currently ends with useful stats but no rewarding completion moment. A lightweight celebration can make finishing the review feel intentional and satisfying without changing Todoist data behavior.

## What Changes

- Add a celebratory completion treatment to the daily review summary after the review reaches its summary state.
- Keep the existing action statistics and Done navigation available and readable.
- Preserve the existing empty-review summary path, Todoist mutations, keyboard shortcuts, settings, and weekly review behavior.
- Respect the existing light and dark appearance contract and avoid adding external assets or runtime services.

## Capabilities

### New Capabilities

- `daily-review-completion`: Product behavior for the daily review completion summary and its celebratory feedback.

### Modified Capabilities

- `appearance-theme`: Extend complete themed appearance coverage to include the daily review completion celebration.

## Impact

- Daily review summary UI and styling.
- Existing themed visual surfaces for light and dark modes.
- Local verification through TypeScript, production build, repository hygiene, and browser checks.
- No Todoist API, persistence, routing, dependency, backend, container, weekly review, or settings contract changes.
