# Todoist Daily Review

A friendly, browser-based GTD review for your Todoist account. It guides you
through a **Daily Review** (clear your Inbox, then work through your next
actions) and a **Weekly Review** (projects, someday/maybe, and the week ahead)
— one task at a time, right in your browser.

Everything you do is applied **directly to your Todoist account, live**: moving,
scheduling, completing, and deleting. There is no staging area, and no backend
ever holds a copy of your tasks.

## Try the Hosted instance

The easiest way to start is the Hosted instance at
**[review.rodrigomaia.me](https://review.rodrigomaia.me/)**. It runs the exact
same code as this repository.

A few honest notes about how the Hosted instance works:

- **Your token stays in your browser.** It is used only to call the Todoist API
  directly from your browser tab. By default the token lives in a *temporary*
  session for that tab; you can instead choose to *remember* it on the device,
  and you can revoke it any time in Todoist.
- **The Hosted instance is operated independently** by the maintainer. Like any
  web host, it can record normal technical access data (for example, request
  logs) — it can't promise that nothing is recorded. Treat your token as
  sensitive, exactly as you would anywhere else.
- **Optional, anonymous pageview measurement.** The Hosted app can count visits
  to its four pages with [Umami](https://umami.is/) — only after you explicitly
  allow it, and never with Todoist data, filter values, query parameters, or
  identifiers. You can change the choice any time in Settings. Self-hosted
  copies never load or contact the telemetry script.

## What you get

### Daily Review

Two phases: **Inbox** (process every task in your Inbox) and **Filter** (review
the tasks your review filter selects). For each task you can move it to a
project, keep/change/remove its date, complete it, delete it, or defer it to
your someday/maybe project. Ends with a summary of everything you did.

### Weekly Review

Five phases: **Inbox** (clear any remaining Inbox), **Projects** (check every
active project for next actions; add or delete projects), **Someday** (review
your someday/maybe list), **Upcoming** (reschedule, complete, or un-date the
next week of scheduled tasks while preserving recurring schedules), and
**Summary**. Optionally complete a recurring "review tracking" task when you
finish.

### The review filter

The filter decides which tasks Daily Review walks you through after the Inbox.
It defaults to:

```
@next_action & (no date | overdue | today)
```

That means: tasks carrying the `@next_action` label that are undated, overdue,
or due today. If your workflow uses different labels or priorities, just change
the filter in **Settings** — for example `@today`, `priority 1`, or any Todoist
filter you like. The active filter is shown on the dashboard, and the default
is one click away in Settings.

### Other niceties

- **Keyboard shortcuts** — during date selection, `k` keeps the current date,
  `0` removes it, and `1`–`4` choose quick dates; `c` completes, `d` deletes,
  and `s` skips recurring tasks
- **Progress tracking** — see how far along you are in each review phase
- **Summary stats** — a breakdown of all actions taken at the end of each review
- **Honest failure handling** — write failures stay visible for verification in
  Todoist; read failures offer a retry

## Settings

- **Token session** — switch between a temporary browser-tab session and
  remembering the token on the device (replacing or clearing the token also
  discards cached account data)
- **Review filter** — the Todoist filter that selects tasks for the Daily
  Review Filter phase (default shown above, resettable)
- **Someday/Maybe project** — where deferred tasks go
- **Exclude projects** — comma-separated prefixes to skip during the Weekly
  Review (for example `Archive, Reference`)
- **Review tracking task** — optional recurring task completed automatically
  when you finish a Weekly Review
- **Appearance** — system, light, or dark

## Self-hosting

The whole app is a static frontend. It runs entirely in the browser and talks
to the Todoist API directly, so any static host works.

### Run locally (development)

```bash
bun install
bun run dev
```

Open http://localhost:3000, find your
[Todoist API token](https://todoist.com/help/articles/find-your-api-token-Jpzx9IIlB),
paste it, and go.

### Build from source

```bash
bun install
bun run build
```

The static site is written to `dist/` — serve it with any static file server
(`python3 -m http.server`, nginx, GitHub Pages, ...).

### Docker

Build and run from source:

```bash
docker build -t todoist-daily-review .
docker run -p 3000:3000 todoist-daily-review
```

Or pull the public image from GHCR:

```bash
docker pull ghcr.io/rodrimaia/todoist-daily-review:latest
docker run -p 3000:3000 ghcr.io/rodrimaia/todoist-daily-review:latest
```

`latest` is updated only by a versioned release after its validation gate passes.

### Docker Compose

The repository includes [`compose.yaml`](compose.yaml). Clone it and run:

```bash
docker compose up -d
```

Or save this equivalent configuration as `compose.yaml`:

```yaml
services:
  todoist-daily-review:
    image: ghcr.io/rodrimaia/todoist-daily-review:latest
    ports:
      - "3000:3000"
    restart: unless-stopped
```

Then open http://localhost:3000. Stop it with `docker compose down`.

## Validation

The release gate uses Bun 1.3.9, Playwright Chromium, Docker with Compose v2,
and Gitleaks 8.30.1. Install the locked dependencies and browser once, then
run every code, type, build, and browser check:

```bash
bun install --frozen-lockfile
bunx playwright install --with-deps chromium
bun run validate
```

Scan the tracked release tree and every commit in the complete Git history:

```bash
gitleaks dir . --redact --no-banner
gitleaks git . --redact --log-opts=--all
```

Finally, build the production image and smoke-test both `docker run` and the
committed Compose service. This checks every SPA route, referenced JS/CSS
asset, missing-asset behavior, security headers, token persistence, Hosted
consent transitions, and that a Self-hosted browser makes no request to the
maintainer's Umami instance:

```bash
bun run test:container
```

Maintainers must also complete the external-state and real-account checks in
[`docs/releasing.md`](docs/releasing.md) before publishing a release.

## Contributing

Bug reports, feature ideas, and pull requests are very welcome! This is a
personal project, so support is **best-effort** — issues and PRs are reviewed
when the maintainer has time, and there's no SLA.

Before opening an issue or PR, please:

- **Never post your Todoist API token, task content, project names, or any
  other personal data** in issues, pull requests, comments, or screenshots.
- Say what you did, what you expected, and what happened instead. Screenshots
  and the exact filter/settings you used help a lot.

## Tech stack

- React + TanStack Router + TanStack Query
- Tailwind CSS + shadcn/ui
- Todoist API via `@doist/todoist-sdk`
- Bun runtime

## License

MIT — see [LICENSE](LICENSE). Copyright (c) Rodrigo Maia.
