## Context

The application already behaves as a browser-only React product: all four route modules disable SSR, settings and the Todoist token live in `localStorage`, and Todoist requests originate from browser query and mutation hooks. Production nevertheless uses TanStack Start, Nitro, a generated file-route tree, and a Bun server image to serve the built application. Nitro was restored in commit `8edd031` as a temporary repair after raw server output failed to serve assets; that working state must be replaced deliberately rather than removed piecemeal.

`origin/master` is one commit ahead of the workspace at proposal time and includes the button pointer-cursor fix in `src/styles/app.css`. Implementation must begin from the current integration branch and retain that unrelated fix. The repository has no automated tests, lint script, pull-request workflow, ADR, or `CONTEXT.md`; the only GitHub workflow builds and publishes the container after a push to `master`.

## Current and Desired Behavior

**Current:** Vite invokes TanStack Start and Nitro, routes are generated from `createFileRoute` declarations, the build emits `.output`, and a Bun/Nitro process serves the application on container port 3000.

**Desired:** Vite emits a browser-only `dist/`, React mounts from a browser entry, TanStack Router uses an explicit route tree, and Nginx serves the artifact on container port 3000 with safe SPA history fallback. User-visible review, settings, navigation, storage, and Todoist behavior remain unchanged.

## Goals / Non-Goals

**Goals:**

- Match the production architecture to the existing client-only security and data boundary.
- Preserve the four current URLs, direct deep links, browser history navigation, root query provider, browser-local settings, and browser-side Todoist SDK behavior.
- Keep React, Vite, TanStack Router, TanStack Query, the official Todoist SDK, Tailwind, and the existing UI dependencies.
- Produce a reproducible static build and a small Nginx runtime image that remains compatible with the existing port-3000 container contract.
- Remove dead full-stack runtime, generated-routing, and Bun-typing dependencies.

**Non-Goals:**

- Product workflow or route redesign; a backend; server-side OAuth; server functions; loaders; API routes; server storage; a database; or SSR.
- Replacing the retained framework, data, SDK, styling, or component dependencies.
- Route-level lazy loading, a new CI or automated Docker smoke test, broad new testing infrastructure, deployment, or operational changes outside this image.
- README, ADR, or `CONTEXT.md` changes. The README's runtime wording may remain stale by explicit product-owner decision.

## Decisions

### Use a conventional Vite browser entry

The application will use Vite's React and Tailwind plugins, an HTML entry document, and a React DOM client mount. Document metadata and body classes belong to the static document and client layout rather than TanStack Start head/script helpers.

**Alternative considered:** Keep TanStack Start with SSR disabled. Rejected because it retains server-oriented build and deployment machinery without a server requirement.

### Use one eagerly loaded manual TanStack Router tree

The supported routes will be declared explicitly beneath a client root route. Page components remain eagerly imported and the generated route tree is removed together with its ignore rule.

**Alternative considered:** Keep file-based route generation or add manual lazy imports. Rejected because four stable routes do not justify generation, and eager loading is the confirmed behavior and keeps the migration small.

### Preserve the browser data boundary

The root continues to provide one TanStack Query client. Tokens and preferences remain in browser `localStorage`, and Todoist reads and mutations continue through the official `@doist/todoist-sdk` in browser code. No application endpoint proxies or stores credentials.

**Alternative considered:** Replace the SDK with handwritten fetch calls. Rejected because the SDK supplies retry, timeout, validation, error, idempotency, filter, pagination, and case-conversion behavior already relied upon by the product.

### Serve `dist/` from Nginx on container port 3000

The runtime image will be based on `nginx:alpine`, listen on port 3000 to preserve the existing Docker and proxy contract, and serve the Vite output directly. Supported route requests fall back to `index.html`; asset requests must resolve to a real file or fail rather than receiving the HTML fallback. Nginx supplies the correct MIME type for JavaScript and CSS.

**Alternative considered:** Use Nginx's default port 80. Rejected because it would create an unnecessary downstream port-contract change. A Bun or `vite preview` production server is also rejected because neither is needed to serve immutable static output.

### Remove only architecture-specific dead dependencies

`@tanstack/react-start`, `nitro`, `vinxi`, and `@types/bun` will be removed and `bun.lock` regenerated intentionally. Bun remains an allowed install/build tool in the Docker build stage; it is not part of the production runtime. All confirmed client and UI dependencies remain.

**Alternative considered:** Broader dependency modernization. Rejected as unrelated scope that would increase migration risk.

## Acceptance Criteria

- A frozen install, TypeScript check, and production Vite build succeed from the updated lockfile.
- The build emits `dist/index.html` and browser assets without a server bundle or generated route tree.
- The package graph has no direct TanStack Start, Nitro, Vinxi, or Bun-type dependency, and no application source requires a Bun API.
- The container runs Nginx on port 3000 and direct requests to `/`, `/review`, `/weekly-review`, and `/settings` return the SPA successfully.
- Every JavaScript and CSS URL referenced by the built HTML returns HTTP 200 with a matching JavaScript or CSS MIME type; missing asset paths do not return `index.html`.
- In a browser, the token/settings screen retains browser-local settings across reload. When credentials already exist locally, at least one Todoist-backed read path succeeds without exposing or copying the token.
- Existing daily and weekly review behavior, TanStack Query coordination, browser storage keys, and Todoist SDK integration remain intact.
- The `origin/master` pointer-cursor change is retained, `git diff --check` passes, and implementation includes no README, ADR, `CONTEXT.md`, CI smoke test, deployment, or unrelated change.

## Verification Contract

- Install: `bun install --frozen-lockfile` after the implementation regenerates `bun.lock`.
- Typecheck: `bunx tsc --noEmit` (there is no package script, so no new broad tooling is required).
- Build: `bun run build`, then inspect `dist/index.html` and its referenced asset files.
- Container: `docker build -t todoist-daily-review:spa .` and run it locally with port mapping `3000:3000`.
- HTTP smoke: request `/`, `/review`, `/weekly-review`, and `/settings`; parse built HTML asset URLs; verify each JavaScript/CSS response status and `Content-Type`; verify a nonexistent asset returns a non-HTML failure.
- Browser seam: exercise token/settings persistence and, only if credentials are already available in that browser profile, one Todoist-backed read. Never print, copy, or persist credentials outside the existing browser storage.
- Repository hygiene: `git diff --check` and a diff against the current `origin/master` to confirm the pointer-cursor fix and exclude unrelated files.
- Automated tests/lint: none exist. No new CI smoke test is authorized. No pull-request checks currently run; the existing GHCR workflow runs only after merge to `master`.

## Discovery Cues

- `src/router.tsx`, `src/routes/__root.tsx`, the four files under `src/routes/`, and ignored `src/routeTree.gen.ts` define the current routing and document shell.
- `src/lib/storage.ts`, `src/lib/todoist.ts`, `src/lib/query-keys.ts`, and `src/lib/mutations.ts` establish the browser data and Todoist boundaries.
- `vite.config.ts`, `package.json`, `bun.lock`, `.gitignore`, `Dockerfile`, and `.dockerignore` establish the build and runtime boundary.
- `src/styles/app.css` contains the concurrent pointer-cursor fix on `origin/master` that must survive integration.

## Risks / Trade-offs

- **History fallback can mask missing assets with HTML** → Give static asset paths a file-only rule and verify status plus MIME type.
- **Manual routing can lose route types or navigation behavior** → Declare all four routes in one typed tree and typecheck every retained `Link` and navigation call.
- **Browser SDK bundling can expose a Node-only dependency path** → Keep the official SDK, confirm the production bundle succeeds, and exercise a real browser read when local credentials are available.
- **Changing the container runtime can break proxy connectivity** → Keep port 3000 and verify the built image through that port before merge.
- **The workspace starts behind `origin/master`** → Integrate the current `origin/master` before implementation and explicitly check the cursor-style rule remains.
- **No automated regression suite exists** → Use the defined build, HTTP, asset, settings, and conditional Todoist seams; record any credential-dependent limitation.
- **README runtime wording becomes stale** → Accept temporarily because documentation changes were explicitly excluded.

## Migration Plan

1. Begin implementation from the current `origin/master`, preserving the pointer-cursor change and workflow artifacts.
2. Replace the server-oriented build, generated routing, and runtime as one atomic vertical change so no integration commit has a mismatched artifact and container.
3. Run the full Verification Contract locally before opening the implementation pull request.
4. Merge through the normal repository workflow; the existing post-merge GitHub workflow builds and publishes the image.
5. Roll back by redeploying the prior known-good image or reverting the implementation pull request if the static runtime fails after release. Deployment itself requires separate explicit authority.

## Stop Conditions

- Stop for Spec Drift if implementation reveals a backend, SSR, server-side credential, new route, route-lazy-loading, retained full-stack runtime, or downstream port change is required.
- Stop and report a verification limitation if local credentials are unavailable; do not solicit, extract, print, or copy a Todoist token.
- Stop before deployment or unrelated documentation/CI work unless separately authorized.

## Open Questions

None.
