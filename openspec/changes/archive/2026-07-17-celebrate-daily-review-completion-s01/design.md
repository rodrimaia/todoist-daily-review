## Context

The daily review route already transitions to a summary state when all reviewable tasks are processed or when the user stops the review. The summary card displays action statistics and a Done action that navigates home. The project has no automated UI test suite or lint script; available local automation is TypeScript plus the Vite production build, with browser verification required for visual behavior.

The application is a client-only React SPA using Tailwind semantic theme tokens and shadcn-style UI primitives. No `CONTEXT.md` or applicable ADR exists.

## Goals / Non-Goals

**Goals:**

- Make completion of a non-empty daily review feel celebratory and polished.
- Preserve the current summary statistics and Done action.
- Keep the celebration consistent with the existing visual system and both resolved appearances.
- Avoid new external assets, dependencies, services, storage, Todoist calls, or routing behavior.

**Non-Goals:**

- Celebrating weekly review completion.
- Changing review state-machine semantics, Todoist mutations, keyboard shortcuts, settings, or navigation contracts.
- Adding sound, browser notifications, persistence, analytics, or user-configurable celebration settings.
- Introducing broad UI test infrastructure, CI, dependencies, or a general visual redesign.

## Decisions

### Celebrate only meaningful daily review completion

Show the celebratory treatment when the daily review summary represents at least one reviewed item. Keep the empty-review summary simple so a user who had nothing to process does not receive misleading completion feedback.

**Alternative considered:** Celebrate every summary render. Rejected because `Nothing to review today` is a different outcome from finishing review work.

### Keep celebration presentation local to the summary surface

The celebration should be part of the existing summary experience, preserving the card's statistics and Done action while adding an expressive completion moment. This avoids changing review flow, global app shell behavior, or routing.

**Alternative considered:** Add a full-screen interstitial before the summary. Rejected because it would delay access to the action breakdown and Done navigation for a decorative moment.

### Use existing styling and icon dependencies

Use local markup, Tailwind utilities, semantic colors, existing animations, and current icon dependencies rather than external animation packages, image assets, or network-loaded effects.

**Alternative considered:** Add a confetti or animation library. Rejected because the requested outcome can be delivered with existing dependencies and because a dependency would increase bundle and maintenance cost for decorative behavior.

## Risks / Trade-offs

- Celebration could reduce readability -> Verify summary stats and Done action remain visible and readable in light and dark modes.
- Motion could feel excessive -> Keep the effect lightweight, short-lived, and non-blocking.
- Empty-review semantics could become confusing -> Preserve the existing `Nothing to review today` path without celebratory success copy.
- No automated browser suite exists -> Require manual browser checks for the summary states alongside typecheck and build.

## Migration Plan

1. Add the celebratory treatment to the daily review summary while preserving existing summary content and behavior.
2. Verify non-empty and empty daily summary states in both resolved appearances.
3. Roll back by reverting the slice; no persisted data or external contract changes are introduced.

## Open Questions

None.
