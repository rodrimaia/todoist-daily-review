## Why

The application currently renders only a light appearance, which can be uncomfortable in low-light environments and ignores the user's operating-system theme. Users need a dark appearance with an explicit preference that remains predictable across visits.

## What Changes

- Add Light, Dark, and System appearance choices to Settings, with System as the default.
- Apply a selected appearance immediately across every supported route, including dialogs, popovers, form controls, review surfaces, and native browser controls.
- Persist the appearance preference in browser-local settings and restore it on later visits.
- Resolve System from the operating-system color-scheme preference and update the application when that preference changes.
- Apply the resolved appearance before the application first paints to avoid showing the wrong theme during startup.

## Capabilities

### New Capabilities

- `appearance-theme`: Product behavior and engineering properties for choosing, resolving, persisting, and rendering the application's appearance theme.

### Modified Capabilities

- `spa-navigation`: Extend browser-owned settings behavior to include the appearance preference while preserving the existing browser-only storage boundary.

## Impact

- The static document bootstrap and global semantic color tokens.
- Browser-local preferences and the application root's theme lifecycle.
- The Settings page and existing route/component surfaces that consume semantic colors.
- No backend, Todoist API, route, or production runtime contract changes.

## Out of Scope

- New routes, account synchronization, server-side preference storage, or per-device theme synchronization.
- A broader visual redesign, new typography, layout changes, or user-configurable color palettes.
- New general-purpose test infrastructure, CI changes, deployment, or unrelated accessibility remediation.
