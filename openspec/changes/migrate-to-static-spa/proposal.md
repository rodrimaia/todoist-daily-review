## Why

Todoist Daily Review is a browser-only application, but production currently carries a temporary TanStack Start, Nitro, and Bun server runtime solely to deliver its assets. Replacing that accidental full-stack layer with a static SPA restores an architecture that matches the product while preserving the now-healthy production experience, including direct route loads.

## What Changes

- Build and bootstrap the React application as a client-only Vite SPA with no SSR or application server.
- Keep the existing `/`, `/review`, `/weekly-review`, and `/settings` URLs using an eagerly loaded, manually declared TanStack Router tree.
- Preserve browser-local token and preference storage, browser-side Todoist SDK calls, and TanStack Query coordination.
- Produce static files in `dist/` and serve them from Nginx with history fallback for supported deep links and correct static-asset delivery.
- Remove the TanStack Start, Nitro, Vinxi, generated file-route tree, and any Bun-only typing dependency that no longer has a live use.

## Capabilities

### New Capabilities

- `spa-navigation`: Product behavior for loading and navigating among the application's supported real URLs in a client-only browser session.
- `static-spa-delivery`: Engineering constraints for the Vite artifact, client architecture, dependency boundary, and Nginx production runtime.

### Modified Capabilities

None. The repository has no existing OpenSpec capabilities.

## Impact

- Browser entry, root layout, route declarations, router construction, and generated-route ignore rules.
- Vite configuration, package scripts and dependencies, and `bun.lock`.
- Docker build/runtime stages plus a minimal Nginx configuration.
- Existing Traefik and Cloudflare remain downstream of the container and require no contract change.

## Out of Scope

- Product workflow redesign, route additions, server-side OAuth, server functions, API routes, loaders, server storage, databases, or SSR.
- Replacing React, Vite, TanStack Router, TanStack Query, the official Todoist SDK, or the current UI stack.
- Route-level lazy loading, an automated Docker smoke test, new broad test tooling, deployment, README changes, `CONTEXT.md`, or an ADR.
