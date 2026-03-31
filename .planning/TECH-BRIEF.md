# Tech Brief: Todoist Daily Review

## Product Brief Reference
See [PRODUCT-BRIEF.md](./PRODUCT-BRIEF.md). Key drivers: speed/fluidity over Telegram bot, responsive web app, Todoist as source of truth, solo dev, open source.

## Constraints
- Team: solo dev (Rodrigo)
- Skills: TypeScript, React, Bun
- Timeline: side project, no hard deadline
- Budget: minimal (Vercel free/hobby tier, homelab)
- Environment: Vercel (public) + self-hosted (personal)

## Architecture
SPA-first web app with minimal server functions (OAuth flow only). All task data lives in Todoist - the app is a review layer, not a task manager.

```
Browser (React SPA)
  |-- Todoist API (direct, via access token)
  |-- Server Functions (OAuth flow only)
        |-- Vercel KV (public) or SQLite (self-host) for refresh tokens
```

User preferences (filters, review config) stored in localStorage.

### Data Strategy
- **Prefetch on review start**: load all projects, inbox tasks, and filtered tasks upfront
- **Optimistic UI**: update UI immediately on user action, API call in background
- **TanStack Query**: handles caching, background sync, and error rollback

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Language | TypeScript | Already known, full-stack |
| Runtime | Bun (dev), Node (deploy) | Fast dev experience, standard deploy |
| Framework | TanStack Start | Lightweight, no SSR tax, Nitro for flexible deploy |
| UI | React + shadcn/ui | Known + ready-made components, fast to build |
| Data fetching | TanStack Query | Natural pairing, caching, optimistic updates |
| Routing | TanStack Router | Comes with Start, type-safe |
| Auth (public) | Todoist OAuth | Required for public distribution |
| Auth (self-host) | API token | Simple, no server needed |
| Token storage | Vercel KV (public) / SQLite (self-host) | Minimal persistence for refresh tokens |
| User preferences | localStorage | No backend needed for config |
| Deploy (public) | Vercel | Auto-detect Nitro, one-click |
| Deploy (self-host) | Node (Nitro default) | Standard, no special preset |

## Key Trade-offs
- TanStack Start (alpha) over Next.js: lighter, no SSR baggage, but risk of breaking changes and incomplete docs
- localStorage over DB for preferences: simpler, but no cross-device sync
- Direct Todoist API calls from client: faster UX, but exposes token in browser (mitigated by short-lived access tokens + refresh flow)

## Deferred Decisions
- Native app (React Native / Capacitor) - revisit after web v1 is stable
- AI features (project suggestions) - revisit when review flow is fast enough that AI adds value instead of friction
- Cross-device preference sync - only if multiple users actually want it
- CI/CD - not needed yet for a solo side project

## Risks
- TanStack Start alpha: bugs, breaking changes, sparse docs. Mitigation: solo project, can tolerate rough edges.
- Todoist OAuth app approval: may need Todoist review for public distribution. Mitigation: start with API token for personal use.
- Todoist API rate limits: many rapid actions during review. Mitigation: batch where possible, optimistic UI updates.

## Open Questions
- Exact Todoist OAuth app registration process and approval timeline
- Weekly review GTD script - detailed steps to implement
