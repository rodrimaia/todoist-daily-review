# static-spa-delivery Specification

## Purpose
TBD - created by archiving change migrate-to-static-spa. Update Purpose after archive.
## Requirements
### Requirement: Client-only Vite artifact
The production build SHALL use Vite to emit a client-only static artifact in `dist/`, SHALL mount React in the browser, and SHALL NOT require SSR, an application server bundle, or server-side routing to run.

#### Scenario: Production build output
- **WHEN** dependencies are installed from the committed lockfile and the production build runs
- **THEN** `dist/` contains an HTML entry and its browser assets without a required server executable or server-rendered output

#### Scenario: Browser application bootstrap
- **WHEN** the HTML entry loads in a supported browser
- **THEN** React mounts the application with the root TanStack Query provider and client router available

### Requirement: Explicit eager route tree
The client router SHALL use one manually declared TanStack Router tree containing `/`, `/review`, `/weekly-review`, and `/settings`, and SHALL load those route components eagerly without file-route generation.

#### Scenario: Route construction
- **WHEN** the application route tree is built
- **THEN** all four supported routes are explicit children of the client root route and no generated route-tree artifact is required

#### Scenario: Route loading strategy
- **WHEN** the browser bundle initializes
- **THEN** the supported route components are available through eager imports without manual route-level lazy loading

### Requirement: Static Nginx runtime
The production container SHALL serve the contents of `dist/` using `nginx:alpine` on container port 3000, SHALL fall back to `index.html` for supported client routes, and SHALL serve static asset files with their correct MIME types without applying the HTML fallback to a missing asset.

#### Scenario: Supported deep link
- **WHEN** Nginx receives a direct request for `/`, `/review`, `/weekly-review`, or `/settings`
- **THEN** it returns the SPA HTML successfully so the client router can render the requested page

#### Scenario: Referenced browser asset
- **WHEN** Nginx receives a request for a JavaScript or CSS file referenced by the built HTML
- **THEN** it returns the exact file with HTTP 200 and a matching JavaScript or CSS content type

#### Scenario: Missing browser asset
- **WHEN** Nginx receives a request for a nonexistent static asset path
- **THEN** it returns a non-HTML failure instead of `index.html`

#### Scenario: Existing container port contract
- **WHEN** the production image is run with host port 3000 mapped to container port 3000
- **THEN** the application is reachable through that mapping without a Bun or Node application process

### Requirement: Client dependency boundary
The application SHALL retain React, Vite, TanStack Router, TanStack Query, the official Todoist SDK, Tailwind, and the current UI dependency stack, and SHALL remove direct dependencies on TanStack Start, Nitro, Vinxi, and Bun types when no application Bun API remains.

#### Scenario: Installed production graph
- **WHEN** the updated package manifest and lockfile are inspected after a frozen install
- **THEN** the retained client dependencies are available and TanStack Start, Nitro, Vinxi, and Bun types are not direct dependencies

#### Scenario: No Bun runtime requirement
- **WHEN** the built production container is inspected or started
- **THEN** serving the application requires Nginx only and does not require Bun or Node

### Requirement: Migration verification
The migration SHALL pass the repository's defined local typecheck, production build, container, route, asset-status, asset-MIME, settings-persistence, and repository-hygiene checks before implementation merge, with a Todoist-backed browser read also required when credentials are already available locally.

#### Scenario: Local verification without credentials
- **WHEN** no Todoist credential is available in the existing browser context
- **THEN** every non-credential verification runs and the unavailable live Todoist read is recorded as a limitation without exposing or soliciting a token

#### Scenario: Local verification with credentials
- **WHEN** a Todoist credential is already available in the existing browser context
- **THEN** the settings/token seam and at least one Todoist-backed read path are exercised without printing, copying, or relocating the token

#### Scenario: Repository integrity
- **WHEN** the implementation diff is checked against the current `origin/master`
- **THEN** the pointer-cursor fix remains present, whitespace validation passes, and no documentation, ADR, `CONTEXT.md`, CI smoke test, deployment, or unrelated change is included
