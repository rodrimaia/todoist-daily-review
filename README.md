# Todoist Daily Review

A browser-based GTD daily and weekly review app built on top of Todoist.

**Everything runs in your browser.** There is no backend, no server-side storage, no database. Your Todoist API token is stored only in your browser's localStorage and is never sent anywhere except directly to the Todoist API.

Try it at **[review.rodrigomaia.me](https://review.rodrigomaia.me/)** -- nothing is stored on the server. The hosted version runs the exact same code in this repo.

## Features

- **Daily Review** -- process your inbox and review next actions, one task at a time
- **Weekly Review** -- review all active projects, someday/maybe list, and upcoming tasks
- **Inbox processing** -- move to a project (optionally with a date), complete, delete, or defer to someday
- **Project review** -- check each project for next actions, add or delete projects
- **Upcoming review** -- reschedule or remove dates from non-recurring tasks; complete recurring tasks to advance them
- **Keyboard shortcuts** -- `1`-`4` quick dates, `c` complete, `d` delete, `s` skip recurring Daily Review tasks, `m` move
- **Progress tracking** -- see how far along you are in each review phase
- **Summary stats** -- breakdown of all actions taken at the end of each review

### How it works

**Daily Review** flows through two phases: **Inbox** (process every inbox task) then **Filter** (review next actions by your chosen Todoist filter). Ends with a summary of everything you did.

**Weekly Review** flows through five phases: **Inbox** (clear remaining inbox), **Projects** (review each active project for next actions), **Someday** (review your someday/maybe list), **Upcoming** (review all scheduled tasks grouped by day), and **Summary**.

During a review, every change you make -- moving tasks, scheduling, completing, deleting -- is applied directly to your Todoist account in real time via the API. Successful changes refresh the in-memory Todoist cache without delaying review advancement. Read failures remain visible with a retry option, and replacing or clearing the API token clears cached account data.

## Setup

```bash
bun install
bun run dev
```

Open http://localhost:3000 and enter your [Todoist API token](https://todoist.com/help/articles/find-your-api-token-Jpzx9IIlB).

Run the local checks with:

```bash
bun test
bun run typecheck
bun run build
```

### Settings

- **Filter query** -- Todoist filter for which tasks to review (default: `@next_action & (no date | overdue | today)`)
- **Someday/Maybe project** -- project where deferred tasks go
- **Exclude projects** -- comma-separated prefixes to skip during weekly review (e.g. `AREA, LISTA`)

## Docker

```bash
docker build -t todoist-daily-review .
docker run -p 3000:3000 todoist-daily-review
```

Or pull from GHCR:

```bash
docker pull ghcr.io/rodrimaia/todoist-daily-review:latest
docker run -p 3000:3000 ghcr.io/rodrimaia/todoist-daily-review:latest
```

## Tech Stack

- React + TanStack Router + TanStack Query
- Tailwind CSS + shadcn/ui
- Todoist API via `@doist/todoist-sdk`
- Bun runtime

## License

MIT
