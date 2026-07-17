## Context

The application is a client-only React SPA with four routes and no backend. The Todoist token and review preferences are stored in one browser-local preferences boundary, and the Settings page is the existing place for user configuration. Styling already uses shadcn/Tailwind semantic color tokens and declares a class-based dark variant, but only light token values exist. The static document also applies hard-coded light body colors, and no runtime resolves or persists an appearance.

The repository has no automated test suite or lint script. Its available local checks are TypeScript and the production Vite build, with browser verification required for route behavior and visual appearance. No `CONTEXT.md` or applicable ADR exists.

## Current and Desired Behavior

**Current:** Every visit renders the light palette regardless of operating-system preference. Settings has no appearance control, and the browser storage model has no theme field.

**Desired:** Settings offers System, Light, and Dark. The choice applies immediately, survives reload, and covers every application surface. System follows the operating system, including live preference changes. The resolved appearance is established before first paint and communicated to compatible native controls.

## Goals / Non-Goals

**Goals:**

- Provide one browser-local appearance preference with System as the backward-compatible default.
- Render complete light and dark appearances through the existing semantic styling system.
- Keep explicit choices stable and keep System synchronized with operating-system changes.
- Prevent a direct load from visibly flashing the opposite appearance.
- Preserve all Todoist, review, navigation, and storage behavior unrelated to appearance.

**Non-Goals:**

- Account synchronization, server storage, or cross-browser preference synchronization.
- A broader visual redesign, new route, typography or layout changes, or custom color palettes.
- General accessibility remediation outside surfaces affected by the theme.
- New test infrastructure, CI changes, deployment, or unrelated documentation changes.

## Decisions

### Store the preference with existing review preferences

Extend the existing browser preference object with a constrained `system | light | dark` value. Existing stored objects remain valid because preference reads already merge saved values over defaults; missing or invalid appearance values resolve to System without discarding other settings.

**Alternative considered:** Add a separate local-storage key. Rejected because appearance is another browser-owned user preference and splitting the persistence boundary would add coordination without a product benefit.

### Resolve one document-level theme state

Represent the resolved appearance on the document root using the existing class-based dark variant and set the root `color-scheme` consistently. A single application-level lifecycle owns System media-query observation and applies changes, allowing route content and portalled overlays to inherit the same semantic theme.

**Alternative considered:** Add dark classes independently to route components. Rejected because it can leave portalled overlays or later routes inconsistent and duplicates state across the application.

### Use semantic palettes rather than route-specific colors

Complete the dark semantic token palette and remove light-only shell styling so existing cards, inputs, buttons, dialogs, popovers, and progress components inherit the resolved appearance. Audit the small number of direct status colors in context and adjust only where the dark background makes their meaning or readability unclear.

**Alternative considered:** Duplicate component styles for dark mode. Rejected because the current design system already exposes the intended semantic seam and component-specific duplication would increase drift.

### Resolve appearance before the application module paints

Use a minimal document bootstrap to read the existing preference object, resolve System through `prefers-color-scheme`, and expose the resolved state before React renders. The runtime theme lifecycle then takes ownership without changing the resolved result. The bootstrap must tolerate missing, legacy, or malformed browser storage and must not access or expose the Todoist token.

**Alternative considered:** Apply the theme only after React mounts. Rejected because direct loads can visibly flash the light shell before the saved dark appearance is restored.

### Make appearance selection independent of the existing Save action

The appearance control applies and persists each choice immediately. Existing review settings continue to use their current Save flow, preventing an appearance choice from accidentally committing unrelated in-progress settings edits.

**Alternative considered:** Save appearance only with the existing settings form. Rejected because the user cannot reliably preview the chosen appearance and could persist unrelated form state merely to switch themes.

## Acceptance Criteria

- Settings presents System, Light, and Dark, shows the saved choice, and defaults missing, legacy, or invalid appearance values to System without losing existing preferences.
- Selecting any appearance applies it immediately and restores it after reload and direct navigation to each supported route.
- System resolves from `prefers-color-scheme` and updates live when that media query changes; Light and Dark ignore later operating-system changes.
- `/`, `/review`, `/weekly-review`, and `/settings`, plus available dialogs, popovers, form controls, progress indicators, and status states, render consistently in both resolved appearances with readable content and distinguishable states.
- A direct load with Dark saved, or System resolving dark, shows no visible light-theme frame and exposes a matching browser color scheme.
- Existing token, review preference, navigation, daily review, weekly review, and Todoist behavior remains unchanged.

## Verification Contract

- Typecheck: `bunx tsc --noEmit`.
- Build: `bun run build` and confirm the static `dist/index.html` and browser assets are emitted successfully.
- Repository hygiene: `git diff --check` and inspect the implementation diff to exclude unrelated behavior, dependencies, CI, deployment, and visual redesign.
- Browser preference matrix: with a browser's light and dark operating-system preferences, exercise System, Light, and Dark; confirm immediate application, persisted selection after reload, and live System updates without reload while explicit choices remain stable.
- Browser route matrix: directly load `/`, `/review`, `/weekly-review`, and `/settings` in both resolved appearances. Exercise available cards, buttons, inputs, select controls, dialogs, popovers, progress/status states, loading/empty states, and summary surfaces without printing or relocating Todoist credentials.
- Startup seam: throttle or pause application-module loading and confirm a saved Dark preference and System resolving dark establish the dark document state and matching `color-scheme` before the first application frame; repeat for light.
- Storage compatibility seam: verify missing, legacy, and malformed appearance data resolves to System while valid existing review preferences remain intact.
- Automated tests/lint: none exist, and this slice does not add broad test or lint tooling. The browser checks above are the justified verification for appearance and first-paint behavior.

## Discovery Cues

- `index.html`, `src/main.tsx`, and `src/routes/__root.tsx` establish the document bootstrap and application-wide lifecycle.
- `src/styles/app.css` defines semantic color tokens and the existing class-based dark variant; `index.html` currently carries light-only body classes.
- `src/lib/storage.ts` owns the browser-local preference shape, defaults, and compatibility merge.
- `src/routes/settings.tsx` owns the current settings UI and save flow.
- `src/components/ui/` and the route-level review components expose portalled overlays, controls, progress/status colors, and other surfaces to audit in both appearances.

## Risks / Trade-offs

- **Theme flash during startup** -> Resolve the stored preference in the static document before the application module renders and verify under delayed module loading.
- **System listeners become stale or duplicated** -> Keep media-query observation in one application-level lifecycle and remove it when the lifecycle changes or unmounts.
- **Legacy or malformed storage breaks startup** -> Treat absent or invalid appearance data as System while preserving independently valid review settings.
- **Semantic tokens miss direct color utilities** -> Audit every supported route and overlay in both appearances, adjusting only affected status colors.
- **Native controls disagree with the page** -> Keep the document `color-scheme` synchronized with the resolved appearance.
- **No automated browser suite exists** -> Require the explicit preference, route, startup, and storage compatibility matrices before delivery.

## Migration Plan

1. Extend the existing browser preference model with the defaulted appearance choice.
2. Establish first-paint resolution and the application-level runtime lifecycle.
3. Add the dark semantic palette and remove light-only shell styling, then add the immediate Settings choice.
4. Run the complete Verification Contract and deliver all parts in one atomic slice so no default-branch commit contains a control without a working theme or a palette without a selection contract.
5. Roll back by reverting the slice; existing preference data remains browser-local and older code ignores the additional field.

## Stop Conditions

- Stop for Spec Drift if implementation requires a backend, account-scoped preference, new route, new general-purpose test framework, or behavior outside the displayed theme contract.
- Stop for approval if complete dark rendering requires a broader product redesign or changes to established status meanings.
- Record any browser or credential limitation without soliciting, printing, copying, or relocating a Todoist token.

## Open Questions

None.
