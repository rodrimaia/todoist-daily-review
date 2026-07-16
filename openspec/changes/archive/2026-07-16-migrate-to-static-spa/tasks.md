## 1. Integration Baseline

- [x] 1.1 Start from the current `origin/master`, preserve the pointer-cursor rule in `src/styles/app.css`, and keep user-owned workflow artifacts intact.
- [x] 1.2 Confirm no application source uses a Bun API and record the existing browser storage keys, supported routes, query provider, and Todoist SDK boundary that the migration must preserve.

## 2. Client-Only Application

- [x] 2.1 Add the static HTML and browser bootstrap needed to mount the React application with its document metadata, body classes, TanStack Query provider, and router.
- [x] 2.2 Replace file-generated routing with one typed manual route tree for `/`, `/review`, `/weekly-review`, and `/settings`, retaining eager route components and current navigation behavior.
- [x] 2.3 Remove TanStack Start document helpers, `ssr` declarations, the generated route tree, and obsolete generated-route ignore/configuration entries.
- [x] 2.4 Reduce the Vite configuration and package scripts to the client build, remove the approved dead dependencies, and regenerate `bun.lock` intentionally while retaining the confirmed client/UI stack.

## 3. Static Production Runtime

- [x] 3.1 Add an Nginx configuration that listens on port 3000, serves built files with correct MIME types, provides SPA history fallback, and never returns the HTML fallback for a missing static asset.
- [x] 3.2 Replace the Bun/Nitro runtime stage with `nginx:alpine` and copy the Vite `dist/` artifact into the runtime image without changing the external port contract.

## 4. Verification and Scope Control

- [x] 4.1 Run the frozen install, `bunx tsc --noEmit`, and production build; confirm `dist/index.html` and referenced assets exist with no required server output.
- [x] 4.2 Build and run the container, verify all four direct route requests, verify every referenced JavaScript/CSS asset returns HTTP 200 with the correct MIME type, and verify a missing asset returns a non-HTML failure.
- [x] 4.3 Exercise settings/token persistence in a browser and, when credentials already exist locally, one Todoist-backed read without exposing or copying the token; otherwise record that credential-dependent limitation.
- [x] 4.4 Run `git diff --check` and review the complete diff against `origin/master` to confirm the cursor fix remains and no README, ADR, `CONTEXT.md`, CI smoke test, deployment, or unrelated change is included.
