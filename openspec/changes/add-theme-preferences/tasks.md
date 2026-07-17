## 1. Preference And Startup State

- [ ] 1.1 Extend browser-local review preferences with validated `system`, `light`, and `dark` appearance values, using System for missing, legacy, or invalid data without losing existing settings.
- [ ] 1.2 Resolve and expose the stored appearance and matching browser `color-scheme` before the first visible application frame, including safe fallback for malformed storage.
- [ ] 1.3 Add one application-level appearance lifecycle that applies explicit choices, observes operating-system changes only for System, and cleans up observation correctly.

## 2. Themed User Experience

- [ ] 2.1 Define the dark semantic token palette and remove light-only document-shell styling so page and portalled component surfaces inherit one resolved appearance.
- [ ] 2.2 Add an immediately applied and persisted System, Light, and Dark control to Settings without changing how unrelated review settings are saved.
- [ ] 2.3 Audit all supported routes, overlays, form controls, progress indicators, and status colors in both appearances and correct only theme-specific readability or consistency gaps.

## 3. Verification And Scope Control

- [ ] 3.1 Run `bunx tsc --noEmit`, `bun run build`, and `git diff --check`; inspect the diff for unrelated dependencies, CI, deployment, or visual redesign.
- [ ] 3.2 Execute the browser preference matrix for all three choices under light and dark operating-system settings, including immediate changes, reload persistence, live System updates, explicit-choice stability, legacy/malformed storage, and first-paint behavior under delayed module loading.
- [ ] 3.3 Directly load every supported route and exercise available controls, overlays, loading/empty states, review surfaces, and summaries in both resolved appearances, recording any credential-dependent limitation without exposing Todoist credentials.
